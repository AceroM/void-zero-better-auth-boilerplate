#!/usr/bin/env bun
/**
 * Sync this source tree into the Porio App.files store.
 *
 * This mirrors the repo -> Porio loop used by Migz, but intentionally does not
 * publish WfP: Porio's current app publisher is TanStack Start-specific, while
 * this repo is a native Void app. Use `bun run deploy` for Void Cloud deploys.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const APP_ID = process.env.PORIO_APP_ID ?? "b5c8a861-e5e9-4629-ad1b-4f73abfe1ec1";
const PORIO_ORG_ID = "00100100-1111-4abc-8a01-c0ffee000100";
const BASE_URL = (process.env.PORIO_BASE_URL ?? "https://app.porio.ai").replace(/\/$/, "");
const IMPERSONATE = process.env.PORIO_SYNC_EMAIL ?? "miguel@porio.ai";

const EXCLUDE_DIRS = new Set([
  ".git",
  ".github",
  ".void",
  ".wrangler",
  "dist",
  "node_modules",
  "porio-agents",
]);

const EXCLUDE_FILES = new Set([
  ".DS_Store",
  ".env",
  ".env.local",
  ".env.production.local",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "README.md",
]);

const DELETE_SCOPES = ["db/", "pages/", "public/", "routes/", "scripts/", "src/"];

function die(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function loadDotenv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    out[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
  }
  return out;
}

let fallbackEnv: Record<string, string> | null = null;
function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  fallbackEnv ??= {
    ...loadDotenv(resolve(ROOT, "../app/.env")),
    ...loadDotenv(resolve(ROOT, "../../app/.env")),
  };
  const value = fallbackEnv[name];
  if (!value) die(`${name} is not set`);
  return value;
}

async function rpc<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
  if (APP_ID === "REPLACE_WITH_PORIO_APP_ID") {
    die("set PORIO_APP_ID or replace APP_ID in scripts/porio-sync.ts");
  }
  const res = await fetch(`${BASE_URL}/api/${procedure}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-porio-impersonate": IMPERSONATE,
      "x-porio-impersonate-secret": env("PORIO_IMPERSONATION_SECRET"),
    },
    body: JSON.stringify({ json: { orgId: PORIO_ORG_ID, ...input } }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${procedure} -> HTTP ${res.status}: ${text.slice(0, 600)}`);
  }
  return JSON.parse(text).json as T;
}

function isExcluded(path: string): boolean {
  const parts = path.split("/");
  return EXCLUDE_DIRS.has(parts[0]!) || EXCLUDE_FILES.has(path) || EXCLUDE_FILES.has(parts.at(-1)!);
}

function listLocalFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = relative(ROOT, abs).split("\\").join("/");
      if (entry.isDirectory()) {
        if (!isExcluded(rel)) walk(abs);
        continue;
      }
      if (isExcluded(rel)) continue;
      if (statSync(abs).size > 500_000) {
        console.warn(`skipping ${rel}: file is over Porio's 500KB limit`);
        continue;
      }
      const bytes = readFileSync(abs);
      if (bytes.includes(0)) {
        console.warn(`skipping ${rel}: binary file`);
        continue;
      }
      files[rel] = bytes.toString("utf8");
    }
  };
  walk(ROOT);
  return files;
}

async function remoteFiles(): Promise<Record<string, string>> {
  const out = await rpc<{ app: { files: string | Record<string, string> } }>("app/get", {
    id: APP_ID,
  });
  return typeof out.app.files === "string" ? JSON.parse(out.app.files) : out.app.files;
}

async function info() {
  const out = await rpc<{ app: { id: string; name: string; runtime: string; updatedAt: string } }>(
    "app/get",
    { id: APP_ID },
  );
  const files = await remoteFiles();
  console.log(`app: ${out.app.name}`);
  console.log(`id: ${out.app.id}`);
  console.log(`runtime: ${out.app.runtime}`);
  console.log(`remote files: ${Object.keys(files).length}`);
  console.log(`updated: ${out.app.updatedAt}`);
}

async function pull() {
  const remote = await remoteFiles();
  let written = 0;
  for (const [path, source] of Object.entries(remote)) {
    if (isExcluded(path)) continue;
    const abs = join(ROOT, path);
    if (existsSync(abs) && readFileSync(abs, "utf8") === source) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, source);
    console.log(`pulled ${path}`);
    written++;
  }

  let deleted = 0;
  for (const path of Object.keys(listLocalFiles())) {
    if (!DELETE_SCOPES.some((scope) => path.startsWith(scope))) continue;
    if (path in remote) continue;
    rmSync(join(ROOT, path));
    console.log(`deleted ${path}`);
    deleted++;
  }

  console.log(`pull complete: ${written} written, ${deleted} deleted`);
}

async function push() {
  const files = listLocalFiles();
  const totalBytes = Object.values(files).reduce(
    (sum, source) => sum + Buffer.byteLength(source, "utf8"),
    0,
  );
  if (totalBytes > 1_000_000) {
    die(`source is ${totalBytes} bytes, over Porio's 1MB app file limit`);
  }

  await rpc("app/updateFiles", { id: APP_ID, files });
  console.log(`pushed ${Object.keys(files).length} file(s) to ${APP_ID}`);
}

const command = process.argv[2] ?? "info";
if (command === "info") await info();
else if (command === "pull") await pull();
else if (command === "push") await push();
else die(`unknown command "${command}"`);

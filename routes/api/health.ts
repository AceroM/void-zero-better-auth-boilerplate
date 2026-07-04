import { defineHandler } from "void";

export const GET = defineHandler(() => ({
  ok: true,
  name: "void-zero-better-auth-boilerplate",
  time: new Date().toISOString(),
}));

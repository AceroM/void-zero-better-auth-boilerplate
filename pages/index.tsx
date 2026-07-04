import { useEffect, useMemo, useState } from "react";
import { auth } from "void/client";
import type { Props } from "./index.server";

type Mode = "sign-in" | "sign-up";

type AuthResult = {
  error?: {
    message?: string;
  } | null;
};

type ProfileResult = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  serverTime: string;
};

export default function IndexPage({ user }: Props) {
  const [profile, setProfile] = useState<ProfileResult | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => setProfile(data as ProfileResult | null));
  }, [user]);

  if (!user) return <SignedOutPanel />;

  return (
    <section className="dashboard">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Void app mode</p>
          <h1>{user.name || user.email}</h1>
          <p>
            Email/password auth is active through Void's Better Auth integration, backed by
            Void-managed D1 in development and deployment.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <div className="grid">
        <InfoCard label="Session user" value={user.email} detail={`id ${user.id}`} />
        <InfoCard
          label="Email verified"
          value={user.emailVerified ? "Yes" : "No"}
          detail="Better Auth user record"
        />
        <InfoCard
          label="Protected API"
          value={profile ? "Reachable" : "Loading"}
          detail={profile ? `server ${new Date(profile.serverTime).toLocaleTimeString()}` : ""}
        />
      </div>
    </section>
  );
}

function SignedOutPanel() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const title = mode === "sign-in" ? "Sign in" : "Create account";

  return (
    <section className="auth-screen">
      <div className="intro">
        <p className="eyebrow">Better Auth included</p>
        <h1>Void Zero starter for authenticated apps.</h1>
        <p>
          A focused baseline for dashboards, tools, and SaaS products that need a
          Cloudflare-native full-stack app with auth already wired.
        </p>
      </div>
      <AuthForm
        key={mode}
        mode={mode}
        title={title}
        onToggle={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      />
    </section>
  );
}

function AuthForm({
  mode,
  title,
  onToggle,
}: {
  mode: Mode;
  title: string;
  onToggle: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alternate = useMemo(
    () => (mode === "sign-in" ? "Create an account" : "Sign in instead"),
    [mode],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = (mode === "sign-up"
        ? await auth.signUp.email({
            name,
            email,
            password,
          })
        : await auth.signIn.email({
            email,
            password,
          })) as AuthResult;

      if (result?.error) {
        throw new Error(result.error.message || "Authentication failed");
      }

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <div>
        <p className="form-kicker">Email/password</p>
        <h2>{title}</h2>
      </div>
      {mode === "sign-up" ? (
        <label>
          <span>Name</span>
          <input
            autoComplete="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
      ) : null}
      <label>
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </label>
      <label>
        <span>Password</span>
        <input
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Working..." : title}
      </button>
      <button className="button ghost" type="button" onClick={onToggle}>
        {alternate}
      </button>
    </form>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

async function signOut() {
  await auth.signOut();
  window.location.href = "/";
}

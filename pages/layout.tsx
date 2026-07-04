import type { ReactNode } from "react";
import { Link } from "@void/react";
import "../src/styles.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Home">
          <img src="/mark.svg" alt="" className="brand-mark" />
          <span>Void Auth</span>
        </Link>
        <nav className="nav">
          <Link href="/">Dashboard</Link>
          <a href="https://void.cloud/guide/auth" rel="noreferrer" target="_blank">
            Void Auth
          </a>
        </nav>
        <div className="session-chip">Void app mode</div>
      </header>
      <main>{children}</main>
    </div>
  );
}

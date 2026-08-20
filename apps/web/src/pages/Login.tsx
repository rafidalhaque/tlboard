import { useEffect, useState } from "react";

// Auth.js only accepts POST on /signin/:provider (CSRF-protected) — a plain <a href> GET
// throws "UnknownAction" server-side, which Auth.js then masks as a generic ?error=Configuration
// redirect. Real sign-in requires a form POST carrying the csrf token fetched from /api/auth/csrf.
function ProviderForm({ provider, label }: { provider: string; label: string }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken));
  }, []);

  return (
    <form method="POST" action={`/api/auth/signin/${provider}`}>
      <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
      <button className="btn" type="submit" disabled={!csrfToken} style={{ width: "100%" }}>
        {label}
      </button>
    </form>
  );
}

export default function Login() {
  return (
    <div className="center-screen">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>tlboard</h1>
        <p className="muted">Collaborative whiteboards. Sign in to continue.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <ProviderForm provider="google" label="Continue with Google" />
          <ProviderForm provider="github" label="Continue with GitHub" />
        </div>
      </div>
    </div>
  );
}

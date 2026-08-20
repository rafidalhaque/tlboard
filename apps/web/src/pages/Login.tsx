import { useEffect, useState } from "react";
import { GoogleIcon, GithubIcon } from "../components/icons.js";

const ERROR_COPY: Record<string, string> = {
  AccessDenied: "Access was denied by the provider. You can try again.",
  OAuthAccountNotLinked: "That email is already tied to a different sign-in method.",
  Verification: "That sign-in link is no longer valid.",
  Configuration: "Sign-in is misconfigured on the server. Try again shortly, or contact an admin.",
  Default: "Something went wrong signing in. Please try again.",
};

function useOAuthError(): string | null {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("error");
    if (code) {
      setError(ERROR_COPY[code] ?? ERROR_COPY.Default);
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  return error;
}

// Auth.js only accepts POST on /signin/:provider (CSRF-protected) — a plain <a href> GET
// throws "UnknownAction" server-side. Real sign-in requires a form POST carrying the csrf
// token fetched from /api/auth/csrf. Fetched once at the Login level and passed down —
// each GET mints a fresh token and overwrites the csrf cookie, so two buttons fetching
// independently raced each other: whichever response landed second silently invalidated
// the token the other button was already holding, and clicking it threw MissingCSRF.
function useCsrfToken(): string | null {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken));
  }, []);
  return csrfToken;
}

function ProviderForm({
  provider,
  label,
  icon,
  csrfToken,
}: {
  provider: string;
  label: string;
  icon: React.ReactNode;
  csrfToken: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form method="POST" action={`/api/auth/signin/${provider}`} onSubmit={() => setSubmitting(true)}>
      <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
      <button className="btn" type="submit" disabled={!csrfToken || submitting} style={{ width: "100%", height: 46 }}>
        {submitting ? <span className="spinner" style={{ borderTopColor: "var(--text)" }} /> : icon}
        {submitting ? "Redirecting…" : label}
      </button>
    </form>
  );
}

export default function Login() {
  const error = useOAuthError();
  const csrfToken = useCsrfToken();

  return (
    <div className="center-screen">
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            t
          </div>
          <h1 className="text-title">tlboard</h1>
          <p className="muted">Real-time collaborative whiteboards for your team.</p>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ProviderForm provider="google" label="Continue with Google" icon={<GoogleIcon />} csrfToken={csrfToken} />
          <ProviderForm provider="github" label="Continue with GitHub" icon={<GithubIcon />} csrfToken={csrfToken} />
        </div>

        <p className="muted" style={{ marginTop: 20, fontSize: 12 }}>
          New accounts require admin approval before a board becomes visible.
        </p>
      </div>
    </div>
  );
}

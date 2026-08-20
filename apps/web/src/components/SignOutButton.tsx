import { useEffect, useState } from "react";

// same CSRF-POST requirement as sign-in — see pages/Login.tsx
export default function SignOutButton({ className = "btn" }: { className?: string }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken));
  }, []);

  return (
    <form method="POST" action="/api/auth/signout" style={{ display: "inline" }}>
      <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
      <button className={className} type="submit" disabled={!csrfToken}>
        Sign out
      </button>
    </form>
  );
}

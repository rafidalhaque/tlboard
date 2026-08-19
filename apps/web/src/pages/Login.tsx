export default function Login() {
  return (
    <div className="center-screen">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>tlboard</h1>
        <p className="muted">Collaborative whiteboards. Sign in to continue.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <a className="btn" href="/api/auth/signin/google">Continue with Google</a>
          <a className="btn" href="/api/auth/signin/github">Continue with GitHub</a>
        </div>
      </div>
    </div>
  );
}

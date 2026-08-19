export default function Rejected({ status }: { status: "rejected" | "banned" }) {
  return (
    <div className="center-screen">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{status === "banned" ? "Access revoked" : "Access not approved"}</h2>
        <p className="muted">
          {status === "banned"
            ? "Your account has been banned. Contact an admin if you believe this is a mistake."
            : "Your access request was not approved. Contact an admin if you believe this is a mistake."}
        </p>
        <a className="btn" href="/api/auth/signout">Sign out</a>
      </div>
    </div>
  );
}

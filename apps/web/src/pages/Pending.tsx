import type { Me } from "../lib/api.js";
import SignOutButton from "../components/SignOutButton.js";

export default function Pending({ me }: { me: Me }) {
  return (
    <div className="center-screen">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Awaiting approval</h2>
        <p className="muted">
          Your account is signed in but a super admin needs to approve access before you can view or edit any board.
        </p>
        <p style={{ marginTop: 20 }}>
          <strong>{me.name || me.email}</strong>
          <br />
          <span className="muted">{me.email}</span>
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}

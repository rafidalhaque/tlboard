import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Me } from "../lib/api.js";

type Tab = "pending" | "all" | "settings";

export default function Admin({ me }: { me: Me }) {
  const [tab, setTab] = useState<Tab>("pending");
  const navigate = useNavigate();

  return (
    <div>
      <div className="topbar">
        <button className="btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        <strong>Admin</strong>
        <span className="muted">{me.name || me.email}</span>
      </div>
      <div className="tabs">
        {(["pending", "all", "settings"] as Tab[]).map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "pending" ? "Pending Users" : t === "all" ? "All Users" : "Settings"}
          </div>
        ))}
      </div>
      {tab === "pending" && <PendingTab />}
      {tab === "all" && <AllUsersTab me={me} />}
      {tab === "settings" && me.role === "super_admin" && <SettingsTab />}
      {tab === "settings" && me.role !== "super_admin" && <p className="muted" style={{ padding: 24 }}>Super admin only.</p>}
    </div>
  );
}

function PendingTab() {
  const [users, setUsers] = useState<Me[]>([]);
  const reload = () => api.pendingUsers().then(setUsers);
  useEffect(() => { reload(); }, []);

  return (
    <div style={{ padding: 24 }}>
      {users.length === 0 ? (
        <p className="muted">No pending users.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Provider</th><th>Signed up</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>{u.name || "—"}</td>
                <td>{u.email}</td>
                <td>{u.provider}</td>
                <td>{new Date(u.createdAt).toLocaleString()}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary" onClick={async () => { await api.approve(u.id); reload(); }}>Approve</button>
                  <button className="btn btn-danger" onClick={async () => { await api.reject(u.id); reload(); }}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AllUsersTab({ me }: { me: Me }) {
  const [users, setUsers] = useState<Me[]>([]);
  const [filter, setFilter] = useState("");
  const reload = () => api.allUsers().then(setUsers);
  useEffect(() => { reload(); }, []);

  const shown = users.filter((u) => !filter || u.status === filter || u.role === filter);

  return (
    <div style={{ padding: 24 }}>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 12 }}>
        <option value="">All</option>
        <option value="pending">Status: pending</option>
        <option value="approved">Status: approved</option>
        <option value="rejected">Status: rejected</option>
        <option value="banned">Status: banned</option>
        <option value="admin">Role: admin</option>
        <option value="super_admin">Role: super_admin</option>
      </select>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Status</th><th>Role</th><th></th></tr>
        </thead>
        <tbody>
          {shown.map((u) => (
            <tr key={u.id}>
              <td>{u.name || "—"}</td>
              <td>{u.email}</td>
              <td>{u.status}</td>
              <td>
                {me.role === "super_admin" ? (
                  <select
                    defaultValue={u.role}
                    onChange={async (e) => { await api.setRole(u.id, e.target.value); reload(); }}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                ) : (
                  u.role
                )}
              </td>
              <td style={{ display: "flex", gap: 6 }}>
                {u.status === "banned" ? (
                  <button className="btn" onClick={async () => { await api.unban(u.id); reload(); }}>Unban</button>
                ) : (
                  <button className="btn btn-danger" onClick={async () => { await api.ban(u.id); reload(); }}>Ban</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  const [mode, setMode] = useState<"open" | "approval_required">("approval_required");
  useEffect(() => { api.settings().then((s) => setMode(s.signupMode)); }, []);

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h3>Signup Mode</h3>
      <label style={{ display: "block", marginBottom: 8 }}>
        <input
          type="radio"
          checked={mode === "approval_required"}
          onChange={async () => { setMode("approval_required"); await api.setSignupMode("approval_required"); }}
        />{" "}
        Approval Required — new logins wait for admin review
      </label>
      <label style={{ display: "block" }}>
        <input
          type="radio"
          checked={mode === "open"}
          onChange={async () => { setMode("open"); await api.setSignupMode("open"); }}
        />{" "}
        Open — new logins auto-approved
      </label>
    </div>
  );
}

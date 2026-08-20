import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Me } from "../lib/api.js";
import Avatar from "../components/Avatar.js";
import { UserStatusBadge } from "../components/StatusBadge.js";
import OverflowMenu from "../components/OverflowMenu.js";
import EmptyState from "../components/EmptyState.js";
import { ArrowLeftIcon, CheckIcon } from "../components/icons.js";

type Tab = "pending" | "all" | "settings";

export default function Admin({ me }: { me: Me }) {
  const [tab, setTab] = useState<Tab>("pending");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.pendingUsers().then((u) => setPendingCount(u.length));
  }, []);

  return (
    <div>
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeftIcon /> Dashboard
        </button>
        <strong className="text-heading">Admin</strong>
        <div className="topbar-account">
          <Avatar name={me.name || me.email} seed={me.id} size={26} />
          <span className="muted">{me.name || me.email}</span>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
          Pending users
          {pendingCount !== null && pendingCount > 0 && <span className="badge badge-count">{pendingCount}</span>}
        </div>
        <div className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All users</div>
        <div className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>Settings</div>
      </div>

      {tab === "pending" && <PendingTab onCountChange={setPendingCount} />}
      {tab === "all" && <AllUsersTab me={me} />}
      {tab === "settings" && me.role === "super_admin" && <SettingsTab />}
      {tab === "settings" && me.role !== "super_admin" && (
        <p className="muted" style={{ padding: 24 }}>Super admin only.</p>
      )}
    </div>
  );
}

function PendingTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [users, setUsers] = useState<Me[] | null>(null);
  const reload = () => api.pendingUsers().then((u) => { setUsers(u); onCountChange(u.length); });
  useEffect(() => { reload(); }, []);

  if (users === null) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={<CheckIcon />}
        title="You're all caught up"
        body="No accounts waiting for approval."
      />
    );
  }

  return (
    <div style={{ padding: 24 }} className="table-scroll">
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Provider</th><th>Signed up</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id}>
              <td>
                <div className="table-row-user">
                  <Avatar name={u.name || u.email} seed={u.id} size={26} />
                  {u.name || "—"}
                </div>
              </td>
              <td>{u.email}</td>
              <td>{u.provider}</td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
              <td>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={async () => { await api.approve(u.id); reload(); }}>Approve</button>
                  <button className="btn btn-danger" onClick={async () => { await api.reject(u.id); reload(); }}>Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllUsersTab({ me }: { me: Me }) {
  const [users, setUsers] = useState<Me[] | null>(null);
  const [filter, setFilter] = useState("");
  const reload = () => api.allUsers().then(setUsers);
  useEffect(() => { reload(); }, []);

  if (users === null) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
      </div>
    );
  }

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
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="table-row-user">
                    <Avatar name={u.name || u.email} seed={u.id} size={26} />
                    {u.name || "—"}
                  </div>
                </td>
                <td>{u.email}</td>
                <td><UserStatusBadge status={u.status} /></td>
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
                <td style={{ textAlign: "right" }}>
                  <OverflowMenu
                    actions={
                      u.status === "banned"
                        ? [{ label: "Unban", onClick: async () => { await api.unban(u.id); reload(); } }]
                        : [{ label: "Ban", danger: true, onClick: async () => { await api.ban(u.id); reload(); } }]
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [mode, setMode] = useState<"open" | "approval_required">("approval_required");
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.settings().then((s) => setMode(s.signupMode)); }, []);

  async function apply(next: "open" | "approval_required") {
    setMode(next);
    setSaved(false);
    await api.setSignupMode(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="card" style={{ maxWidth: 480, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="text-heading">Signup mode</h3>
          {saved && <span className="muted" style={{ color: "var(--success)" }}>Saved ✓</span>}
        </div>
        <p className="muted" style={{ marginTop: 4 }}>Changes apply immediately to the next login.</p>

        <label style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "flex-start" }}>
          <input type="radio" checked={mode === "approval_required"} onChange={() => apply("approval_required")} style={{ marginTop: 3 }} />
          <span>
            <strong>Approval required</strong>
            <br />
            <span className="muted">New logins sit in the pending queue until an admin approves them.</span>
          </span>
        </label>
        <label style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
          <input type="radio" checked={mode === "open"} onChange={() => apply("open")} style={{ marginTop: 3 }} />
          <span>
            <strong>Open</strong>
            <br />
            <span className="muted">Anyone who signs in with Google or GitHub gets instant access.</span>
          </span>
        </label>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, type Board } from "../lib/api.js";

export default function ShareDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const [members, setMembers] = useState<Array<{ userId: string; email: string; name: string | null; role: string }>>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(board.visibility);

  useEffect(() => {
    api.members(board.id).then(setMembers);
  }, [board.id]);

  async function invite() {
    setError(null);
    try {
      await api.invite(board.id, email, role);
      setEmail("");
      setMembers(await api.members(board.id));
    } catch (e: any) {
      setError(e.body?.error === "no_approved_user_with_that_email" ? "No approved user with that email." : "Could not invite.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ maxWidth: 480, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Share "{board.name}"</h3>

        <label className="muted">Visibility</label>
        <select
          value={visibility}
          onChange={async (e) => {
            const v = e.target.value as "private" | "org";
            setVisibility(v);
            await api.setVisibility(board.id, v);
          }}
          style={{ display: "block", margin: "6px 0 16px" }}
        >
          <option value="private">Private — invite only</option>
          <option value="org">Org — every approved user can view</option>
        </select>

        {visibility === "private" && (
          <>
            <label className="muted">Invite by email</label>
            <div style={{ display: "flex", gap: 6, margin: "6px 0 12px" }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" style={{ flex: 1 }} />
              <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button className="btn btn-primary" onClick={invite}>Invite</button>
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {members.map((m) => (
                <li key={m.userId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>{m.name || m.email} <span className="muted">({m.role})</span></span>
                  <button
                    className="btn"
                    onClick={async () => {
                      await api.removeMember(board.id, m.userId);
                      setMembers(await api.members(board.id));
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <button
              className="btn"
              onClick={async () => {
                const { token } = await api.shareLink(board.id, role);
                setLink(`${location.origin}/join/${token}`);
              }}
            >
              Generate share link ({role})
            </button>
            {link && (
              <p className="muted" style={{ wordBreak: "break-all", marginTop: 8 }}>
                {link}
              </p>
            )}
          </>
        )}

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

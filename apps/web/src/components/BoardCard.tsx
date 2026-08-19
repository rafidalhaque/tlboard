import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Board } from "../lib/api.js";
import ShareDialog from "./ShareDialog.js";

export default function BoardCard({
  board,
  highlightedName,
  onChanged,
}: {
  board: Board;
  highlightedName?: string;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(board.name);
  const [sharing, setSharing] = useState(false);
  const canManage = board.role === "board_admin" || !board.role;

  async function submitRename() {
    setRenaming(false);
    if (name.trim() && name !== board.name) await api.renameBoard(board.id, name.trim());
    onChanged();
  }

  return (
    <div className="board-card">
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => e.key === "Enter" && submitRename()}
        />
      ) : (
        <strong onClick={() => navigate(`/board/${board.id}`)} style={{ cursor: "pointer" }}>
          {highlightedName ? <span dangerouslySetInnerHTML={{ __html: highlightedName }} /> : board.name}
        </strong>
      )}
      <span className="muted">
        {board.visibility === "org" ? "Org-visible" : "Private"} · updated {new Date(board.updatedAt).toLocaleDateString()}
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => navigate(`/board/${board.id}`)}>Open</button>
        {canManage && <button className="btn" onClick={() => setRenaming(true)}>Rename</button>}
        {canManage && <button className="btn" onClick={() => setSharing(true)}>Share</button>}
        <button
          className="btn"
          onClick={async () => {
            await api.duplicateBoard(board.id);
            onChanged();
          }}
        >
          Duplicate
        </button>
        {canManage && (
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (confirm(`Delete "${board.name}"?`)) {
                await api.deleteBoard(board.id);
                onChanged();
              }
            }}
          >
            Delete
          </button>
        )}
      </div>
      {sharing && <ShareDialog board={board} onClose={() => setSharing(false)} />}
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Board } from "../lib/api.js";
import { gradientFor, initialsFor } from "../lib/color.js";
import ShareDialog from "./ShareDialog.js";
import OverflowMenu from "./OverflowMenu.js";
import { VisibilityBadge } from "./StatusBadge.js";

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

  const open = () => navigate(`/board/${board.id}`);

  return (
    <div className="board-card" onClick={renaming ? undefined : open}>
      <div className="board-thumb" style={{ background: gradientFor(board.id) }}>
        {initialsFor(board.name || "?")}
      </div>
      <div className="board-card-body">
        <div className="board-card-title-row">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              style={{ flex: 1 }}
            />
          ) : (
            <span className="board-card-title">
              {highlightedName ? <span dangerouslySetInnerHTML={{ __html: highlightedName }} /> : board.name}
            </span>
          )}
          <OverflowMenu
            actions={[
              ...(canManage ? [{ label: "Rename", onClick: () => setRenaming(true) }] : []),
              ...(canManage ? [{ label: "Share", onClick: () => setSharing(true) }] : []),
              { label: "Duplicate", onClick: async () => { await api.duplicateBoard(board.id); onChanged(); } },
              ...(canManage
                ? [
                    {
                      label: "Delete",
                      danger: true,
                      onClick: async () => {
                        if (confirm(`Delete "${board.name}"?`)) {
                          await api.deleteBoard(board.id);
                          onChanged();
                        }
                      },
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <div className="board-card-meta">
          <VisibilityBadge visibility={board.visibility} />
          <span className="muted">Updated {new Date(board.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
      {sharing && <ShareDialog board={board} onClose={() => setSharing(false)} />}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { api, type Board as BoardMeta, type Me } from "../lib/api.js";
import { assetStore } from "../lib/assetStore.js";
import { ArrowLeftIcon } from "../components/icons.js";
import OverflowMenu from "../components/OverflowMenu.js";
import ShareDialog from "../components/ShareDialog.js";

export default function Board({ me }: { me: Me }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<BoardMeta | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [sharing, setSharing] = useState(false);

  const reloadMeta = () => {
    if (id) api.board(id).then(setMeta).catch(() => setForbidden(true));
  };
  useEffect(reloadMeta, [id]);

  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  const store = useSync({ uri: `${wsProtocol}//${location.host}/api/sync/${id}`, assets: assetStore });

  if (forbidden) {
    return (
      <div className="center-screen">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>No access to this board</h3>
          <button className="btn" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
        </div>
      </div>
    );
  }

  const readOnly = meta?.role === "viewer";
  const canManage = meta?.role === "board_admin";

  function onMount(editor: Editor) {
    if (readOnly) editor.updateInstanceState({ isReadonly: true });
  }

  async function rename() {
    if (!meta) return;
    const next = prompt("Rename board", meta.name);
    if (next && next.trim() && next.trim() !== meta.name) {
      await api.renameBoard(meta.id, next.trim());
      reloadMeta();
    }
  }

  async function duplicate() {
    if (!meta) return;
    const copy = await api.duplicateBoard(meta.id);
    navigate(`/board/${copy.id}`);
  }

  async function del() {
    if (!meta) return;
    if (confirm(`Delete "${meta.name}"?`)) {
      await api.deleteBoard(meta.id);
      navigate("/dashboard");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <div className="topbar" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
        <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeftIcon /> {meta?.name ?? "Board"}
        </button>
        <div className="topbar-account">
          {readOnly && <span className="badge badge-neutral">View only</span>}
          <span className="muted">{me.name || me.email}</span>
          {meta && (
            <OverflowMenu
              actions={[
                ...(canManage ? [{ label: "Rename", onClick: rename }] : []),
                ...(canManage ? [{ label: "Share", onClick: () => setSharing(true) }] : []),
                { label: "Duplicate", onClick: duplicate },
                ...(canManage ? [{ label: "Delete", danger: true, onClick: del }] : []),
              ]}
            />
          )}
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, top: 49 }}>
        <Tldraw store={store} onMount={onMount} />
      </div>
      {sharing && meta && <ShareDialog board={meta} onClose={() => setSharing(false)} />}
    </div>
  );
}

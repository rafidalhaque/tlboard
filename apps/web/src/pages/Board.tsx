import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { api, type Board as BoardMeta, type Me } from "../lib/api.js";
import { assetStore } from "../lib/assetStore.js";

export default function Board({ me }: { me: Me }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<BoardMeta | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.board(id).then(setMeta).catch(() => setForbidden(true));
  }, [id]);

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

  function onMount(editor: Editor) {
    if (readOnly) editor.updateInstanceState({ isReadonly: true });
  }

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <div className="topbar" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
        <button className="btn" onClick={() => navigate("/dashboard")}>← {meta?.name ?? "Board"}</button>
        <span className="muted">{readOnly ? "View only" : ""}</span>
        <span className="muted">{me.name || me.email}</span>
      </div>
      <div style={{ position: "absolute", inset: 0, top: 49 }}>
        <Tldraw store={store} onMount={onMount} />
      </div>
    </div>
  );
}

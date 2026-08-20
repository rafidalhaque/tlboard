import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Board, type Me } from "../lib/api.js";
import BoardCard from "../components/BoardCard.js";
import SearchBar from "../components/SearchBar.js";
import SignOutButton from "../components/SignOutButton.js";

export default function Dashboard({ me }: { me: Me }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [results, setResults] = useState<(Board & { _formatted?: { name: string } })[] | null>(null);
  const navigate = useNavigate();

  const reload = () => api.boards().then(setBoards);
  useEffect(() => {
    reload();
  }, []);

  const shown = results ?? boards;

  return (
    <div>
      <div className="topbar">
        <strong>tlboard</strong>
        <SearchBar onResults={setResults} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {(me.role === "admin" || me.role === "super_admin") && (
            <button className="btn" onClick={() => navigate("/admin")}>Admin</button>
          )}
          <span className="muted">{me.name || me.email}</span>
          <SignOutButton />
        </div>
      </div>

      <div style={{ padding: "16px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{results ? `Results for search` : "Your boards"}</h2>
        <button
          className="btn btn-primary"
          onClick={async () => {
            const board = await api.createBoard("Untitled board");
            navigate(`/board/${board.id}`);
          }}
        >
          + New board
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="muted" style={{ padding: 24 }}>{results ? "No boards match." : "No boards yet — create one."}</p>
      ) : (
        <div className="board-grid">
          {shown.map((b) => (
            <BoardCard key={b.id} board={b} highlightedName={(b as any)._formatted?.name} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Board, type Me } from "../lib/api.js";
import BoardCard from "../components/BoardCard.js";
import SearchBar from "../components/SearchBar.js";
import SignOutButton from "../components/SignOutButton.js";
import Avatar from "../components/Avatar.js";
import EmptyState from "../components/EmptyState.js";
import { BoardsIcon, PlusIcon, SearchOffIcon } from "../components/icons.js";

export default function Dashboard({ me }: { me: Me }) {
  const [boards, setBoards] = useState<Board[] | null>(null); // null = initial load
  const [results, setResults] = useState<(Board & { _formatted?: { name: string } })[] | null>(null);
  const navigate = useNavigate();

  const reload = () => api.boards().then(setBoards);
  useEffect(() => {
    reload();
  }, []);

  const shown = results ?? boards ?? [];
  const searching = results !== null;

  async function createBoard() {
    const board = await api.createBoard("Untitled board");
    navigate(`/board/${board.id}`);
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-brand">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            t
          </div>
          <strong className="text-heading">tlboard</strong>
        </div>
        <div className="topbar-search">
          <SearchBar onResults={setResults} />
        </div>
        <div className="topbar-account">
          {(me.role === "admin" || me.role === "super_admin") && (
            <button className="btn" onClick={() => navigate("/admin")}>Admin</button>
          )}
          <Avatar name={me.name || me.email} seed={me.id} />
          <SignOutButton variant="btn-ghost" />
        </div>
      </div>

      <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="text-title">{searching ? "Search results" : "Your boards"}</h2>
        <button className="btn btn-primary" onClick={createBoard}>
          <PlusIcon /> New board
        </button>
      </div>

      {boards === null ? (
        <div className="board-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-board-card" />
          ))}
        </div>
      ) : searching && shown.length === 0 ? (
        <EmptyState
          icon={<SearchOffIcon />}
          title="No boards match"
          body="Try a different name — search covers boards you own, are a member of, or that are org-visible."
        />
      ) : !searching && shown.length === 0 ? (
        <EmptyState
          icon={<BoardsIcon />}
          title="Create your first board"
          body="Boards are where your team draws together in real time. Get started with a blank canvas."
          action={
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={createBoard}>
              <PlusIcon /> New board
            </button>
          }
        />
      ) : (
        <div className="board-grid">
          {!searching && (
            <div className="board-card-new" onClick={createBoard}>
              <PlusIcon />
              New board
            </div>
          )}
          {shown.map((b) => (
            <BoardCard key={b.id} board={b} highlightedName={(b as any)._formatted?.name} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { MoreIcon } from "./icons.js";

export interface MenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export default function OverflowMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="btn btn-ghost btn-icon" aria-label="More actions" onClick={() => setOpen((v) => !v)}>
        <MoreIcon />
      </button>
      {open && (
        <div className="menu-panel">
          {actions.map((a) => (
            <button
              key={a.label}
              className={`menu-item ${a.danger ? "danger" : ""}`}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

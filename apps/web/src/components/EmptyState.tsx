import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <p className="muted" style={{ maxWidth: 320 }}>{body}</p>
      {action}
    </div>
  );
}

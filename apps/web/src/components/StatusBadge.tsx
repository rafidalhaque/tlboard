const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  banned: "Banned",
};

export function UserStatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function VisibilityBadge({ visibility }: { visibility: "private" | "org" }) {
  return <span className="badge badge-neutral">{visibility === "org" ? "Org" : "Private"}</span>;
}

export interface Me {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "super_admin" | "admin" | "member";
  status: "pending" | "approved" | "rejected" | "banned";
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  visibility: "private" | "org";
  updatedAt: string;
  role?: "viewer" | "editor" | "board_admin";
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status, body: await res.json().catch(() => null) });
  return res.json();
}

export const api = {
  me: () => req<Me>("/api/me"),
  boards: () => req<Board[]>("/api/boards"),
  board: (id: string) => req<Board>(`/api/boards/${id}`),
  createBoard: (name: string) => req<Board>("/api/boards", { method: "POST", body: JSON.stringify({ name }) }),
  renameBoard: (id: string, name: string) => req<Board>(`/api/boards/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  setVisibility: (id: string, visibility: "private" | "org") =>
    req<Board>(`/api/boards/${id}`, { method: "PATCH", body: JSON.stringify({ visibility }) }),
  deleteBoard: (id: string) => req<void>(`/api/boards/${id}`, { method: "DELETE" }),
  duplicateBoard: (id: string) => req<Board>(`/api/boards/${id}/duplicate`, { method: "POST" }),
  members: (id: string) => req<Array<{ userId: string; email: string; name: string | null; role: string }>>(`/api/boards/${id}/members`),
  invite: (id: string, email: string, role: "viewer" | "editor") =>
    req(`/api/boards/${id}/invite`, { method: "POST", body: JSON.stringify({ email, role }) }),
  removeMember: (id: string, userId: string) => req<void>(`/api/boards/${id}/members/${userId}`, { method: "DELETE" }),
  shareLink: (id: string, role: "viewer" | "editor") =>
    req<{ token: string; role: string }>(`/api/boards/${id}/share-link`, { method: "POST", body: JSON.stringify({ role }) }),
  joinByToken: (token: string) => req<{ boardId: string }>(`/api/boards/join/${token}`, { method: "POST" }),
  search: (q: string) => req<Array<Board & { _formatted?: { name: string } }>>(`/api/search?q=${encodeURIComponent(q)}`),

  // admin
  pendingUsers: () => req<Me[]>("/api/admin/users/pending"),
  allUsers: () => req<Me[]>("/api/admin/users"),
  approve: (id: string) => req<Me>(`/api/admin/users/${id}/approve`, { method: "POST" }),
  reject: (id: string) => req<Me>(`/api/admin/users/${id}/reject`, { method: "POST" }),
  ban: (id: string) => req<Me>(`/api/admin/users/${id}/ban`, { method: "POST" }),
  unban: (id: string) => req<Me>(`/api/admin/users/${id}/unban`, { method: "POST" }),
  setRole: (id: string, role: string) => req<Me>(`/api/admin/users/${id}/role`, { method: "POST", body: JSON.stringify({ role }) }),
  settings: () => req<{ signupMode: "open" | "approval_required" }>("/api/admin/settings"),
  setSignupMode: (signupMode: "open" | "approval_required") =>
    req(`/api/admin/settings`, { method: "POST", body: JSON.stringify({ signupMode }) }),
};

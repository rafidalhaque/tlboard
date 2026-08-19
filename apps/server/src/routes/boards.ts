import { Router } from "express";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireApproved } from "../middleware.js";
import { getBoardAccess, listAccessibleBoards, canEdit } from "../boardAccess.js";
import { indexBoard, deleteBoardFromIndex } from "../meilisearch.js";

export const boardsRouter = Router();
boardsRouter.use(requireApproved);

boardsRouter.get("/", async (req, res) => {
  const boards = await listAccessibleBoards(req.user!.id);
  res.json(boards);
});

boardsRouter.post("/", async (req, res) => {
  const name = String(req.body?.name || "Untitled board").slice(0, 200);
  const [board] = await db
    .insert(schema.boards)
    .values({ name, ownerId: req.user!.id })
    .returning();
  await indexBoard(board.id);
  res.status(201).json(board);
});

boardsRouter.get("/:id", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (!role) return res.status(403).json({ error: "forbidden" });
  const board = await db.query.boards.findFirst({ where: eq(schema.boards.id, req.params.id) });
  res.json({ ...board, role });
});

boardsRouter.patch("/:id", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (role !== "board_admin") return res.status(403).json({ error: "forbidden" });
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof req.body?.name === "string") patch.name = req.body.name.slice(0, 200);
  if (req.body?.visibility === "org" || req.body?.visibility === "private") patch.visibility = req.body.visibility;
  const [board] = await db.update(schema.boards).set(patch).where(eq(schema.boards.id, req.params.id)).returning();
  await indexBoard(board.id);
  res.json(board);
});

boardsRouter.delete("/:id", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (role !== "board_admin") return res.status(403).json({ error: "forbidden" });
  await db.update(schema.boards).set({ archivedAt: new Date() }).where(eq(schema.boards.id, req.params.id));
  await deleteBoardFromIndex(req.params.id);
  res.status(204).end();
});

boardsRouter.post("/:id/duplicate", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (!role) return res.status(403).json({ error: "forbidden" });
  const original = await db.query.boards.findFirst({ where: eq(schema.boards.id, req.params.id) });
  if (!original) return res.status(404).end();
  const [copy] = await db
    .insert(schema.boards)
    .values({ name: `${original.name} (copy)`, ownerId: req.user!.id, document: original.document })
    .returning();
  await indexBoard(copy.id);
  res.status(201).json(copy);
});

// --- sharing ---

boardsRouter.get("/:id/members", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (!role) return res.status(403).json({ error: "forbidden" });
  const members = await db
    .select({ userId: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.boardMemberships.role })
    .from(schema.boardMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.boardMemberships.userId))
    .where(eq(schema.boardMemberships.boardId, req.params.id));
  res.json(members);
});

boardsRouter.post("/:id/invite", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (role !== "board_admin") return res.status(403).json({ error: "forbidden" });

  const email = String(req.body?.email || "").toLowerCase();
  const memberRole = req.body?.role === "editor" ? "editor" : "viewer";
  const invitee = await db.query.users.findFirst({ where: and(eq(schema.users.email, email), eq(schema.users.status, "approved")) });
  if (!invitee) return res.status(404).json({ error: "no_approved_user_with_that_email" });

  await db
    .insert(schema.boardMemberships)
    .values({ boardId: req.params.id, userId: invitee.id, role: memberRole, invitedBy: req.user!.id })
    .onConflictDoUpdate({ target: [schema.boardMemberships.boardId, schema.boardMemberships.userId], set: { role: memberRole } });
  await indexBoard(req.params.id);
  res.status(201).json({ ok: true });
});

boardsRouter.delete("/:id/members/:userId", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (role !== "board_admin") return res.status(403).json({ error: "forbidden" });
  await db
    .delete(schema.boardMemberships)
    .where(and(eq(schema.boardMemberships.boardId, req.params.id), eq(schema.boardMemberships.userId, req.params.userId)));
  await indexBoard(req.params.id);
  res.status(204).end();
});

boardsRouter.post("/:id/share-link", async (req, res) => {
  const role = await getBoardAccess(req.user!.id, req.params.id);
  if (role !== "board_admin") return res.status(403).json({ error: "forbidden" });
  const linkRole = req.body?.role === "editor" ? "editor" : "viewer";
  const token = randomUUID();
  await db.insert(schema.shareLinks).values({ token, boardId: req.params.id, role: linkRole, createdBy: req.user!.id });
  res.status(201).json({ token, role: linkRole });
});

// join a board via a previously generated share link
boardsRouter.post("/join/:token", async (req, res) => {
  const link = await db.query.shareLinks.findFirst({ where: eq(schema.shareLinks.token, req.params.token) });
  if (!link) return res.status(404).json({ error: "invalid_link" });
  await db
    .insert(schema.boardMemberships)
    .values({ boardId: link.boardId, userId: req.user!.id, role: link.role, invitedBy: link.createdBy })
    .onConflictDoNothing();
  await indexBoard(link.boardId);
  res.json({ boardId: link.boardId });
});

export { canEdit };

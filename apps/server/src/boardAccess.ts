import { and, eq, or, isNull } from "drizzle-orm";
import { db, schema } from "./db/index.js";

export type EffectiveRole = "viewer" | "editor" | "board_admin" | null;

/** Owner always has board_admin rights even without an explicit membership row. */
export async function getBoardAccess(userId: string, boardId: string): Promise<EffectiveRole> {
  const board = await db.query.boards.findFirst({ where: eq(schema.boards.id, boardId) });
  if (!board || board.archivedAt) return null;
  if (board.ownerId === userId) return "board_admin";

  const membership = await db.query.boardMemberships.findFirst({
    where: and(eq(schema.boardMemberships.boardId, boardId), eq(schema.boardMemberships.userId, userId)),
  });
  if (membership) return membership.role;

  if (board.visibility === "org") return "viewer";
  return null;
}

export function canEdit(role: EffectiveRole) {
  return role === "editor" || role === "board_admin";
}

export async function listAccessibleBoards(userId: string) {
  return db.query.boards.findMany({
    where: and(
      isNull(schema.boards.archivedAt),
      or(eq(schema.boards.ownerId, userId), eq(schema.boards.visibility, "org"))
    ),
  }).then(async (ownedOrOrg) => {
    const memberBoards = await db
      .select({ board: schema.boards })
      .from(schema.boardMemberships)
      .innerJoin(schema.boards, eq(schema.boards.id, schema.boardMemberships.boardId))
      .where(and(eq(schema.boardMemberships.userId, userId), isNull(schema.boards.archivedAt)));

    const byId = new Map(ownedOrOrg.map((b) => [b.id, b]));
    for (const { board } of memberBoards) byId.set(board.id, board);
    return [...byId.values()].sort((a, b) => +b.updatedAt - +a.updatedAt);
  });
}

import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";
import { TLSocketRoom, type RoomSnapshot } from "@tldraw/sync-core";
import { eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { userIdFromCookieHeader } from "./auth.js";
import { getBoardAccess } from "./boardAccess.js";
import { indexBoard } from "./meilisearch.js";

const rooms = new Map<string, TLSocketRoom>();
const persistTimers = new Map<string, NodeJS.Timeout>();
const wss = new WebSocketServer({ noServer: true });

async function loadOrCreateRoom(boardId: string): Promise<TLSocketRoom> {
  const existing = rooms.get(boardId);
  if (existing) return existing;

  const board = await db.query.boards.findFirst({ where: eq(schema.boards.id, boardId) });
  const room = new TLSocketRoom({
    initialSnapshot: (board?.document as RoomSnapshot | undefined) ?? undefined,
    onSessionRemoved(r, { numSessionsRemaining }) {
      if (numSessionsRemaining === 0) {
        persistRoom(boardId, r);
        rooms.delete(boardId);
      }
    },
    onDataChange() {
      schedulePersist(boardId, room);
    },
  });
  rooms.set(boardId, room);
  return room;
}

// debounced so a burst of draw events doesn't hammer postgres — 2s after the last change
function schedulePersist(boardId: string, room: TLSocketRoom) {
  clearTimeout(persistTimers.get(boardId));
  persistTimers.set(
    boardId,
    setTimeout(() => persistRoom(boardId, room), 2000)
  );
}

async function persistRoom(boardId: string, room: TLSocketRoom) {
  persistTimers.delete(boardId);
  await db
    .update(schema.boards)
    .set({ document: room.getCurrentSnapshot(), updatedAt: new Date() })
    .where(eq(schema.boards.id, boardId));
  await indexBoard(boardId); // keeps "last modified" search sort accurate
}

/** Independent server-side auth check on the WS upgrade — never trust the client's claimed
 * board/session. Mirrors requireApproved + getBoardAccess used by the HTTP API. */
export function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  void (async () => {
    const url = new URL(req.url ?? "", "http://internal");
    const match = url.pathname.match(/^\/api\/sync\/([^/]+)$/);
    if (!match) return socket.destroy();
    const boardId = match[1];

    const userId = await userIdFromCookieHeader(req.headers.cookie);
    if (!userId) return socket.destroy();

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!user || user.status !== "approved") return socket.destroy();

    const role = await getBoardAccess(userId, boardId);
    if (!role) return socket.destroy();

    const room = await loadOrCreateRoom(boardId);
    wss.handleUpgrade(req, socket, head, (ws) => {
      room.handleSocketConnect({ sessionId: nanoid(), socket: ws as any, isReadonly: role === "viewer" });
    });
  })();
}

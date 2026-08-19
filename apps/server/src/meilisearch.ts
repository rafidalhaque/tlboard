import { MeiliSearch } from "meilisearch";
import { eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";

export const meili = new MeiliSearch({
  host: process.env.MEILI_HOST || "http://meilisearch:7700",
  apiKey: process.env.MEILI_API_KEY,
});

const INDEX = "boards";

export async function ensureBoardIndex() {
  const index = meili.index(INDEX);
  await meili.createIndex(INDEX, { primaryKey: "id" }).catch(() => {});
  await index.updateFilterableAttributes(["ownerId", "visibility", "memberIds"]);
  await index.updateSortableAttributes(["updatedAt"]);
  return index;
}

/** Board docs carry their own access-control fields (owner, visibility, memberIds) so every
 * search query can filter server-side — a board never surfaces to a user without access. */
export async function indexBoard(boardId: string) {
  const board = await db.query.boards.findFirst({ where: eq(schema.boards.id, boardId) });
  if (!board || board.archivedAt) {
    await meili.index(INDEX).deleteDocument(boardId).catch(() => {});
    return;
  }
  const members = await db
    .select({ userId: schema.boardMemberships.userId })
    .from(schema.boardMemberships)
    .where(eq(schema.boardMemberships.boardId, boardId));

  await meili.index(INDEX).addDocuments([
    {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
      visibility: board.visibility,
      memberIds: members.map((m) => m.userId),
      updatedAt: +board.updatedAt,
    },
  ]);
}

export async function deleteBoardFromIndex(boardId: string) {
  await meili.index(INDEX).deleteDocument(boardId).catch(() => {});
}

// Sentinel markers for highlight boundaries — control chars can't appear in a board name and
// aren't HTML-meaningful, so escaping first and swapping these for <mark> after is safe.
const HL_START = "\u0001";
const HL_END = "\u0002";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Meilisearch's highlighted output is the raw field value with markers spliced in — it does
// NOT escape HTML, so a board named "<img onerror=...>" would inject straight into the DOM.
// Escape first, then turn our own unmistakable sentinel markers into real <mark> tags.
function safeHighlight(raw: string): string {
  return escapeHtml(raw).replaceAll(HL_START, "<mark>").replaceAll(HL_END, "</mark>");
}

export async function searchBoards(userId: string, query: string) {
  const index = meili.index(INDEX);
  const result = await index.search(query, {
    filter: `visibility = org OR ownerId = ${JSON.stringify(userId)} OR memberIds = ${JSON.stringify(userId)}`,
    sort: ["updatedAt:desc"],
    attributesToHighlight: ["name"],
    highlightPreTag: HL_START,
    highlightPostTag: HL_END,
    limit: 25,
  });
  return result.hits.map((hit) => ({
    ...hit,
    _formatted: hit._formatted?.name ? { name: safeHighlight(hit._formatted.name) } : undefined,
  }));
}

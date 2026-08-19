import { Router } from "express";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const ASSET_DIR = process.env.ASSET_DIR || path.resolve(process.cwd(), "data/assets");
await mkdir(ASSET_DIR, { recursive: true });

// ponytail: local disk, not S3 — fine for a single-node deploy behind one volume;
// swap for an S3-backed TLAssetStore.upload if this ever needs to scale out horizontally.
// auth (requireApproved) is applied where this router is mounted in index.ts, alongside
// the express.static handler that serves the same directory for GET.
export const assetsRouter = Router();

const ID_RE = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;

assetsRouter.put("/:id", async (req, res) => {
  if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: "invalid_id" });
  await pipeline(req, createWriteStream(path.join(ASSET_DIR, req.params.id)));
  res.status(204).end();
});

assetsRouter.delete("/:id", async (req, res) => {
  if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: "invalid_id" });
  await unlink(path.join(ASSET_DIR, req.params.id)).catch(() => {});
  res.status(204).end();
});

export { ASSET_DIR };

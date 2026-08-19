import { Router } from "express";
import { requireApproved } from "../middleware.js";
import { searchBoards } from "../meilisearch.js";

export const searchRouter = Router();
searchRouter.use(requireApproved);

searchRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  res.json(await searchBoards(req.user!.id, q));
});

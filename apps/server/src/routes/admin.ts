import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireApproved, requireAdmin, requireSuperAdmin } from "../middleware.js";

export const adminRouter = Router();
adminRouter.use(requireApproved, requireAdmin);

// a plain admin must not be able to ban/reject a super_admin (or another admin) — only a
// super_admin can act on accounts at or above the admin tier. Applied to every mutating route
// below via router.param so no individual handler can forget it.
adminRouter.param("id", async (req: Request, res: Response, next: NextFunction, id: string) => {
  if (req.user!.role === "super_admin") return next();
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (target && (target.role === "super_admin" || target.role === "admin")) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
});

adminRouter.get("/users/pending", async (_req, res) => {
  const rows = await db.query.users.findMany({ where: eq(schema.users.status, "pending") });
  res.json(rows);
});

adminRouter.get("/users", async (_req, res) => {
  res.json(await db.query.users.findMany());
});

adminRouter.post("/users/:id/approve", async (req, res) => {
  const [row] = await db
    .update(schema.users)
    .set({ status: "approved", approvedBy: req.user!.id, approvedAt: new Date() })
    .where(eq(schema.users.id, req.params.id))
    .returning();
  res.json(row);
});

adminRouter.post("/users/:id/reject", async (req, res) => {
  const [row] = await db
    .update(schema.users)
    .set({ status: "rejected", approvedBy: req.user!.id, approvedAt: new Date() })
    .where(eq(schema.users.id, req.params.id))
    .returning();
  res.json(row);
});

adminRouter.post("/users/:id/ban", async (req, res) => {
  const [row] = await db.update(schema.users).set({ status: "banned" }).where(eq(schema.users.id, req.params.id)).returning();
  res.json(row);
});

adminRouter.post("/users/:id/unban", async (req, res) => {
  const [row] = await db.update(schema.users).set({ status: "approved" }).where(eq(schema.users.id, req.params.id)).returning();
  res.json(row);
});

// role changes are super-admin only — an admin promoting themselves to super_admin would be
// a privilege escalation bug, not a feature
adminRouter.post("/users/:id/role", requireSuperAdmin, async (req, res) => {
  const role = req.body?.role;
  if (!["super_admin", "admin", "member"].includes(role)) return res.status(400).json({ error: "invalid_role" });
  const [row] = await db.update(schema.users).set({ role }).where(eq(schema.users.id, req.params.id)).returning();
  res.json(row);
});

adminRouter.get("/settings", requireSuperAdmin, async (_req, res) => {
  const settings = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.id, 1) });
  res.json(settings ?? { id: 1, signupMode: "approval_required" });
});

adminRouter.post("/settings", requireSuperAdmin, async (req, res) => {
  const signupMode = req.body?.signupMode === "open" ? "open" : "approval_required";
  const [row] = await db
    .insert(schema.appSettings)
    .values({ id: 1, signupMode })
    .onConflictDoUpdate({ target: schema.appSettings.id, set: { signupMode } })
    .returning();
  res.json(row);
});

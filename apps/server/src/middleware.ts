import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { userIdFromCookieHeader } from "./auth.js";

export interface AuthedUser {
  id: string;
  email: string;
  name: string | null;
  role: "super_admin" | "admin" | "member";
  status: "pending" | "approved" | "rejected" | "banned";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

/** Loads the current user fresh from the DB on every request — never trusts the JWT's
 * cached role/status, so an admin ban or approval takes effect on the very next request. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const userId = await userIdFromCookieHeader(req.headers.cookie);
  if (userId) {
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (row) req.user = row;
  }
  next();
}

export function requireApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "not_authenticated" });
  if (req.user.status !== "approved") return res.status(403).json({ error: "not_approved", status: req.user.status });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "super_admin") return res.status(403).json({ error: "forbidden" });
  next();
}

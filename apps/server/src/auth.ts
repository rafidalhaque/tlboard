import Google from "@auth/express/providers/google";
import GitHub from "@auth/express/providers/github";
import { decode } from "@auth/core/jwt";
import { parse as parseCookie } from "cookie";
import type { ExpressAuthConfig } from "@auth/express";
import { db, schema } from "./db/index.js";
import { eq, and } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();

export const authConfig: ExpressAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
    GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }),
  ],
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: { options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" } },
  },
  callbacks: {
    // upsert our own user row on every OAuth login; this is the single source of truth
    // for status/role, not the JWT (see requireApproved — we re-check the DB every request)
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      const email = user.email.toLowerCase();
      const existing = await db.query.users.findFirst({
        where: and(eq(schema.users.provider, account.provider), eq(schema.users.providerId, account.providerAccountId)),
      });

      if (existing) {
        user.id = existing.id;
        return true;
      }

      const isSuperAdmin = SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL;
      const settings = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.id, 1) });
      const openSignup = settings?.signupMode === "open";

      const [created] = await db
        .insert(schema.users)
        .values({
          email,
          name: user.name,
          avatarUrl: user.image,
          provider: account.provider,
          providerId: account.providerAccountId,
          status: isSuperAdmin || openSignup ? "approved" : "pending",
          role: isSuperAdmin ? "super_admin" : "member",
        })
        .returning();

      user.id = created.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id; // our DB id, not the provider id
      return token;
    },
  },
};

const COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

/** Decodes the Auth.js session cookie straight off a raw cookie header. Works for both
 * express requests and the raw http.IncomingMessage seen during a WS upgrade — same
 * code path so there's exactly one place that trusts a session token. */
export async function userIdFromCookieHeader(cookieHeader: string | undefined): Promise<string | null> {
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  for (const name of COOKIE_NAMES) {
    const token = cookies[name];
    if (!token) continue;
    try {
      const payload = await decode({ token, secret: process.env.AUTH_SECRET!, salt: name });
      return (payload?.sub as string) ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

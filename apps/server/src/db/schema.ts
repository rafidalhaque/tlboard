import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  primaryKey,
  smallint,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", ["pending", "approved", "rejected", "banned"]);
export const userRole = pgEnum("user_role", ["super_admin", "admin", "member"]);
export const boardVisibility = pgEnum("board_visibility", ["private", "org"]);
export const memberRole = pgEnum("member_role", ["viewer", "editor", "board_admin"]);
export const signupMode = pgEnum("signup_mode", ["open", "approval_required"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    provider: text("provider").notNull(),
    providerId: text("provider_id").notNull(),
    status: userStatus("status").notNull().default("pending"),
    role: userRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_provider_provider_id_idx").on(t.provider, t.providerId),
    uniqueIndex("users_email_idx").on(t.email),
  ]
);

// ponytail: single-row settings table, no key-value store for one boolean toggle
export const appSettings = pgTable("app_settings", {
  id: smallint("id").primaryKey().default(1),
  signupMode: signupMode("signup_mode").notNull().default("approval_required"),
});

export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  visibility: boardVisibility("visibility").notNull().default("private"),
  document: jsonb("document"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const boardMemberships = pgTable(
  "board_memberships",
  {
    boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("viewer"),
    invitedBy: uuid("invited_by"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.boardId, t.userId] })]
);

export const shareLinks = pgTable("share_links", {
  token: text("token").primaryKey(),
  boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull().default("viewer"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  timestamp,
  datetime,
  int,
  text,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * --- IDENTITY (Better Auth Architecture) ---
 */

export const user = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 255 }).primaryKey(),
  expiresAt: datetime("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = mysqlTable("account", {
  id: varchar("id", { length: 255 }).primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"), // password hashes are stored here
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 255 }).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

/**
 * --- APPLICATION STATE ---
 */

export const workspaces = mysqlTable("workspaces", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  persona: varchar("persona", { length: 50 }).notNull(), // "helios" | "athena"
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const workspaceLevels = mysqlTable("workspace_levels", {
  id: varchar("id", { length: 255 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 255 })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  stepNumber: int("step_number").notNull(),
  taskTitle: varchar("task_title", { length: 255 }).notNull(),
  codeSnapshot: text("code_snapshot").notNull(),
  language: varchar("language", { length: 50 }).notNull(),
});

export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 255 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 255 })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(), // "user" | "model" | "system"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * --- RELATIONS (TypeScript Graph) ---
 */

// --- USER DOMAIN ---

// 1. A user can have MANY authSessions AND workspaces
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaces: many(workspaces),
}));

// 2. A authSession belongs to ONE user
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// --- WORKSPACE DOMAIN ---

// 1. A workspace CAN HAVE MANY messages AND workspaceLevels, and BELONGS TO ONE user
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  messages: many(messages),
  workspaceLevels: many(workspaceLevels),
  user: one(user, {
    fields: [workspaces.userId],
    references: [user.id],
  }),
}));

// 2. A workspaceLevel belongs to ONE workspace
export const workspaceLevelsRelations = relations(
  workspaceLevels,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceLevels.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

// 3. A messages belongs to ONE workspace
export const messagesRelations = relations(messages, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [messages.workspaceId],
    references: [workspaces.id],
  }),
}));

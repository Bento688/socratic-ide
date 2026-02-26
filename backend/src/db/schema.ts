import {
  mysqlTable,
  varchar,
  timestamp,
  datetime,
  int,
  text,
} from "drizzle-orm/mysql-core";

/**
 * --- IDENTITY ---
 */

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authSessions = mysqlTable("auth_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // if user dies, session dies
  expiresAt: datetime("expires_at").notNull(),
});

/**
 * --- APPLICATION STATE ---
 */

export const workspaces = mysqlTable("workspaces", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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

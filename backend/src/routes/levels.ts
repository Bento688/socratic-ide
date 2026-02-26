import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/connection.js";
import { workspaceLevels } from "../db/schema.js";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";

export const levelsRouter = new Hono();

/**
 * --- strict shape for a code snapshot (DTO) ---
 */
const createLevelSchema = z.object({
  workspaceId: z.string(),
  stepNumber: z.number(),
  taskTitle: z.string(),
  codeSnapshot: z.string(),
  language: z.string(),
});

const updateLevelSchema = z.object({
  workspaceId: z.string(),
  stepNumber: z.number(),
  codeSnapshot: z.string(),
});

/**
 * --- levelsRouter ---
 */
levelsRouter.post("/", zValidator("json", createLevelSchema), async (c) => {
  const data = c.req.valid("json");

  await db.insert(workspaceLevels).values({
    id: `lvl_${randomUUID()}`,
    workspaceId: data.workspaceId,
    stepNumber: data.stepNumber,
    taskTitle: data.taskTitle,
    codeSnapshot: data.codeSnapshot,
    language: data.language,
  });

  return c.json({ success: true }, 201);
});

levelsRouter.patch("/", zValidator("json", updateLevelSchema), async (c) => {
  const data = c.req.valid("json");

  // find the exact level for this workspace and update its code
  await db
    .update(workspaceLevels)
    .set({ codeSnapshot: data.codeSnapshot })
    .where(
      and(
        eq(workspaceLevels.workspaceId, data.workspaceId),
        eq(workspaceLevels.stepNumber, data.stepNumber),
      ),
    );

  return c.json({ success: true }, 200);
});

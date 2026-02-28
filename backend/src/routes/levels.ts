import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/connection.js";
import { workspaceLevels, workspaces } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

import { requireAuth, type AuthEnv } from "../middleware/authMiddleware.js";
import { velocityThrottle } from "../middleware/rateLimiter.js";

export const levelsRouter = new Hono<AuthEnv>();

levelsRouter.use("/*", requireAuth);

/**
 * --- strict shape for a code snapshot (DTO) ---
 */

const updateLevelSchema = z.object({
  workspaceId: z.string(),
  stepNumber: z.number(),
  codeSnapshot: z.string(),
});

/**
 * --- levelsRouter ---
 */

// PATCH => update the data of the level (code snapshots)
levelsRouter.patch(
  "/",
  velocityThrottle("update_level", 1000),
  zValidator("json", updateLevelSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user");

    // parent ownership check
    const [parentWorkspace] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, data.workspaceId),
          eq(workspaces.userId, user.id),
        ),
      )
      .limit(1);

    if (!parentWorkspace) {
      return c.json(
        { error: "Unauthorized. You do not own this workspace." },
        403,
      );
    }

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
  },
);

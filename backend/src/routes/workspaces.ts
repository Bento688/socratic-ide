import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/connection.js";
import { messages, workspaces } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

import { requireAuth, type AuthEnv } from "../middleware/authMiddleware.js";
import { velocityThrottle } from "../middleware/rateLimiter.js";

// use built-in crypto module to generate unique IDs
import { randomUUID } from "crypto";

export const workspacesRouter = new Hono<AuthEnv>();

// every single endpoint must be guarded by middleware
workspacesRouter.use("/*", requireAuth);

/**
 *  --- DTO ---
 */
const workspaceSchema = z.object({
  persona: z.enum(["helios", "athena"]),
});

/**
 * --- ROUTES ---
 */

// POST => create a new workspace
workspacesRouter.post(
  "/",
  velocityThrottle("create_workspace", 5000),
  zValidator("json", workspaceSchema),
  async (c) => {
    // zod guarantees the data is perfectly shaped before this line runs
    const { persona } = c.req.valid("json");

    // extract user identity
    const user = c.get("user");

    // generate clean UUID for the new workspace
    const workspaceId = `ws_${randomUUID()}`;

    // execute drizzle insert
    await db.insert(workspaces).values({
      id: workspaceId,
      userId: user.id,
      persona: persona,
    });

    // return the created ID so the frontend can immediately navigate to it
    return c.json(
      {
        success: true,
        workspace: { id: workspaceId, persona, userId: user.id },
      },
      201,
    );
  },
);

// GET => get ALL of the workspaces of a logged-in user
workspacesRouter.get("/", async (c) => {
  const user = c.get("user");

  // use relational API to fetch workspaces, sorted by newest first
  const userWorkspaces = await db.query.workspaces.findMany({
    where: eq(workspaces.userId, user.id),
    orderBy: desc(workspaces.updatedAt),
    with: {
      workspaceLevels: {
        // sort descending to get the newest level first
        orderBy: (workspaceLevels, { desc }) => [
          desc(workspaceLevels.stepNumber),
        ],
        limit: 1,
        columns: {
          taskTitle: true,
        },
      },
    },
  });

  // return the found workspaces to the frontend
  return c.json(
    {
      success: true,
      workspaces: userWorkspaces,
    },
    200,
  );
});

// GET => get the payload (messages and levels) of a workspace
workspacesRouter.get("/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const user = c.get("user");

  // query the exact workspace AND include its messages, sorted chronologically
  const workspaceData = await db.query.workspaces.findFirst({
    where: and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
      workspaceLevels: {
        orderBy: (workspaceLevels, { asc }) => [
          asc(workspaceLevels.stepNumber),
        ],
      },
    },
  });

  if (!workspaceData) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  return c.json(
    {
      success: true,
      workspace: workspaceData,
    },
    200,
  );
});

// PATCH => update the persona of a workspace
workspacesRouter.patch(
  "/:id",
  velocityThrottle("update_persona", 4000),
  zValidator("json", workspaceSchema),
  async (c) => {
    const workspaceId = c.req.param("id");
    const { persona } = c.req.valid("json");
    const user = c.get("user");

    await db
      .update(workspaces)
      .set({ persona })
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)),
      );

    return c.json({ success: true }, 200);
  },
);

// DELETE => delete a workspace
workspacesRouter.delete(
  "/:id",
  velocityThrottle("delete_workspace", 500),
  async (c) => {
    const workspaceId = c.req.param("id");
    const user = c.get("user");

    // execute delete
    // strictly enforce the userId so a malicious user
    // can't send a random ID and delete someone else's project.
    await db
      .delete(workspaces)
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)),
      );

    return c.json({ success: true }, 200);
  },
);

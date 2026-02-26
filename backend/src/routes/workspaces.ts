import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/connection.js";
import { messages, workspaces } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

// use built-in crypto module to generate unique IDs
import { randomUUID } from "crypto";

export const workspacesRouter = new Hono();

// DTO
const workspaceSchema = z.object({
  persona: z.enum(["helios", "athena"]),
});

// POST route
workspacesRouter.post("/", zValidator("json", workspaceSchema), async (c) => {
  // zod guarantees the data is perfectly shaped before this line runs
  const { persona } = c.req.valid("json");

  //** Hard coded seed */
  const userId = "dev-user-1";

  // generate clean UUID for the new workspace
  const workspaceId = `ws_${randomUUID()}`;

  // execute drizzle insert
  await db.insert(workspaces).values({
    id: workspaceId,
    userId: userId,
    persona: persona,
  });

  // return the created ID so the frontend can immediately navigate to it
  return c.json(
    {
      success: true,
      workspace: { id: workspaceId, persona, userId },
    },
    201,
  );
});

// get route : fetch all workspaces for the logged-in user
workspacesRouter.get("/", async (c) => {
  const userId = "dev-user-1";

  // use relational API to fetch workspaces, sorted by newest first
  const userWorkspaces = await db.query.workspaces.findMany({
    where: eq(workspaces.userId, userId),
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

workspacesRouter.get("/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const userId = "dev-user-1"; // hardcoded

  // query the exact workspace AND include its messages, sorted chronologically
  const workspaceData = await db.query.workspaces.findFirst({
    where: and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
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

// patch route: update workspace metadata (persona)
workspacesRouter.patch(
  "/:id",
  zValidator("json", workspaceSchema),
  async (c) => {
    const workspaceId = c.req.param("id");
    const { persona } = c.req.valid("json");
    const userId = "dev-user-1"; // hardcoded seed

    await db
      .update(workspaces)
      .set({ persona })
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
      );

    return c.json({ success: true }, 200);
  },
);

workspacesRouter.delete("/:id", async (c) => {
  const workspaceId = c.req.param("id");
  const userId = "dev-user-1"; // the hardcoded seed

  // execute delete
  // strictly enforce the userId so a malicious user
  // can't send a random ID and delete someone else's project.
  await db
    .delete(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

  return c.json({ success: true }, 200);
});

import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// import domain routers
import { chatRouter } from "./routes/chat.js";
import { workspacesRouter } from "./routes/workspaces.js";
import { levelsRouter } from "./routes/levels.js";

const app = new Hono().basePath("/api");

// global middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// health check
app.get("/health", (c) => c.json({ status: "online" }));

// routes
app.route("/chat", chatRouter);
app.route("/workspaces", workspacesRouter);
app.route("/levels", levelsRouter);

const port = Number(process.env.PORT) || 8080;

// 2. Add observability so you know exactly when the event loop is ready
console.log(`\n[System] Backend initializing...`);
console.log(
  `[System] Hono Server successfully running on http://localhost:${port}`,
);
console.log(`[System] Awaiting connections...\n`);

serve({
  fetch: app.fetch,
  port,
});

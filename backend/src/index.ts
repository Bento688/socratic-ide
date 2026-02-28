import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "./auth.js";

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
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Better Auth auth handler
app.all("/auth/**", (c) => {
  // extract raw Web Standard Request object and pass it to the engine
  return auth.handler(c.req.raw);
});

// health check
app.get("/health", (c) => c.json({ status: "online" }));

// routes
app.route("/chat", chatRouter);
app.route("/workspaces", workspacesRouter);
app.route("/levels", levelsRouter);

const port = Number(process.env.PORT) || 8080;

console.log(
  `[System] Hono Server successfully running on http://localhost:${port}`,
);

serve({
  fetch: app.fetch,
  port,
});

import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";

// define the shape of our authenticated context
export type AuthEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};

// interceptor
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  // 1. ask better auth to verify the incoming cookie
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  // 2 the wall: no cookie? unauthorized
  if (!sessionData) {
    return c.json({ error: "Unauthorized access. System locked" }, 401);
  }

  // 3. Inject the proven identity directly into Hono's memory for this request
  c.set("user", sessionData.user);
  c.set("session", sessionData.session);

  // 4. allow the request to proceed to the actual route
  await next();
});

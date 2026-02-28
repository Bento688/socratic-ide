import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./authMiddleware.js";

/**
 *  --- PHYSICAL RAM ALLOCATION ---
 */
const requestMap = new Map<string, number>();

/**
 *  --- CONSTRAINTS ---
 */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour and then we clean the map
const MEMORY_TTL_MS = 10 * 60 * 1000; // 10 minutes inactive = purge from map

/**
 *  --- GARBAGE COLLECTOR (CLEANS MAP PER HOUR) ---
 */
setInterval(() => {
  const now = Date.now();
  let purgedCount = 0;

  for (const [userId, lastTimestanmp] of requestMap.entries()) {
    if (now - lastTimestanmp > MEMORY_TTL_MS) {
      // delete from map
      requestMap.delete(userId);
      purgedCount++;
    }
  }

  if (purgedCount > 0) {
    console.log(
      `[SYSTEM: Memory Sweep] Purged ${purgedCount} inactive users from rate limiter.`,
    );
  }
}, SWEEP_INTERVAL_MS);

/**
 *  --- INTERCEPTOR ---
 */
export const velocityThrottle = (action: string, cooldownMs: number) => {
  return createMiddleware<AuthEnv>(async (c, next) => {
    // 1. grab the mathematically proven user from authMiddleware
    const user = c.get("user");

    if (!user) {
      // failsafe: if this runs before requireAuth, block it
      return c.json({ error: "System locked." }, 401);
    }

    const now = Date.now();
    // create a mathematically distinct key for this specific action
    const lockKey = `${user.id}:${action}`;
    const lastRequest = requestMap.get(lockKey);

    // calculate difference
    if (lastRequest) {
      const timePassed = now - lastRequest;

      if (timePassed < cooldownMs) {
        // 429 Too Many Requests
        return c.json(
          {
            error: `Velocity limit exceeded for ${action}. Please slow down.`,
            cooldownRemaining: cooldownMs - timePassed,
          },
          429,
        );
      }
    }
    // if not too fast, update the request map
    requestMap.set(lockKey, now);

    // allow request to proceed
    await next();
  });
};

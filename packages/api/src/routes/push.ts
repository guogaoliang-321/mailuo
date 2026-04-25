import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { getDb, pgSchema } from "@meridian/db";
import { eq, and } from "drizzle-orm";
import webpush from "web-push";
import type { AppEnv } from "../types.js";

export const pushRoutes = new Hono<AppEnv>();

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:354610696@qq.com", VAPID_PUBLIC, VAPID_PRIVATE);
}

// Public: return VAPID public key for client subscription
pushRoutes.get("/vapid-key", (c) => c.json({ success: true, data: VAPID_PUBLIC }));

// Subscribe (requires auth)
pushRoutes.post("/subscribe", requireAuth, async (c) => {
  const body = await c.req.json() as { endpoint?: string; p256dh?: string; auth?: string };
  const { endpoint, p256dh, auth } = body;
  if (!endpoint || !p256dh || !auth) {
    return c.json({ success: false, error: "参数缺失" }, 400);
  }
  const db = getDb();
  await db
    .insert(pgSchema.pushSubscriptions)
    .values({ userId: c.get("userId"), endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pgSchema.pushSubscriptions.endpoint,
      set: { userId: c.get("userId"), p256dh, auth },
    });
  return c.json({ success: true });
});

// Unsubscribe (requires auth)
pushRoutes.delete("/subscribe", requireAuth, async (c) => {
  const body = await c.req.json() as { endpoint?: string };
  const { endpoint } = body;
  if (!endpoint) {
    return c.json({ success: false, error: "参数缺失" }, 400);
  }
  const db = getDb();
  await db
    .delete(pgSchema.pushSubscriptions)
    .where(
      and(
        eq(pgSchema.pushSubscriptions.endpoint, endpoint),
        eq(pgSchema.pushSubscriptions.userId, c.get("userId"))
      )
    );
  return c.json({ success: true });
});

// Utility: send push notification to a specific user
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  const db = getDb();
  const subs = await db
    .select()
    .from(pgSchema.pushSubscriptions)
    .where(eq(pgSchema.pushSubscriptions.userId, userId));

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch {
      // Subscription expired or invalid — remove it
      await db
        .delete(pgSchema.pushSubscriptions)
        .where(eq(pgSchema.pushSubscriptions.endpoint, sub.endpoint));
    }
  }
}

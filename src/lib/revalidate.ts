import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const revalidateBody = z.object({
  tags: z.array(z.string().min(1).max(256)).min(1).max(100),
  eventId: z.string().optional(),
});

const digest = (value: string) => createHash("sha256").update(value).digest();

// Constant-time comparison of the Bearer token with the shared secret.
export function isAuthorized(header: string | null, secret: string) {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  return timingSafeEqual(digest(token), digest(secret));
}

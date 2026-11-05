import { z } from "zod";
import { MARKET_SEGMENT } from "./market";

// Server configuration, validated once at startup so a missing value fails the boot rather than a request.
// Imported by proxy.ts too, which is why this isn't marked "server-only".
const schema = z.object({
  API_URL: z.url(),
  SITE_URL: z.url(),
  REVALIDATE_SECRET: z.string().min(32, "REVALIDATE_SECRET must be at least 32 characters"),
  DEFAULT_MARKET: z.string().regex(MARKET_SEGMENT, "DEFAULT_MARKET looks like en-bd: {locale}-{market handle}"),
  CHANNEL: z.string().min(1).default("web"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid storefront environment:\n${problems}`);
  }
  return result.data;
}

if (typeof window !== "undefined") throw new Error("env is server-only");

export const env = parseEnv(process.env);
export const isProduction = env.NODE_ENV === "production";

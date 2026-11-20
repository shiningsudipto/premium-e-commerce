import "server-only";
import { env } from "../../../lib/env";
import type { GuideContext } from "./guide-types";

// The addresses the guides quote: the API integrators call (the public one browsers use) and
// this console.
export function guideContext(): GuideContext {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? env.API_URL).replace(/\/+$/, "");
  return { apiUrl, adminUrl: env.SITE_URL.replace(/\/+$/, "") };
}

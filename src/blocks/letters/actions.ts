"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requestContext, serverApi } from "../../api/server";
import { getStoreConfig } from "../../lib/store-data";

export type SubscribeState = {
  status: "idle" | "invalid" | "pending" | "subscribed" | "unavailable" | "too_many";
  email: string;
};

const email = z.email().max(254);

// The newsletter sign-up (every Newsletter block and the home page letter use it). Validates on
// the server, then hands the address to the API, which stores it and sends the confirmation
// email (double opt-in). The page it came from and the consent wording shown are kept as proof.
// A hidden "company" field catches bots: when it's filled the sign-up is silently dropped.
export async function subscribeToLetter(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  const value = String(form.get("email") ?? "").trim();
  if (!email.safeParse(value).success) return { status: "invalid", email: value };
  if (String(form.get("company") ?? "").trim()) return { status: "pending", email: "" };

  const ctx = await requestContext();
  const [t, config, h] = await Promise.all([getTranslations("newsletter"), getStoreConfig(ctx.market), headers()]);
  // the page path only (no query string), from the browser's Referer
  let source: string | undefined;
  try {
    const referer = h.get("referer");
    if (referer) source = new URL(referer).pathname.slice(0, 300);
  } catch {
    source = undefined;
  }
  const consentText = String(t.raw("consent"))
    .replace(/<\/?privacy>/g, "")
    .replace("{store}", config.storeName)
    .replace("{label}", "privacy policy")
    .slice(0, 500);

  try {
    const { data, response } = await serverApi(ctx).POST("/v1/store/newsletter", {
      body: { email: value, source, consentText },
    });
    if (data) return { status: data.status, email: "" };
    if (response.status === 429) return { status: "too_many", email: value };
    if (response.status === 400) return { status: "invalid", email: value };
    return { status: "unavailable", email: value };
  } catch {
    return { status: "unavailable", email: value };
  }
}

"use server";

import { z } from "zod";

export type SubscribeState = { status: "idle" | "invalid" | "subscribed" | "unavailable"; email: string };

const email = z.email();

// The workshop letter sign-up. Validates on the server too; the API has no newsletter endpoint
// yet, so valid addresses are answered with "unavailable" until one exists (see the README).
export async function subscribeToLetter(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  const value = String(form.get("email") ?? "").trim();
  if (!email.safeParse(value).success) return { status: "invalid", email: value };
  return { status: "unavailable", email: value };
}

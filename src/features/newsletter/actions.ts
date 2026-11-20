"use server";

import { requestContext, serverApi } from "../../api/server";

export type UnsubscribeState = { status: "idle" | "done" | "invalid" };

// The unsubscribe button on /newsletter/unsubscribe. A button (not the link itself) does it, so
// email scanners that open links don't unsubscribe people by accident.
export async function unsubscribeFromLetter(_prev: UnsubscribeState, form: FormData): Promise<UnsubscribeState> {
  const token = String(form.get("token") ?? "");
  if (!token) return { status: "invalid" };
  try {
    const ctx = await requestContext();
    const { data } = await serverApi(ctx).POST("/v1/store/newsletter/unsubscribe", { body: { token } });
    return { status: data?.status === "unsubscribed" ? "done" : "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

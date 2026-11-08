import "server-only";
import { cookies } from "next/headers";
import { parseReferral, REF_COOKIE, type Referral } from "./referral";

// The visitor's affiliate referral (set by proxy.ts from ?ref=), for sending with the cart.
export async function readReferralCookie(): Promise<Referral | null> {
  return parseReferral((await cookies()).get(REF_COOKIE)?.value);
}

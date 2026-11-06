"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import { clientIpOf, contextHeaders, newRequestId } from "../../api/upstream";
import { env } from "../../lib/env";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { postSession, type ParsedCookie } from "../../lib/session/api-session";
import { COOKIE } from "../../lib/session/cookies";
import { readAddress, readEmail, type FieldErrors } from "../checkout/address";
import { safeNext } from "./next-path";

// Customer accounts (plan B.2). The API owns the session cookies (ADR 0012): these actions call
// its /session endpoints from the server, with the visitor's cookies and IP, and hand the
// Set-Cookie answers on to the browser unchanged.

export type FormState = { ok: boolean; errors: FieldErrors; message?: string; values?: Record<string, string> };

const MESSAGES: Partial<Record<string, string>> = {
  INVALID_CREDENTIALS: "That email and password don't match an account.",
  ALREADY_EXISTS: "There's already an account with that email. Sign in instead.",
  ACCOUNT_DISABLED: "This account is disabled. Contact us for help.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
  TOKEN_EXPIRED: "This link has expired. Ask for a new one.",
  UNAUTHENTICATED: "This link isn't valid any more. Ask for a new one.",
};

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

function messageFor(body: unknown, fallback = "Something went wrong. Please try again.") {
  const b = body as { code?: string; message?: string; details?: { fieldErrors?: Record<string, string[]> } };
  const errors: FieldErrors = {};
  for (const [k, v] of Object.entries(b?.details?.fieldErrors ?? {})) errors[k] = v[0];
  return { message: (b?.code && MESSAGES[b.code]) ?? b?.message ?? fallback, errors };
}

async function forwardHeaders(market: MarketRef) {
  const h = await headers();
  return contextHeaders({
    market,
    channel: env.CHANNEL,
    requestId: h.get("x-request-id") ?? newRequestId(),
    clientIp: clientIpOf(h),
    userAgent: h.get("user-agent"),
  });
}

async function setCookies(list: ParsedCookie[]) {
  const jar = await cookies();
  for (const c of list) jar.set(c.name, c.value, c.options);
}

// A guest's bag joins the account on sign-in (spec §5.6), using the API's merge strategy.
async function mergeGuestBag(market: MarketRef, guestToken: string | undefined, sessionCookies: ParsedCookie[]) {
  const access = sessionCookies.find((c) => c.name === COOKIE.access)?.value;
  if (!guestToken || !access) return;
  try {
    const guestCart = await unwrap(serverApi({ market, token: guestToken }).POST("/v1/store/carts"));
    if (!guestCart.lines.length) return;
    await unwrap(
      serverApi({ market, token: access }).POST("/v1/store/carts/merge", {
        body: { guestToken, guestCartId: guestCart.id },
      }),
    );
  } catch {
    // signing in matters more than the merge; the guest bag stays recoverable
  }
}

async function startSession(action: "login" | "register", body: Record<string, unknown>, next: string) {
  const ctx = await requestContext();
  const jar = await cookies();
  const guestToken = jar.get(COOKIE.guest)?.value;
  const result = await postSession("store", action, {
    cookieHeader: jar.toString(),
    headers: await forwardHeaders(ctx.market),
    body,
  });
  if (!result.ok) return { ok: false as const, ...messageFor(result.body) };
  await setCookies(result.cookies);
  await mergeGuestBag(ctx.market, guestToken, result.cookies);
  refresh();
  redirect(safeNext(next, href(ctx.market, "/account")));
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const { email, error } = readEmail(form);
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const errors: FieldErrors = {};
  if (error) errors.email = error;
  if (!password) errors.password = "required";
  if (Object.keys(errors).length) return { ok: false, errors, values: { email } };
  const result = await startSession("login", { email, password }, field(form, "next"));
  return { ...result, values: { email } };
}

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const { email, error } = readEmail(form);
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const firstName = field(form, "firstName");
  const lastName = field(form, "lastName");
  const values = { email, firstName, lastName };
  const errors: FieldErrors = {};
  if (error) errors.email = error;
  if (password.length < 8) errors.password = "passwordShort";
  if (firstName.length > 100) errors.firstName = "tooLong";
  if (lastName.length > 100) errors.lastName = "tooLong";
  if (Object.keys(errors).length) return { ok: false, errors, values };
  const result = await startSession(
    "register",
    {
      email,
      password,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      acceptsMarketing: form.get("acceptsMarketing") === "on",
    },
    field(form, "next"),
  );
  return { ...result, values };
}

export async function signOut() {
  const ctx = await requestContext();
  const jar = await cookies();
  const result = await postSession("store", "logout", {
    cookieHeader: jar.toString(),
    headers: await forwardHeaders(ctx.market),
  }).catch(() => null);
  if (result) await setCookies(result.cookies);
  // even if the API was unreachable, stop presenting the session from this browser
  if (!result?.ok) {
    jar.delete(COOKIE.access);
    jar.delete(COOKIE.refresh);
  }
  refresh();
  redirect(href(ctx.market));
}

// Always "sent", whether or not the email has an account, so the form can't be used to find
// out who shops here.
export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const { email, error } = readEmail(form);
  if (error) return { ok: false, errors: { email: error }, values: { email } };
  try {
    const ctx = await requestContext();
    await unwrap(serverApi({ market: ctx.market }).POST("/v1/store/auth/password-reset", { body: { email } }));
  } catch (err) {
    if (err instanceof ApiError && err.code === "RATE_LIMITED")
      return { ok: false, errors: {}, message: MESSAGES.RATE_LIMITED };
  }
  return { ok: true, errors: {}, values: { email } };
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = field(form, "token");
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (!token) return { ok: false, errors: {}, message: MESSAGES.UNAUTHENTICATED };
  if (password.length < 8) return { ok: false, errors: { password: "passwordShort" } };
  if (password !== form.get("confirm")) return { ok: false, errors: { confirm: "passwordMismatch" } };
  try {
    const ctx = await requestContext();
    await unwrap(
      serverApi({ market: ctx.market }).POST("/v1/store/auth/password-reset/confirm", { body: { token, password } }),
    );
    return { ok: true, errors: {} };
  } catch (err) {
    const message = err instanceof ApiError ? (MESSAGES[err.code] ?? err.message) : undefined;
    return { ok: false, errors: {}, message: message ?? "We couldn't change your password. Ask for a new link." };
  }
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    firstName: field(form, "firstName"),
    lastName: field(form, "lastName"),
    phone: field(form, "phone"),
  };
  const errors: FieldErrors = {};
  if (values.phone && !/^[+\d][\d\s().-]{5,}$/.test(values.phone)) errors.phone = "invalid";
  if (Object.keys(errors).length) return { ok: false, errors, values };
  try {
    const ctx = await requestContext();
    await unwrap(
      serverApi(ctx).PATCH("/v1/store/account", {
        body: {
          firstName: values.firstName || null,
          lastName: values.lastName || null,
          phone: values.phone || null,
          acceptsMarketing: form.get("acceptsMarketing") === "on",
        },
      }),
    );
    refresh();
    return { ok: true, errors: {}, values, message: "saved" };
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.code === "ALREADY_EXISTS"
          ? "That phone number is used by another account."
          : err.message
        : undefined;
    return { ok: false, errors: {}, values, message: message ?? "We couldn't save your details." };
  }
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const currentPassword =
    typeof form.get("currentPassword") === "string" ? (form.get("currentPassword") as string) : "";
  const newPassword = typeof form.get("newPassword") === "string" ? (form.get("newPassword") as string) : "";
  if (!currentPassword) return { ok: false, errors: { currentPassword: "required" } };
  if (newPassword.length < 8) return { ok: false, errors: { newPassword: "passwordShort" } };
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).POST("/v1/store/auth/password", { body: { currentPassword, newPassword } }));
    return { ok: true, errors: {}, message: "passwordChanged" };
  } catch (err) {
    const message = err instanceof ApiError ? (MESSAGES[err.code] ?? err.message) : undefined;
    return {
      ok: false,
      errors: err instanceof ApiError && err.code === "INVALID_CREDENTIALS" ? { currentPassword: "wrongPassword" } : {},
      message: err instanceof ApiError && err.code === "INVALID_CREDENTIALS" ? undefined : message,
    };
  }
}

// Address book: one action saves new and existing addresses (id in the form).
export async function saveAddress(_prev: FormState, form: FormData): Promise<FormState> {
  const { address, errors } = readAddress(form, "address");
  if (Object.keys(errors).length) return { ok: false, errors };
  const id = field(form, "id");
  const body = {
    ...address,
    label: field(form, "label") || null,
    isDefaultShipping: form.get("isDefaultShipping") === "on",
    isDefaultBilling: form.get("isDefaultBilling") === "on",
  };
  try {
    const ctx = await requestContext();
    const api = serverApi(ctx);
    if (id) await unwrap(api.PUT("/v1/store/account/addresses/{id}", { params: { path: { id } }, body }));
    else await unwrap(api.POST("/v1/store/account/addresses", { body }));
    refresh();
    return { ok: true, errors: {} };
  } catch (err) {
    const { message, errors: apiErrors } = messageFor(
      err instanceof ApiError ? { code: err.code, message: err.message, details: err.details } : null,
      "We couldn't save that address.",
    );
    const mapped: FieldErrors = {};
    for (const [k, v] of Object.entries(apiErrors)) mapped[`address.${k}`] = v;
    return { ok: false, errors: mapped, message };
  }
}

export async function deleteAddress(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).DELETE("/v1/store/account/addresses/{id}", { params: { path: { id } } }));
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn't delete that address." };
  }
}

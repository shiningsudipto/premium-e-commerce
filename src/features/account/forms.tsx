"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import { AddressFields } from "../checkout/checkout-flow";
import type { Address } from "../checkout/address";
import {
  changePassword,
  deleteAddress,
  register,
  requestPasswordReset,
  resetPassword,
  saveAddress,
  signIn,
  updateProfile,
  type FormState,
} from "./actions";
import { initialForm } from "./form-state";

// Forms for signing in and managing the account. They post to Server Actions, so they work
// before JavaScript loads; errors come back per field.

function useErrorText() {
  const tf = useTranslations("forms");
  return (state: FormState) => (name: string) => {
    const code = state.errors[name];
    return code ? (tf.has(`errors.${code}`) ? tf(`errors.${code}`) : code) : undefined;
  };
}

function FormMessage({ state }: { state: FormState }) {
  if (!state.message || state.ok) return null;
  return (
    <p className="notice notice--error" role="alert">
      {state.message}
    </p>
  );
}

export function SignInForm({ next, links }: { next: string; links: { register: string; forgot: string } }) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(signIn, initialForm);
  const err = useErrorText()(state);
  return (
    <form action={action} className="form-grid" noValidate data-testid="sign-in-form">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field
        label={tf("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <Field
        label={tf("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={err("password")}
      />
      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </button>
      <p className="auth__links">
        <Link href={links.forgot}>{t("forgot")}</Link>
        <Link href={links.register}>{t("createAccount")}</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next, signInHref }: { next: string; signInHref: string }) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(register, initialForm);
  const err = useErrorText()(state);
  return (
    <form action={action} className="form-grid form-grid--2" noValidate data-testid="register-form">
      <div className="span-2">
        <FormMessage state={state} />
      </div>
      <input type="hidden" name="next" value={next} />
      <Field
        label={tf("firstName")}
        name="firstName"
        autoComplete="given-name"
        defaultValue={state.values?.firstName}
        error={err("firstName")}
      />
      <Field
        label={tf("lastName")}
        name="lastName"
        autoComplete="family-name"
        defaultValue={state.values?.lastName}
        error={err("lastName")}
      />
      <Field
        className="span-2"
        label={tf("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <Field
        className="span-2"
        label={tf("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={tf("passwordHint")}
        error={err("password")}
      />
      <label className="facet__option span-2">
        <input type="checkbox" name="acceptsMarketing" />
        {t("acceptsMarketing")}
      </label>
      <button className="btn btn--primary span-2" type="submit" disabled={pending}>
        {pending ? t("creating") : t("createAccount")}
      </button>
      <p className="auth__links span-2">
        {t("haveAccount")} <Link href={signInHref}>{t("signIn")}</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ signInHref }: { signInHref: string }) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(requestPasswordReset, initialForm);
  const err = useErrorText()(state);
  if (state.ok) {
    return (
      <div className="form-grid" role="status">
        <p>{t("resetSent", { email: state.values?.email ?? "" })}</p>
        <Link className="btn btn--secondary" href={signInHref}>
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="form-grid" noValidate>
      <FormMessage state={state} />
      <Field
        label={tf("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <button className="btn btn--primary" type="submit" disabled={pending}>
        {t("sendLink")}
      </button>
      <p className="auth__links">
        <Link href={signInHref}>{t("backToSignIn")}</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token, signInHref }: { token: string; signInHref: string }) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(resetPassword, initialForm);
  const err = useErrorText()(state);
  if (state.ok) {
    return (
      <div className="form-grid" role="status">
        <p>{t("passwordReset")}</p>
        <Link className="btn btn--primary" href={signInHref}>
          {t("signIn")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="form-grid" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field
        label={tf("newPassword")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={tf("passwordHint")}
        error={err("password")}
      />
      <Field
        label={tf("confirmPassword")}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={err("confirm")}
      />
      <button className="btn btn--primary" type="submit" disabled={pending}>
        {t("setPassword")}
      </button>
    </form>
  );
}

type Profile = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acceptsMarketing: boolean;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(updateProfile, initialForm);
  const err = useErrorText()(state);
  return (
    <form action={action} className="form-grid form-grid--2" noValidate>
      <div className="span-2">
        <FormMessage state={state} />
        {state.ok && (
          <p className="muted" role="status">
            {t("saved")}
          </p>
        )}
      </div>
      <Field
        label={tf("firstName")}
        name="firstName"
        autoComplete="given-name"
        defaultValue={state.values?.firstName ?? profile.firstName ?? ""}
        error={err("firstName")}
      />
      <Field
        label={tf("lastName")}
        name="lastName"
        autoComplete="family-name"
        defaultValue={state.values?.lastName ?? profile.lastName ?? ""}
        error={err("lastName")}
      />
      <Field
        label={tf("email")}
        name="emailShown"
        type="email"
        value={profile.email ?? ""}
        readOnly
        hint={t("emailFixed")}
      />
      <Field
        label={tf("phone")}
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={state.values?.phone ?? profile.phone ?? ""}
        error={err("phone")}
      />
      <label className="facet__option span-2">
        <input type="checkbox" name="acceptsMarketing" defaultChecked={profile.acceptsMarketing} />
        {t("acceptsMarketing")}
      </label>
      <div className="span-2">
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(changePassword, initialForm);
  const err = useErrorText()(state);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="form-grid form-grid--2" noValidate>
      <div className="span-2">
        <FormMessage state={state} />
        {state.ok && (
          <p className="muted" role="status">
            {t("passwordChanged")}
          </p>
        )}
      </div>
      <Field
        label={tf("currentPassword")}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={err("currentPassword")}
      />
      <Field
        label={tf("newPassword")}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={tf("passwordHint")}
        error={err("newPassword")}
      />
      <div className="span-2">
        <button className="btn btn--secondary" type="submit" disabled={pending}>
          {t("changePassword")}
        </button>
      </div>
    </form>
  );
}

export type SavedAddress = Address & {
  id: string;
  label: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

// Add or edit an address in place; closes itself when saved.
export function AddressEditor({
  address,
  countries,
  onDone,
}: {
  address?: SavedAddress;
  countries: string[];
  onDone: () => void;
}) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState(saveAddress, initialForm);
  const err = useErrorText()(state);
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form action={action} className="form-grid box" noValidate>
      <FormMessage state={state} />
      {address && <input type="hidden" name="id" value={address.id} />}
      <Field
        label={tf("addressLabel")}
        name="label"
        defaultValue={address?.label ?? ""}
        hint={tf("addressLabelHint")}
      />
      <AddressFields
        prefix="address"
        legend={address ? t("editAddress") : t("addAddress")}
        value={address ?? null}
        countries={countries}
        err={err}
      />
      <label className="facet__option">
        <input type="checkbox" name="isDefaultShipping" defaultChecked={address?.isDefaultShipping} />
        {t("defaultShipping")}
      </label>
      <label className="facet__option">
        <input type="checkbox" name="isDefaultBilling" defaultChecked={address?.isDefaultBilling} />
        {t("defaultBilling")}
      </label>
      <div className="buy-row">
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? t("saving") : t("saveAddress")}
        </button>
        <button className="btn btn--secondary" type="button" onClick={onDone}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

export function AddressBook({ addresses, countries }: { addresses: SavedAddress[]; countries: string[] }) {
  const t = useTranslations("account");
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length ? null : "new");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(undefined, { type: "region" }) : null;

  return (
    <div className="form-grid">
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <ul className="card-list card-list--2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="span-2">
              <AddressEditor address={a} countries={countries} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={a.id} className="box">
              <p>
                <strong>{a.label || `${a.firstName} ${a.lastName}`}</strong>
                {a.isDefaultShipping && <span className="badge"> {t("defaultShippingBadge")}</span>}
                {a.isDefaultBilling && <span className="badge"> {t("defaultBillingBadge")}</span>}
              </p>
              <address className="muted" style={{ fontStyle: "normal" }}>
                {a.firstName} {a.lastName}
                <br />
                {a.line1}
                {a.line2 && (
                  <>
                    <br />
                    {a.line2}
                  </>
                )}
                <br />
                {[a.city, a.postalCode].filter(Boolean).join(" ")}
                {a.region ? `, ${a.region}` : ""}
                <br />
                {names?.of(a.country) ?? a.country}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </address>
              <p className="box__actions">
                <button type="button" className="link-btn" onClick={() => setEditing(a.id)}>
                  {t("edit")}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      setError("");
                      const result = await deleteAddress(a.id);
                      if (!result.ok) setError(result.message ?? "");
                    })
                  }
                  aria-label={t("deleteAddress", { name: a.label || `${a.firstName} ${a.lastName}` })}
                >
                  {t("delete")}
                </button>
              </p>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <AddressEditor countries={countries} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <button type="button" className="btn btn--secondary" onClick={() => setEditing("new")}>
            {t("addAddress")}
          </button>
        </div>
      )}
    </div>
  );
}

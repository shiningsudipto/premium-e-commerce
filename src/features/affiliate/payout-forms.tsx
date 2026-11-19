"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import { initialForm } from "../account/form-state";
import {
  addPayoutMethod,
  makeDefaultPayoutMethod,
  removePayoutMethod,
  renamePayoutMethod,
  requestPayout,
} from "./actions";
import { FormMessage, useErrorText } from "./forms";
import { BD_WALLETS, PAYOUT_METHOD_TYPES, type PayoutMethodType } from "./payout-method-input";

// Payout method and payout request forms. They post to Server Actions, so they work before
// JavaScript loads; the add form switches between wallet and bank fields with CSS (:has), not
// state, for the same reason.

export function PayoutMethodForm({ hasMethods }: { hasMethods: boolean }) {
  const t = useTranslations("affiliate.methods");
  const [state, action, pending] = useActionState(addPayoutMethod, initialForm);
  const err = useErrorText(state);
  const v = state.values ?? {};
  const type: PayoutMethodType = v.type === "bank" ? "bank" : "mobile_wallet";

  return (
    <form action={action} className="form-grid affiliate-method-form" noValidate data-testid="payout-method-form">
      <FormMessage state={state} />
      {state.ok && (
        <p className="affiliate-notice" role="status">
          {t("added")}
        </p>
      )}
      <fieldset className="affiliate-choice">
        <legend>{t("type")}</legend>
        {PAYOUT_METHOD_TYPES.map((value) => (
          <label key={value} className="facet__option">
            <input type="radio" name="type" value={value} defaultChecked={type === value} />
            <span>
              {t(`types.${value}.label`)}
              <span className="field__hint"> {t(`types.${value}.hint`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="form-grid affiliate-method-form__wallet">
        <Field label={t("provider")} name="provider" error={err("provider")}>
          <select
            className="select"
            id="f-provider"
            name="provider"
            required
            defaultValue={v.provider ?? ""}
            aria-invalid={err("provider") ? true : undefined}
            aria-describedby={err("provider") ? "f-provider-error" : undefined}
          >
            <option value="" disabled>
              {t("providerPick")}
            </option>
            {BD_WALLETS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={t("walletNumber")}
          name="walletNumber"
          hint={t("walletNumberHint")}
          error={err("walletNumber")}
          required
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={20}
          defaultValue={v.walletNumber}
        />
      </div>
      <div className="form-grid affiliate-method-form__bank">
        <Field
          label={t("bankName")}
          name="bankName"
          hint={t("bankNameHint")}
          error={err("bankName")}
          required
          maxLength={60}
          defaultValue={v.bankName}
        />
        <Field
          label={t("accountNumber")}
          name="accountNumber"
          error={err("accountNumber")}
          required
          inputMode="numeric"
          autoComplete="off"
          maxLength={30}
          defaultValue={v.accountNumber}
        />
        <Field
          label={t("optional", { label: t("branch") })}
          name="branch"
          error={err("branch")}
          maxLength={100}
          defaultValue={v.branch}
        />
        <Field
          label={t("optional", { label: t("routingNumber") })}
          name="routingNumber"
          hint={t("routingNumberHint")}
          error={err("routingNumber")}
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          defaultValue={v.routingNumber}
        />
      </div>
      <Field
        label={t("accountName")}
        name="accountName"
        hint={t("accountNameHint")}
        error={err("accountName")}
        required
        autoComplete="name"
        maxLength={100}
        defaultValue={v.accountName}
      />
      {hasMethods && (
        <label className="facet__option">
          <input type="checkbox" name="isDefault" defaultChecked />
          {t("makeDefault")}
        </label>
      )}
      {!hasMethods && <input type="hidden" name="isDefault" value="on" />}
      <p className="field__hint">{t("privacy")}</p>
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? t("saving") : t("add")}
        </button>
      </div>
    </form>
  );
}

type Method = { id: string; type: PayoutMethodType; label: string; masked: string; isDefault: boolean };

// Per-method actions: make default, change the provider / bank name, remove (with a confirm step
// in a disclosure, so it works without JavaScript).
export function PayoutMethodActions({ method, name }: { method: Method; name: string }) {
  const t = useTranslations("affiliate.methods");
  const [defState, defAction, defPending] = useActionState(makeDefaultPayoutMethod, initialForm);
  const [editState, editAction, editPending] = useActionState(renamePayoutMethod, initialForm);
  const [delState, delAction, delPending] = useActionState(removePayoutMethod, initialForm);
  const editErr = useErrorText(editState);
  const fieldId = `f-label-${method.id}`;

  return (
    <div className="affiliate-method__actions">
      {!method.isDefault && (
        <form action={defAction}>
          <input type="hidden" name="id" value={method.id} />
          <button className="btn btn--secondary" type="submit" disabled={defPending}>
            {t("setDefault")}
            <span className="sr-only">: {name}</span>
          </button>
          <FormMessage state={defState} />
        </form>
      )}
      <details className="affiliate-disclosure">
        <summary>
          {t("edit")}
          <span className="sr-only">: {name}</span>
        </summary>
        <form action={editAction} className="form-grid" noValidate>
          <FormMessage state={editState} />
          {editState.ok && (
            <p className="affiliate-notice" role="status">
              {t("saved")}
            </p>
          )}
          <input type="hidden" name="id" value={method.id} />
          <input type="hidden" name="type" value={method.type} />
          {method.type === "mobile_wallet" ? (
            <Field label={t("provider")} name="provider" id={fieldId} error={editErr("label")}>
              <select
                className="select"
                id={fieldId}
                name="provider"
                defaultValue={BD_WALLETS.some((w) => w === method.label) ? method.label : ""}
                aria-invalid={editErr("label") ? true : undefined}
                aria-describedby={editErr("label") ? `${fieldId}-error` : undefined}
              >
                <option value="" disabled>
                  {t("providerPick")}
                </option>
                {BD_WALLETS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field
              label={t("bankName")}
              name="bankName"
              id={fieldId}
              error={editErr("label")}
              required
              maxLength={60}
              defaultValue={method.label}
            />
          )}
          <p className="field__hint">{t("editNote")}</p>
          <div>
            <button className="btn btn--primary" type="submit" disabled={editPending}>
              {t("save")}
            </button>
          </div>
        </form>
      </details>
      <details className="affiliate-disclosure">
        <summary>
          {t("remove")}
          <span className="sr-only">: {name}</span>
        </summary>
        <form action={delAction} className="affiliate-confirm">
          <FormMessage state={delState} />
          <p>{method.isDefault ? t("removeDefaultConfirm", { name }) : t("removeConfirm", { name })}</p>
          <input type="hidden" name="id" value={method.id} />
          <button className="btn btn--secondary affiliate-danger" type="submit" disabled={delPending}>
            {t("removeYes")}
          </button>
        </form>
      </details>
    </div>
  );
}

export function PayoutRequestForm({ amount }: { amount: string }) {
  const t = useTranslations("affiliate.request");
  const [state, action, pending] = useActionState(requestPayout, initialForm);
  return (
    <form action={action} className="affiliate-request__form" data-testid="payout-request-form">
      <FormMessage state={state} />
      {state.ok && (
        <p className="affiliate-notice" role="status">
          {t("requested")}
        </p>
      )}
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? t("sending") : t("submit", { amount })}
        </button>
      </div>
    </form>
  );
}

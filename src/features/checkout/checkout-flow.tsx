"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { artFor } from "../../components/storefront/art";
import { Field } from "../../components/storefront/field";
import { Media } from "../../components/storefront/media";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { BagSummary } from "../cart/bag-view";
import { PromoCodes } from "../cart/promo-codes";
import { applyPromoCode, removePromoCode } from "./promo-actions";
import type { Bag } from "../cart/types";
import { chooseShipping, placeOrder, saveDetails, type DetailsState } from "./actions";
import { formatAddress, isAddress, type Address } from "./address";

type PaymentMethod = { key: string; label: string; payLater: boolean };

// One-page checkout (plan B.2): contact and delivery → delivery method → payment and notes.
// Each finished step collapses to a summary with "Change"; the order button only appears
// once the API says the cart is ready.
export function CheckoutFlow({
  initial,
  paymentMethods,
  market,
  countries,
  prefill,
}: {
  initial: Bag;
  paymentMethods: PaymentMethod[];
  market: MarketRef;
  countries: string[];
  prefill: { email?: string | null; address?: Address | null };
}) {
  const t = useTranslations("checkout");
  const [cart, setCart] = useState(initial);
  const shipping = isAddress(cart.shippingAddress) ? cart.shippingAddress : null;
  const detailsDone = !!cart.email && !!shipping;
  const [editing, setEditing] = useState(!detailsDone);
  const shippingDone = !!cart.selectedShippingRateId;

  return (
    <div className="checkout pt-container">
      <div className="checkout__main">
        <section className="step" data-state={detailsDone && !editing ? "done" : "open"} aria-labelledby="step-details">
          <div className="step__head">
            <h2 className="step__title" id="step-details">
              <span className="step__num">1</span> {t("details")}
            </h2>
            {detailsDone && !editing && (
              <button type="button" className="link-btn" onClick={() => setEditing(true)}>
                {t("change")}
              </button>
            )}
          </div>
          {detailsDone && !editing ? (
            <p className="step__summary" data-testid="details-summary">
              {cart.email}
              <br />
              {formatAddress(shipping)}
            </p>
          ) : (
            <DetailsForm
              cart={cart}
              countries={countries}
              prefill={prefill}
              onSaved={(next) => {
                setCart(next);
                setEditing(false);
              }}
            />
          )}
        </section>

        <section className="step" data-state={shippingDone ? "done" : "open"} aria-labelledby="step-shipping">
          <div className="step__head">
            <h2 className="step__title" id="step-shipping">
              <span className="step__num">2</span> {t("delivery")}
            </h2>
          </div>
          {detailsDone && !editing ? (
            <ShippingStep cart={cart} market={market} onCart={setCart} />
          ) : (
            <p className="step__summary">{t("deliveryLater")}</p>
          )}
        </section>

        <section className="step" aria-labelledby="step-payment">
          <div className="step__head">
            <h2 className="step__title" id="step-payment">
              <span className="step__num">3</span> {t("payment")}
            </h2>
          </div>
          {detailsDone && !editing && shippingDone ? (
            <PaymentStep cart={cart} market={market} methods={paymentMethods} />
          ) : (
            <p className="step__summary">{t("paymentLater")}</p>
          )}
        </section>
      </div>

      <aside className="checkout__aside" aria-label={t("orderSummary")}>
        <h2 className="h3">{t("orderSummary")}</h2>
        <ul className="mini-lines">
          {cart.lines.map((line) => (
            <li className="mini-line" key={line.id}>
              <div className="mini-line__media">
                <span className="mini-line__qty" aria-label={t("quantity", { count: line.quantity })}>
                  {line.quantity}
                </span>
                <Media image={line.image} art={artFor(line.title)} tone="mid" alt="" decorative sizes="56px" />
              </div>
              <div>
                <p>{line.title}</p>
                {line.variantTitle && <p className="muted">{line.variantTitle}</p>}
              </div>
              <span className="price">{formatMoney(line.totalMinor, cart.currency, market.locale)}</span>
            </li>
          ))}
        </ul>
        <PromoCodes
          cart={cart}
          market={market}
          onApply={async (code) => {
            const result = await applyPromoCode(cart.id, code);
            if (result.ok) setCart(result.cart);
            return result.ok ? null : result.message;
          }}
          onRemove={async (code) => {
            const result = await removePromoCode(cart.id, code);
            if (result.ok) setCart(result.cart);
            return result.ok ? null : result.message;
          }}
        />
        <BagSummary cart={cart} market={market} final />
      </aside>
    </div>
  );
}

function DetailsForm({
  cart,
  countries,
  prefill,
  onSaved,
}: {
  cart: Bag;
  countries: string[];
  prefill: { email?: string | null; address?: Address | null };
  onSaved: (cart: Bag) => void;
}) {
  const t = useTranslations("checkout");
  const tf = useTranslations("forms");
  const [state, action, pending] = useActionState<DetailsState, FormData>(saveDetails.bind(null, cart.id), {
    ok: false,
    errors: {},
  });
  const [billingSame, setBillingSame] = useState(true);

  useEffect(() => {
    if (state.ok && state.cart) onSaved(state.cart);
    // only when a save finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const address = (isAddress(cart.shippingAddress) ? cart.shippingAddress : prefill.address) ?? null;
  const billing = isAddress(cart.billingAddress) ? cart.billingAddress : address;
  const err = (name: string) => {
    const code = state.errors[name];
    return code ? (tf.has(`errors.${code}`) ? tf(`errors.${code}`) : code) : undefined;
  };

  return (
    <form action={action} className="form-grid" noValidate data-testid="details-form">
      {state.message && (
        <p className="notice notice--error" role="alert">
          {state.message}
        </p>
      )}
      <Field
        label={tf("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={cart.email ?? prefill.email ?? ""}
        error={err("email")}
        hint={t("emailHint")}
      />
      <AddressFields prefix="shipping" legend={t("deliveryAddress")} value={address} countries={countries} err={err} />
      <label className="facet__option">
        <input
          type="checkbox"
          name="billingSame"
          value="on"
          checked={billingSame}
          onChange={(e) => setBillingSame(e.target.checked)}
        />
        {t("billingSame")}
      </label>
      {!billingSame && (
        <>
          <input type="hidden" name="billingSame" value="off" />
          <AddressFields
            prefix="billing"
            legend={t("billingAddress")}
            value={billing}
            countries={countries}
            err={err}
          />
        </>
      )}
      <label className="facet__option">
        <input type="checkbox" name="acceptsMarketing" />
        {t("acceptsMarketing")}
      </label>
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending} data-testid="save-details">
          {pending ? t("saving") : t("continueToDelivery")}
        </button>
      </div>
    </form>
  );
}

// When "same as delivery" is unticked the checkbox sends nothing; the hidden "off" says so.
export function AddressFields({
  prefix,
  legend,
  value,
  countries,
  err,
}: {
  prefix: string;
  legend: string;
  value: Partial<Address> | null;
  countries: string[];
  err: (name: string) => string | undefined;
}) {
  const tf = useTranslations("forms");
  const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(undefined, { type: "region" }) : null;
  const n = (key: keyof Address) => `${prefix}.${key}`;
  const country = value?.country ?? countries[0] ?? "";
  return (
    <fieldset className="form-grid form-grid--2" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="h3 span-2" style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-lg)" }}>
        {legend}
      </legend>
      <Field
        label={tf("firstName")}
        name={n("firstName")}
        autoComplete={`section-${prefix} given-name`}
        required
        defaultValue={value?.firstName ?? ""}
        error={err(n("firstName"))}
      />
      <Field
        label={tf("lastName")}
        name={n("lastName")}
        autoComplete={`section-${prefix} family-name`}
        required
        defaultValue={value?.lastName ?? ""}
        error={err(n("lastName"))}
      />
      <Field
        className="span-2"
        label={tf("line1")}
        name={n("line1")}
        autoComplete={`section-${prefix} address-line1`}
        required
        defaultValue={value?.line1 ?? ""}
        error={err(n("line1"))}
      />
      <Field
        className="span-2"
        label={tf("line2")}
        name={n("line2")}
        autoComplete={`section-${prefix} address-line2`}
        defaultValue={value?.line2 ?? ""}
        error={err(n("line2"))}
      />
      <Field
        label={tf("city")}
        name={n("city")}
        autoComplete={`section-${prefix} address-level2`}
        required
        defaultValue={value?.city ?? ""}
        error={err(n("city"))}
      />
      <Field
        label={tf("postalCode")}
        name={n("postalCode")}
        autoComplete={`section-${prefix} postal-code`}
        defaultValue={value?.postalCode ?? ""}
        error={err(n("postalCode"))}
      />
      <Field
        label={tf("region")}
        name={n("region")}
        autoComplete={`section-${prefix} address-level1`}
        defaultValue={value?.region ?? ""}
        error={err(n("region"))}
      />
      <Field label={tf("country")} name={n("country")} error={err(n("country"))}>
        <select
          className="select input"
          id={`f-${prefix}-country`}
          name={n("country")}
          defaultValue={country}
          autoComplete={`section-${prefix} country`}
        >
          {(countries.includes(country) || !country ? countries : [country, ...countries]).map((c) => (
            <option key={c} value={c}>
              {names?.of(c) ?? c}
            </option>
          ))}
        </select>
      </Field>
      <Field
        className="span-2"
        label={tf("phone")}
        name={n("phone")}
        type="tel"
        autoComplete={`section-${prefix} tel`}
        defaultValue={value?.phone ?? ""}
        error={err(n("phone"))}
        hint={tf("phoneHint")}
      />
    </fieldset>
  );
}

function ShippingStep({ cart, market, onCart }: { cart: Bag; market: MarketRef; onCart: (cart: Bag) => void }) {
  const t = useTranslations("checkout");
  const [pending, start] = useTransition();
  // the choice shows at once; it settles to the API's answer (or back, with a message)
  const [selected, select] = useOptimistic(cart.selectedShippingRateId);
  const [error, setError] = useState("");
  if (!cart.shippingRates.length) {
    return (
      <p className="notice notice--error" role="alert">
        {t("noRates")}
      </p>
    );
  }
  const pick = (rateId: string) =>
    start(async () => {
      setError("");
      select(rateId);
      const result = await chooseShipping(cart.id, rateId);
      if (result.ok) onCart(result.cart);
      else setError(result.message);
    });
  return (
    <div className="radio-cards" role="radiogroup" aria-label={t("delivery")} aria-busy={pending}>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {cart.shippingRates.map((rate) => (
        <label className="radio-card" key={rate.id}>
          <input
            type="radio"
            name="shippingRate"
            value={rate.id}
            checked={selected === rate.id}
            onChange={() => pick(rate.id)}
          />
          <span className="radio-card__text">
            <span>{rate.name}</span>
            {rate.minDeliveryDays != null && rate.maxDeliveryDays != null && (
              <span className="radio-card__sub">
                {t("deliveryDays", { min: rate.minDeliveryDays, max: rate.maxDeliveryDays })}
              </span>
            )}
          </span>
          <span className="radio-card__price">
            {rate.amountMinor ? formatMoney(rate.amountMinor, cart.currency, market.locale) : t("free")}
          </span>
        </label>
      ))}
    </div>
  );
}

function PaymentStep({ cart, market, methods }: { cart: Bag; market: MarketRef; methods: PaymentMethod[] }) {
  const t = useTranslations("checkout");
  const [method, setMethod] = useState(methods[0]?.key ?? "");
  const [notes, setNotes] = useState(cart.notes ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  // one key per attempt: retries after a timeout reuse it, so the order is placed once
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  if (!methods.length) {
    return (
      <p className="notice notice--error" role="alert">
        {t("noPayment")}
      </p>
    );
  }

  const submit = () =>
    start(async () => {
      setError("");
      const result = await placeOrder({ cartId: cart.id, paymentProvider: method, notes, idempotencyKey });
      // success redirects to the confirmation page
      if (result && !result.ok) setError(result.message);
    });

  return (
    <div className="form-grid">
      <div className="radio-cards" role="radiogroup" aria-label={t("payment")}>
        {methods.map((m) => (
          <label className="radio-card" key={m.key}>
            <input
              type="radio"
              name="payment"
              value={m.key}
              checked={method === m.key}
              onChange={() => setMethod(m.key)}
            />
            <span className="radio-card__text">
              <span>{m.label}</span>
              {m.payLater && <span className="radio-card__sub">{t("payLater")}</span>}
            </span>
          </label>
        ))}
      </div>
      <Field label={t("notes")} name="notes" hint={t("notesHint")}>
        <textarea
          id="f-notes"
          name="notes"
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-describedby="f-notes-hint"
        />
      </Field>
      {cart.issues.map((issue) => (
        <p key={issue.code} className="notice notice--error">
          {issue.message}
        </p>
      ))}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn btn--primary"
        type="button"
        onClick={submit}
        disabled={pending || !cart.readyForCheckout || !method}
        data-testid="place-order"
      >
        {pending
          ? t("placing")
          : t("placeOrder", { total: formatMoney(cart.totalMinor, cart.currency, market.locale) })}
      </button>
      <p className="summary__note">{t("terms")}</p>
    </div>
  );
}

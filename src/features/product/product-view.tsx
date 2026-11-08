"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { artFor } from "../../components/storefront/art";
import { Media } from "../../components/storefront/media";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { useBag } from "../cart/bag-provider";
import { bagErrorMessage, useAddToBagMutation } from "../cart/cart-api";
import {
  choose,
  initialVariant,
  orderMedia,
  selectionOf,
  valueState,
  withLiveStock,
  type Stock,
  type VariantLike,
} from "./variants";

type Price = { currency: string; amountMinor: number; compareAtMinor: number | null } | null;
type Variant = VariantLike & { title: string; sku: string; price: Price };
type MediaItem = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  variantIds: string[];
};
type LiveStock = { variantId: string; availableForSale: boolean; stock: Stock }[];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_QTY = 10;

const noSubscribe = () => () => {};
const linkedVariant = () => new URLSearchParams(window.location.search).get("variant");

// The interactive half of the product page: gallery, options, live stock, quantity and add to
// bag. The product itself comes from the cached server render; stock is fetched here, per
// visit, so the page can stay cached (plan B.2: "client-fetched stock badge").
export function ProductView({
  product,
  market,
  children,
}: {
  product: {
    handle: string;
    title: string;
    options: { name: string; values: string[] }[];
    variants: Variant[];
    media: MediaItem[];
  };
  market: MarketRef;
  // server-rendered details shown under the buy button
  children?: ReactNode;
}) {
  const t = useTranslations("product");
  const { openBag } = useBag();
  const [live, setLive] = useState<LiveStock | null>(null);
  const variants = useMemo(() => withLiveStock(product.variants, live), [product.variants, live]);
  // a shared link can name the variant (?variant=…). It is read in the browser after hydration
  // (the server snapshot is null), so the page itself stays cacheable.
  const linked = useSyncExternalStore(noSubscribe, linkedVariant, () => null);
  const [picked, setVariantId] = useState<string | undefined>(undefined);
  const variantId = picked ?? initialVariant(product.variants, linked)?.id;
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const selection = selectionOf(variant);
  const [quantity, setQuantity] = useState(1);
  const [addToBag, { isLoading: pending }] = useAddToBagMutation();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/v1/store/products/${encodeURIComponent(product.handle)}/availability`, {
      headers: { "x-market": market.market, "x-locale": market.locale },
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => (r.ok ? (r.json() as Promise<LiveStock>) : null))
      .then((data) => data && setLive(data))
      .catch(() => {
        // keep the cached availability
      });
    return () => controller.abort();
  }, [product.handle, market.market, market.locale]);

  const pick = (name: string, value: string) => {
    const next = choose(variants, selection, name, value);
    if (!next) return;
    setVariantId(next.id);
    setMessage(null);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.id);
    window.history.replaceState(window.history.state, "", url);
  };

  const add = async () => {
    if (!variant) return;
    const result = await addToBag({ variantId: variant.id, quantity });
    if (result.error) setMessage({ error: true, text: bagErrorMessage(result.error) });
    else {
      setMessage({ error: false, text: t("addedMessage", { title: product.title }) });
      openBag();
    }
  };

  const price = variant?.price;
  const onSale = !!price?.compareAtMinor && price.compareAtMinor > price.amountMinor;
  const canBuy = !!variant?.availableForSale && !!price;
  const realOptions = product.options.filter((o) => !(o.values.length === 1 && o.values[0] === "Default"));

  return (
    <div className="pdp__grid">
      <Gallery key={variant?.id} title={product.title} media={orderMedia(product.media, variant?.id)} />
      <div className="pdp__info">
        <div>
          <h1 className="pdp__title">{product.title}</h1>
          <p className={cn("pdp__price", onSale && "pdp__price--sale")} data-testid="pdp-price">
            {price ? (
              <>
                <span>{formatMoney(price.amountMinor, price.currency, market.locale)}</span>
                {onSale && (
                  <s>
                    <span className="sr-only">{t("wasPrice")} </span>
                    {formatMoney(price.compareAtMinor!, price.currency, market.locale)}
                  </s>
                )}
              </>
            ) : (
              <span className="muted">{t("notSoldHere")}</span>
            )}
          </p>
        </div>

        {realOptions.map((option) => (
          <fieldset className="opt-group" key={option.name}>
            <legend>
              {option.name}: <strong>{selection[option.name]}</strong>
            </legend>
            <div className="opt-values" role="radiogroup" aria-label={option.name}>
              {option.values.map((value) => {
                const state = valueState(variants, selection, option.name, value);
                const checked = selection[option.name] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    className="opt-btn"
                    aria-checked={checked}
                    data-unavailable={state !== "available"}
                    aria-label={
                      state === "available" ? value : `${value} (${t(state === "missing" ? "notMade" : "soldOut")})`
                    }
                    onClick={() => pick(option.name, value)}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <StockBadge stock={live ? variant?.stock : undefined} />

        <div className="buy-row">
          <div className="qty" role="group" aria-label={t("quantity")}>
            <button
              type="button"
              aria-label={t("decrease")}
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
            >
              −
            </button>
            <output aria-live="polite">{quantity}</output>
            <button
              type="button"
              aria-label={t("increase")}
              disabled={quantity >= MAX_QTY}
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>
          <button
            className="btn btn--primary"
            type="button"
            disabled={!canBuy || pending}
            onClick={add}
            data-testid="add-to-bag"
          >
            {pending ? t("adding") : canBuy ? t("addToBag") : t("soldOut")}
          </button>
        </div>
        <p
          className={cn("muted", message?.error && "field__error")}
          aria-live="polite"
          role={message?.error ? "alert" : undefined}
        >
          {message?.text}
        </p>
        {variant?.sku && (
          <p className="pdp__meta">
            <span>
              {t("sku")}: {variant.sku}
            </span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function StockBadge({ stock }: { stock: Stock | undefined }) {
  const t = useTranslations("product.stock");
  if (!stock) {
    return (
      <p className="stock stock--loading" role="status">
        {t("checking")}
      </p>
    );
  }
  const tone =
    stock === "low_stock" ? "stock--low" : stock === "out_of_stock" || stock === "unavailable" ? "stock--out" : "";
  return (
    <p className={cn("stock", tone)} role="status" data-testid="stock-badge">
      {t(stock)}
    </p>
  );
}

function Gallery({ title, media }: { title: string; media: MediaItem[] }) {
  const t = useTranslations("product");
  const [index, setIndex] = useState(0);
  const art = artFor(title);
  const shots = media.length ? media : [null];
  const current = shots[index] ?? shots[0];
  return (
    <div className="gallery">
      <div className="gallery__main">
        <Media
          image={current}
          art={art}
          tone="mid"
          alt={current?.alt ?? t("imageAlt", { title, n: index + 1 })}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
      </div>
      {shots.length > 1 && (
        <div className="gallery__thumbs" role="group" aria-label={t("images")}>
          {shots.map((m, i) => (
            <button
              key={m?.id ?? i}
              className={cn("thumb", i === index && "is-active")}
              type="button"
              aria-pressed={i === index}
              aria-label={t("showImage", { n: i + 1, total: shots.length })}
              onClick={() => setIndex(i)}
            >
              <Media image={m} art={art} tone="mid" alt="" decorative sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

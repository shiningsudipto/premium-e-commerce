"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { artFor } from "../../components/storefront/art";
import { Media } from "../../components/storefront/media";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { useBag } from "../cart/bag-provider";
import { bagErrorMessage, useAddToBagMutation } from "../cart/cart-api";
import {
  useCreateWishlistMutation,
  useDeleteWishlistMutation,
  useGetWishlistQuery,
  useGetWishlistsQuery,
  useRemoveWishlistItemMutation,
  useUpdateWishlistMutation,
  type Wishlist,
  type WishlistItem,
} from "./wishlist-api";

// The customer's wishlists in the account: switch between lists, create, rename, share (a
// read-only link) or delete them, and move pieces to the bag or remove them.
export function WishlistsView({ market }: { market: MarketRef }) {
  const t = useTranslations("wishlist");
  const { data: lists, isLoading, isError } = useGetWishlistsQuery();
  const [picked, setPicked] = useState<string | null>(null);
  const current = lists?.find((l) => l.id === picked) ?? lists?.[0];

  if (isLoading) return <p className="muted">{t("loading")}</p>;
  if (isError || !lists)
    return (
      <p className="notice notice--error" role="alert">
        {t("loadFailed")}
      </p>
    );

  return (
    <div className="wishlists">
      {lists.length > 0 && (
        <div className="wishlist-tabs" role="group" aria-label={t("lists")}>
          {lists.map((l) => (
            <button key={l.id} type="button" aria-pressed={l.id === current?.id} onClick={() => setPicked(l.id)}>
              {l.name} <span className="muted">({l.itemCount})</span>
            </button>
          ))}
        </div>
      )}
      {current ? (
        <ListPanel key={current.id} id={current.id} market={market} onDeleted={() => setPicked(null)} />
      ) : (
        <div className="no-results">
          <h2 className="h3">{t("emptyTitle")}</h2>
          <p className="muted">{t("emptyBody")}</p>
          <Link className="btn btn--primary" href={href(market, "/products")}>
            {t("browse")}
          </Link>
        </div>
      )}
      <CreateList onCreated={setPicked} />
    </div>
  );
}

function CreateList({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useTranslations("wishlist");
  const [create, { isLoading }] = useCreateWishlistMutation();
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return setError(t("nameRequired"));
    const result = await create({ name });
    if (result.error) return setError(apiMessage(result.error) ?? t("failed"));
    setError("");
    form.reset();
    onCreated(result.data.id);
  };

  return (
    <form className="inline-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="new-wishlist">{t("newList")}</label>
        <input
          id="new-wishlist"
          className="input"
          name="name"
          maxLength={60}
          placeholder={t("newListPlaceholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "new-wishlist-error" : undefined}
        />
        {error && (
          <span className="field__error" id="new-wishlist-error">
            {error}
          </span>
        )}
      </div>
      <button className="btn btn--secondary" type="submit" disabled={isLoading}>
        {t("create")}
      </button>
    </form>
  );
}

function ListPanel({ id, market, onDeleted }: { id: string; market: MarketRef; onDeleted: () => void }) {
  const t = useTranslations("wishlist");
  const { data: list, isLoading, isError } = useGetWishlistQuery(id);

  if (isLoading) return <p className="muted">{t("loading")}</p>;
  if (isError || !list)
    return (
      <p className="notice notice--error" role="alert">
        {t("loadFailed")}
      </p>
    );

  return (
    <section className="wishlists" aria-labelledby={`wl-${id}`}>
      <ListHead list={list} market={market} onDeleted={onDeleted} />
      {list.items.length === 0 ? (
        <p className="muted">{t("listEmpty")}</p>
      ) : (
        <ul className="wish-items">
          {list.items.map((item) => (
            <Item key={item.id} item={item} listId={list.id} market={market} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ListHead({ list, market, onDeleted }: { list: Wishlist; market: MarketRef; onDeleted: () => void }) {
  const t = useTranslations("wishlist");
  const [update, { isLoading: saving }] = useUpdateWishlistMutation();
  const [remove, { isLoading: deleting }] = useDeleteWishlistMutation();
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const shareUrl =
    list.shareToken && typeof window !== "undefined"
      ? `${window.location.origin}${href(market, `/wishlists/shared/${list.shareToken}`)}`
      : null;

  const rename = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    const result = await update({ id: list.id, name });
    setStatus(result.error ? (apiMessage(result.error) ?? t("failed")) : t("renamed"));
    if (!result.error) setRenaming(false);
  };

  const share = async (shared: boolean) => {
    const result = await update({ id: list.id, shared });
    setStatus(result.error ? t("failed") : t(shared ? "shareOn" : "shareOff"));
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus(t("copied"));
    } catch {
      setStatus(t("copyFailed"));
    }
  };

  const destroy = async () => {
    const result = await remove(list.id);
    if (result.error) return setStatus(t("failed"));
    onDeleted();
  };

  return (
    <div className="wishlists">
      <div className="wishlist-head">
        {renaming ? (
          <form className="inline-form" onSubmit={rename}>
            <div className="field">
              <label htmlFor={`rename-${list.id}`}>{t("name")}</label>
              <input id={`rename-${list.id}`} className="input" name="name" defaultValue={list.name} maxLength={60} />
            </div>
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {t("saveName")}
            </button>
            <button className="btn btn--secondary" type="button" onClick={() => setRenaming(false)}>
              {t("cancel")}
            </button>
          </form>
        ) : (
          <h2 className="h3" id={`wl-${list.id}`}>
            {list.name}
            {list.isDefault && <span className="muted"> · {t("default")}</span>}
          </h2>
        )}
        <div className="wishlist-actions">
          {!renaming && (
            <button className="link-btn" type="button" onClick={() => setRenaming(true)}>
              {t("rename")}
            </button>
          )}
          {list.shareToken ? (
            <button className="link-btn" type="button" onClick={() => share(false)} disabled={saving}>
              {t("stopSharing")}
            </button>
          ) : (
            <button className="link-btn" type="button" onClick={() => share(true)} disabled={saving}>
              {t("share")}
            </button>
          )}
          {confirming ? (
            <>
              <button className="link-btn" type="button" onClick={destroy} disabled={deleting}>
                {t("confirmDelete")}
              </button>
              <button className="link-btn" type="button" onClick={() => setConfirming(false)}>
                {t("cancel")}
              </button>
            </>
          ) : (
            <button className="link-btn" type="button" onClick={() => setConfirming(true)}>
              {t("delete")}
            </button>
          )}
        </div>
      </div>
      {shareUrl && (
        <div className="wishlist-share">
          <label className="sr-only" htmlFor={`share-${list.id}`}>
            {t("shareLink")}
          </label>
          <input id={`share-${list.id}`} className="input" readOnly value={shareUrl} data-testid="share-link" />
          <button className="btn btn--secondary" type="button" onClick={copy}>
            {t("copy")}
          </button>
        </div>
      )}
      <p className="sr-only" role="status">
        {status}
      </p>
    </div>
  );
}

function Item({ item, listId, market }: { item: WishlistItem; listId: string; market: MarketRef }) {
  const t = useTranslations("wishlist");
  const { openBag } = useBag();
  const [addToBag, { isLoading: adding }] = useAddToBagMutation();
  const [removeItem] = useRemoveWishlistItemMutation();
  const [message, setMessage] = useState("");
  const product = item.product;

  if (!product) {
    return (
      <li className="wish-item">
        <p className="muted">{t("unavailable")}</p>
        <button className="link-btn" type="button" onClick={() => removeItem({ id: listId, itemId: item.id })}>
          {t("remove")}
        </button>
      </li>
    );
  }

  const productHref = href(market, `/products/${product.handle}`);
  const price = product.price ? formatMoney(product.price.minMinor, product.price.currency, market.locale) : null;

  const add = async () => {
    const result = await addToBag(item.variantId ? { variantId: item.variantId } : { handle: product.handle });
    if (result.error) setMessage(bagErrorMessage(result.error));
    else {
      setMessage(t("addedToBag", { title: product.title }));
      openBag();
    }
  };

  return (
    <li className="wish-item" data-testid="wish-item">
      <Link className="wish-item__media" href={productHref} tabIndex={-1} aria-hidden="true">
        <Media
          image={product.images[0]}
          art={artFor(product.title, ...product.tags)}
          tone="mid"
          alt=""
          decorative
          sizes="220px"
        />
      </Link>
      <p className="wish-item__title">
        <Link href={productHref}>{product.title}</Link>
      </p>
      <div className="wish-item__row">
        {price && <span className="price">{price}</span>}
        <button className="link-btn" type="button" onClick={() => removeItem({ id: listId, itemId: item.id })}>
          {t("remove")}
          <span className="sr-only"> {product.title}</span>
        </button>
      </div>
      <button className="btn btn--primary" type="button" onClick={add} disabled={adding || !product.availableForSale}>
        {product.availableForSale ? t("addToBag") : t("soldOut")}
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </li>
  );
}

function apiMessage(error: unknown): string | undefined {
  return (error as { data?: { message?: string } } | undefined)?.data?.message;
}

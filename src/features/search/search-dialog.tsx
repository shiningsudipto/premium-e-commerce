"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { artFor } from "../../components/storefront/art";
import { Icon } from "../../components/storefront/icon";
import { Media } from "../../components/storefront/media";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";

type Suggestions = {
  products: {
    handle: string;
    title: string;
    image: { url: string; alt: string | null } | null;
    price: { currency: string; minMinor: number } | null;
  }[];
  categories: { handle: string; name: string }[];
  pages: { handle: string; title: string }[];
  queries: string[];
};

type Option = { id: string; href: string; kind: "product" | "category" | "page" | "query" | "all"; label: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DEBOUNCE_MS = 180;

// Typeahead search (plan B.2). The browser asks the API directly (no web-server hop), waits
// for a pause in typing, and cancels a request the next keystroke makes stale. Keyboard: arrows
// move through suggestions, Enter opens one or searches for the text.
export function SearchDialog({ market, label }: { market: MarketRef; label: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const searchHref = href(market, "/search");
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`${API_URL}/v1/store/search/suggest?q=${encodeURIComponent(q)}`, {
        headers: { "x-market": market.market, "x-locale": market.locale },
        signal: controller.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<Suggestions>) : null))
        .then((data) => {
          setResult(data);
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, market.market, market.locale]);

  const shown = q.length >= 2 ? result : null;
  const groups = useMemo(() => {
    if (!shown) return [];
    const make = (kind: Option["kind"], items: { href: string; label: string }[]) =>
      items.map((item, i) => ({ id: `${listId}-${kind}-${i}`, kind, ...item }));
    return [
      {
        key: "queries",
        label: t("popular"),
        options: make(
          "query",
          shown.queries.slice(0, 4).map((s) => ({ href: `${searchHref}?q=${encodeURIComponent(s)}`, label: s })),
        ),
      },
      {
        key: "products",
        label: t("products"),
        options: make(
          "product",
          shown.products.map((p) => ({ href: href(market, `/products/${p.handle}`), label: p.title })),
        ),
      },
      {
        key: "categories",
        label: t("categories"),
        options: make(
          "category",
          shown.categories.map((c) => ({ href: href(market, `/categories/${c.handle}`), label: c.name })),
        ),
      },
      {
        key: "pages",
        label: t("pages"),
        options: make(
          "page",
          shown.pages.map((p) => ({ href: href(market, `/pages/${p.handle}`), label: p.title })),
        ),
      },
    ].filter((g) => g.options.length);
  }, [shown, listId, market, searchHref, t]);
  const options: Option[] = [
    ...groups.flatMap((g) => g.options),
    ...(q.length >= 2
      ? [
          {
            id: `${listId}-all`,
            kind: "all" as const,
            href: `${searchHref}?q=${encodeURIComponent(q)}`,
            label: t("viewAll", { q }),
          },
        ]
      : []),
  ];

  const go = (target: string) => {
    setOpen(false);
    router.push(target);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      // -1 is the text field itself; moving past either end wraps through it
      const last = options.length - 1;
      setActive((i) => (e.key === "ArrowDown" ? (i >= last ? -1 : i + 1) : i <= -1 ? last : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[active];
      if (option) go(option.href);
      else if (q) go(`${searchHref}?q=${encodeURIComponent(q)}`);
    }
  };
  const activeOption = active >= 0 ? options[active] : undefined;
  const productByHref = new Map(shown?.products.map((p) => [href(market, `/products/${p.handle}`), p]) ?? []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setActive(-1);
      }}
    >
      <Link
        className="icon-btn"
        href={searchHref}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          setOpen(true);
        }}
        data-testid="search-open"
      >
        <Icon name="search" />
      </Link>
      <Dialog.Portal>
        <div className="search-dialog">
          <Dialog.Backdrop className="search-dialog__scrim" />
          <Dialog.Popup className="search-dialog__panel" aria-label={t("title")} initialFocus={inputRef}>
            <form
              role="search"
              className="search-dialog__field"
              action={searchHref}
              onSubmit={(e) => {
                e.preventDefault();
                if (q) go(`${searchHref}?q=${encodeURIComponent(q)}`);
              }}
            >
              <Icon name="search" />
              <input
                ref={inputRef}
                type="search"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("placeholder")}
                aria-label={t("label")}
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeOption?.id}
                autoComplete="off"
                enterKeyHint="search"
                data-testid="search-input"
              />
              <Dialog.Close className="icon-btn" aria-label={t("close")}>
                <Icon name="close" />
              </Dialog.Close>
            </form>
            <div className="search-dialog__results">
              <p className="sr-only" role="status" aria-live="polite">
                {loading ? t("searching") : shown ? t("suggestionCount", { count: options.length - 1 }) : ""}
              </p>
              <div id={listId} role="listbox" aria-label={t("label")}>
                {groups.map((g) => (
                  <div className="suggest-group" role="group" aria-label={g.label} key={g.key}>
                    <div className="suggest-group__label" aria-hidden="true">
                      {g.label}
                    </div>
                    {g.options.map((o) => {
                      const product = o.kind === "product" ? productByHref.get(o.href) : undefined;
                      return (
                        <Link
                          key={o.id}
                          id={o.id}
                          role="option"
                          aria-selected={activeOption?.id === o.id}
                          className="suggest-item"
                          href={o.href}
                          onClick={() => setOpen(false)}
                          tabIndex={-1}
                        >
                          {product && (
                            <span className="suggest-item__media">
                              <Media
                                image={product.image}
                                art={artFor(product.title)}
                                tone="mid"
                                alt=""
                                decorative
                                sizes="40px"
                              />
                            </span>
                          )}
                          <span>{o.label}</span>
                          {product?.price && (
                            <span className="suggest-item__price">
                              {formatMoney(product.price.minMinor, product.price.currency, market.locale)}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
                {q.length >= 2 && (
                  <Link
                    id={`${listId}-all`}
                    role="option"
                    aria-selected={activeOption?.kind === "all"}
                    className="suggest-item"
                    href={`${searchHref}?q=${encodeURIComponent(q)}`}
                    onClick={() => setOpen(false)}
                    tabIndex={-1}
                  >
                    <Icon name="search" size="sm" />
                    <span>{t("viewAll", { q })}</span>
                  </Link>
                )}
              </div>
              {shown && groups.length === 0 && !loading && (
                <p className="muted" style={{ padding: "var(--space-3)" }}>
                  {t("nothing")}
                </p>
              )}
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

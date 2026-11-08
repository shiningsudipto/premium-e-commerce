"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../../components/storefront/icon";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { BagStoreProvider } from "./bag-store";
import { BagLines, BagSummary, EmptyBag, ShippingProgress } from "./bag-view";
import { useGetBagQuery } from "./cart-api";

type BagContext = { openBag: () => void };

const Ctx = createContext<BagContext>({ openBag: () => {} });

// Opens the bag drawer from anywhere in the shop (after "Add to bag", or the header's bag
// button). The bag itself is RTK Query's cached getBag, which every bag change updates.
export const useBag = () => use(Ctx);

export function BagProvider({ market, children }: { market: MarketRef; children: ReactNode }) {
  // a new store per market: its API calls carry the market's headers
  return (
    <BagStoreProvider key={market.segment} market={market}>
      <BagDrawer market={market}>{children}</BagDrawer>
    </BagStoreProvider>
  );
}

function BagDrawer({ market, children }: { market: MarketRef; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openBag = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openBag }), [openBag]);

  return (
    <Ctx value={value}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <div className="panel" data-testid="bag-drawer">
            <Dialog.Backdrop className="panel__scrim" />
            <Dialog.Popup className="panel__body">
              {/* mounted only while open: the bag query never runs while the shop layout is
                  prerendered (RTK Query reads the clock, which Cache Components refuses there) */}
              {open && <BagContents market={market} close={() => setOpen(false)} />}
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </Ctx>
  );
}

function BagContents({ market, close }: { market: MarketRef; close: () => void }) {
  const t = useTranslations("cart");
  // loaded when the drawer opens; a bag fetched or changed in the last few seconds is reused
  const { data: cart, isLoading, isError } = useGetBagQuery(undefined, { refetchOnMountOrArgChange: 10 });
  const hasLines = !!cart && cart.lines.length > 0;

  return (
    <>
      <div className="panel__head">
        <Dialog.Title className="panel__title">
          {t("title")}
          {cart?.itemCount ? ` (${cart.itemCount})` : ""}
        </Dialog.Title>
        <Dialog.Close className="icon-btn" aria-label={t("close")}>
          <Icon name="close" />
        </Dialog.Close>
      </div>
      <div className="panel__scroll">
        {isLoading || (cart === undefined && !isError) ? (
          <p className="muted" role="status">
            {t("loading")}
          </p>
        ) : isError && cart === undefined ? (
          <p className="notice notice--error" role="alert">
            {t("loadFailed")}
          </p>
        ) : !hasLines ? (
          <EmptyBag market={market} onNavigate={close} />
        ) : (
          <>
            <ShippingProgress cart={cart} market={market} />
            <BagLines cart={cart} market={market} onNavigate={close} />
          </>
        )}
      </div>
      {hasLines && (
        <div className="panel__foot">
          <BagSummary cart={cart} market={market} />
          <Link className="btn btn--primary" href={href(market, "/checkout")} onClick={close}>
            {t("checkout")}
          </Link>
          <Link className="btn btn--secondary" href={href(market, "/cart")} onClick={close}>
            {t("viewBag")}
          </Link>
        </div>
      )}
    </>
  );
}

"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../../components/storefront/icon";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { loadBag } from "./actions";
import { BagLines, BagSummary, EmptyBag, ShippingProgress } from "./bag-view";
import type { Bag } from "./types";

type BagContext = { openBag: (cart?: Bag) => void };

const Ctx = createContext<BagContext>({ openBag: () => {} });

// Opens the bag drawer from anywhere in the shop (after "Add to bag", or the header's bag
// button). Pass the cart an action just returned to skip loading it again.
export const useBag = () => use(Ctx);

export function BagProvider({ market, children }: { market: MarketRef; children: ReactNode }) {
  const t = useTranslations("cart");
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Bag | null | undefined>(undefined);

  const openBag = useCallback((next?: Bag) => {
    setOpen(true);
    if (next) setCart(next);
    else loadBag().then(setCart, () => setCart(null));
  }, []);
  const value = useMemo(() => ({ openBag }), [openBag]);
  const close = () => setOpen(false);

  return (
    <Ctx value={value}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <div className="panel" data-testid="bag-drawer">
            <Dialog.Backdrop className="panel__scrim" />
            <Dialog.Popup className="panel__body">
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
                {cart === undefined ? (
                  <p className="muted" role="status">
                    {t("loading")}
                  </p>
                ) : !cart || cart.lines.length === 0 ? (
                  <EmptyBag market={market} onNavigate={close} />
                ) : (
                  <>
                    <ShippingProgress cart={cart} market={market} />
                    <BagLines cart={cart} market={market} onCart={setCart} onNavigate={close} />
                  </>
                )}
              </div>
              {cart && cart.lines.length > 0 && (
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
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </Ctx>
  );
}

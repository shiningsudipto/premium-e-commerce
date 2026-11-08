"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass } from "../../components/storefront/primitives";
import { useBag } from "./bag-provider";
import { bagErrorCode, bagErrorMessage, useAddToBagMutation } from "./cart-api";

// The "Quick add" button on product cards. Products with several variants go to their page so
// the shopper can choose; the result is announced to screen readers.
export function QuickAdd({
  handle,
  title,
  productHref,
  soldOut,
  labels,
}: {
  handle: string;
  title: string;
  productHref: string;
  soldOut: boolean;
  labels: { add: string; added: string; soldOut: string; addAria: string; soldOutAria: string };
}) {
  const router = useRouter();
  const { openBag } = useBag();
  const [addToBag, { isLoading: pending }] = useAddToBagMutation();
  const [status, setStatus] = useState<{ added: boolean; message: string }>({ added: false, message: "" });

  useEffect(() => {
    if (!status.added) return;
    const t = setTimeout(() => setStatus((s) => ({ ...s, added: false })), 2400);
    return () => clearTimeout(t);
  }, [status.added]);

  const onClick = async () => {
    const result = await addToBag({ handle });
    if (!result.error) {
      setStatus({ added: true, message: `${title} added to your bag.` });
      openBag();
    } else if (bagErrorCode(result.error) === "CHOOSE_OPTIONS") router.push(productHref);
    else setStatus({ added: false, message: bagErrorMessage(result.error) });
  };

  return (
    <>
      <button
        className={buttonClass("primary", "card__quick")}
        type="button"
        disabled={soldOut || pending}
        aria-label={soldOut ? labels.soldOutAria : labels.addAria}
        onClick={onClick}
      >
        {soldOut ? labels.soldOut : status.added ? labels.added : labels.add}
      </button>
      <span className="sr-only" aria-live="polite">
        {status.message}
      </span>
    </>
  );
}

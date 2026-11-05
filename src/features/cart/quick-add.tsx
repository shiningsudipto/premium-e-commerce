"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buttonClass } from "../../components/storefront/primitives";
import { addToBag } from "./actions";

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
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ added: boolean; message: string }>({ added: false, message: "" });

  useEffect(() => {
    if (!status.added) return;
    const t = setTimeout(() => setStatus((s) => ({ ...s, added: false })), 2400);
    return () => clearTimeout(t);
  }, [status.added]);

  const onClick = () =>
    start(async () => {
      const result = await addToBag({ handle });
      if (result.ok) setStatus({ added: true, message: `${title} added to your bag.` });
      else if (result.reason === "choose_options") router.push(productHref);
      else setStatus({ added: false, message: result.message });
    });

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

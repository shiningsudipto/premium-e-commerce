"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../../components/storefront/icon";
import { useSignedIn } from "./shopper-session";
import { useGetSavedQuery, useSetSavedMutation } from "./wishlist-api";

type Props = {
  productId: string;
  title: string;
  // the chosen variant on a product page, so the wishlist remembers the colour/size
  variantId?: string;
  signInHref: string;
  className?: string;
};

// The wishlist heart on product cards and product pages. It renders the same static button while
// a page is prerendered and for visitors who aren't signed in (who are asked to sign in); a
// signed-in customer's button reads and toggles their saved items through RTK Query.
export function HeartButton(props: Props) {
  const signedIn = useSignedIn();
  return signedIn ? <CustomerHeart {...props} /> : <SignInHeart {...props} />;
}

function SignInHeart({ title, signInHref, className }: Props) {
  const t = useTranslations("wishlist");
  const router = useRouter();
  return (
    <button
      type="button"
      className={cn("heart", className)}
      aria-pressed={false}
      aria-label={t("save", { title })}
      onClick={() => {
        const next = window.location.pathname + window.location.search;
        router.push(`${signInHref}?next=${encodeURIComponent(next)}`);
      }}
    >
      <Icon name="heart" />
    </button>
  );
}

function CustomerHeart({ productId, variantId, title, className }: Props) {
  const t = useTranslations("wishlist");
  const { data: saved } = useGetSavedQuery();
  const [setSaved] = useSetSavedMutation();
  const [message, setMessage] = useState("");
  const isSaved = !!saved?.includes(productId);

  // until the saved list has loaded the heart can't know its state; a click before then could be
  // overwritten by that first (older) answer, so it waits
  const loading = saved === undefined;

  const toggle = async () => {
    if (loading) return;
    const next = !isSaved;
    const result = await setSaved({ productId, variantId, saved: next });
    setMessage(result.error ? t("failed") : t(next ? "saved" : "removed", { title }));
  };

  return (
    <>
      <button
        type="button"
        className={cn("heart", isSaved && "is-saved", className)}
        aria-pressed={isSaved}
        aria-busy={loading || undefined}
        disabled={loading}
        aria-label={t(isSaved ? "unsave" : "save", { title })}
        onClick={toggle}
        data-testid="heart"
      >
        <Icon name="heart" />
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}

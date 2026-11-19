"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { getAssetLink, type AssetLinkState } from "./actions";
import { bannerSnippet, copySnippet, trackedUrl } from "./assets";
import { CopyButton } from "./copy-button";

const initial: AssetLinkState = { ok: false };

type Asset = {
  id: string;
  title: string;
  kind: "banner" | "image" | "copy";
  body: string | null;
  media: { url: string; width: number | null; height: number | null } | null;
};

// Gets the asset's tracked link from the API (it credits the asset, and counts as a download in
// the asset's analytics), then offers it to copy: the link itself, and the ready-made snippet
// (the copy text with the link, or banner HTML).
export function AssetLink({ asset, origin, marketPrefix }: { asset: Asset; origin: string; marketPrefix: string }) {
  const t = useTranslations("affiliate.assets");
  const te = useTranslations("affiliate.errors");
  const [state, action, pending] = useActionState(getAssetLink, initial);
  const linkId = useId();
  const snippetId = useId();

  const link = state.ok && state.trackedPath ? trackedUrl(origin, marketPrefix, state.trackedPath) : "";
  const snippet = !link
    ? ""
    : asset.kind === "copy"
      ? copySnippet(asset.body, link)
      : asset.media
        ? bannerSnippet({
            link,
            imageUrl: asset.media.url,
            alt: asset.title,
            width: asset.media.width,
            height: asset.media.height,
          })
        : "";

  if (!link) {
    return (
      <form action={action} className="affiliate-asset__get">
        <input type="hidden" name="id" value={asset.id} />
        <button className="btn btn--secondary" type="submit" disabled={pending}>
          {pending ? t("gettingLink") : t("getLink")}
          <span className="sr-only">: {asset.title}</span>
        </button>
        {state.message && (
          <p className="field__error" role="alert">
            {te.has(state.message) ? te(state.message) : te("generic")}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="affiliate-asset__share">
      <div className="field">
        <label htmlFor={linkId}>{t("trackedLink")}</label>
        <input className="input affiliate-code" id={linkId} readOnly value={link} onFocus={(e) => e.target.select()} />
      </div>
      <p>
        <CopyButton text={link} label={t("copyLink")} />
      </p>
      {snippet && (
        <>
          <div className="field">
            <label htmlFor={snippetId}>{asset.kind === "copy" ? t("postText") : t("htmlSnippet")}</label>
            <textarea
              className="affiliate-snippet"
              id={snippetId}
              readOnly
              rows={asset.kind === "copy" ? 5 : 3}
              value={snippet}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <p>
            <CopyButton text={snippet} label={asset.kind === "copy" ? t("copyText") : t("copySnippet")} />
          </p>
        </>
      )}
    </div>
  );
}

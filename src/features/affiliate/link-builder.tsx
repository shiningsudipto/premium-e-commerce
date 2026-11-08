"use client";

import { QRCodeSVG } from "qrcode.react";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import { buildAffiliateLink, normalizeLinkPath } from "./referral";

type Code = { code: string; label: string | null; isDefault: boolean };

// Builds a shareable link from a referral code, a storefront page and an optional sub-ID, with
// a copy button and a QR code that can be saved as SVG. Everything happens in the browser.
export function LinkBuilder({ codes, origin, marketPrefix }: { codes: Code[]; origin: string; marketPrefix: string }) {
  const t = useTranslations("affiliate.links");
  const [code, setCode] = useState(codes.find((c) => c.isDefault)?.code ?? codes[0]?.code ?? "");
  const [path, setPath] = useState("");
  const [subId, setSubId] = useState("");
  const [copied, setCopied] = useState<"" | "copied" | "failed">("");
  const qrRef = useRef<HTMLDivElement>(null);
  const outputId = useId();

  const page = normalizeLinkPath(path);
  const link =
    code && page !== null
      ? buildAffiliateLink({ origin, path: `${marketPrefix}${page === "/" ? "" : page}`, code, subId })
      : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${code}${subId.trim() ? `-${subId.trim().replace(/[^\w-]+/g, "_")}` : ""}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!codes.length) return <p className="muted">{t("noCodes")}</p>;

  return (
    <div className="affiliate-builder" data-testid="affiliate-link-builder">
      <div className="form-grid">
        {codes.length > 1 ? (
          <Field label={t("code")} name="code">
            <select
              className="select"
              id="f-code"
              name="code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCopied("");
              }}
            >
              {codes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label ? `${c.code} · ${c.label}` : c.code}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p>
            {t("code")}: <strong className="affiliate-code">{code}</strong>
          </p>
        )}
        <Field
          label={t("page")}
          name="path"
          value={path}
          placeholder="/"
          spellCheck={false}
          autoCapitalize="off"
          hint={t("pageHint")}
          error={page === null ? t("pageInvalid") : undefined}
          onChange={(e) => {
            setPath(e.target.value);
            setCopied("");
          }}
        />
        <Field
          label={t("subId")}
          name="subId"
          value={subId}
          maxLength={100}
          spellCheck={false}
          autoCapitalize="off"
          hint={t("subIdHint")}
          onChange={(e) => {
            setSubId(e.target.value);
            setCopied("");
          }}
        />
        <Field
          label={t("yourLink")}
          name="link"
          id={outputId}
          value={link}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <div className="buy-row">
          <button type="button" className="btn btn--primary" onClick={copy} disabled={!link}>
            {t("copy")}
          </button>
          <span role="status" aria-live="polite" className="muted">
            {copied === "copied" ? t("copied") : copied === "failed" ? t("copyFailed") : ""}
          </span>
        </div>
      </div>
      {link && (
        <figure className="affiliate-qr">
          <div ref={qrRef}>
            <QRCodeSVG
              value={link}
              size={176}
              marginSize={2}
              title={t("qrTitle", { link })}
              role="img"
              aria-label={t("qrTitle", { link })}
            />
          </div>
          <figcaption className="muted">{t("qrCaption")}</figcaption>
          <button type="button" className="btn btn--secondary" onClick={downloadQr}>
            {t("downloadQr")}
          </button>
        </figure>
      )}
    </div>
  );
}

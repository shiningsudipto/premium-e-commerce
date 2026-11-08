"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ArtName } from "../../components/storefront/art";
import { Media, type MediaImage, type Tone } from "../../components/storefront/media";
import { swatchColor } from "../../components/storefront/primitives";
import { useBag } from "../../features/cart/bag-provider";
import { bagErrorMessage, useAddToBagMutation } from "../../features/cart/cart-api";

export type SpotlightVariant = {
  id: string;
  colour: string | null;
  price: string | null;
  available: boolean;
  lowStock: boolean;
};

type Shot = { image: MediaImage | null; art: ArtName; flip?: boolean; caption: string; label: string };

const TONE_FOR_COLOUR: Record<string, Tone> = {
  tan: "warm",
  chestnut: "mid",
  black: "dark",
  natural: "light",
  navy: "dark",
};

// The interactive half of the spotlight: gallery thumbnails, the colour picker and "Add to bag".
// Product data is fetched on the server and passed in.
export function SpotlightGallery({ title, shots, colour }: { title: string; shots: Shot[]; colour: string | null }) {
  const [index, setIndex] = useState(0);
  const tone = (colour && TONE_FOR_COLOUR[colour.toLowerCase()]) || "warm";
  const shot = shots[index]!;
  return (
    <div className="gallery">
      <div className="gallery__main reveal">
        <Media
          image={shot.image}
          art={shot.art}
          flip={shot.flip}
          tone={tone}
          alt={`${title}${colour ? ` in ${colour.toLowerCase()}` : ""}, ${shot.label}`}
          caption={`${title}${colour ? ` · ${colour}` : ""} · ${shot.caption}`}
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>
      <div className="gallery__thumbs" role="group" aria-label="Product images">
        {shots.map((s, i) => (
          <button
            key={s.label}
            className={cn("thumb", i === index && "is-active")}
            type="button"
            aria-pressed={i === index}
            aria-label={`Show image ${i + 1} of ${shots.length}: ${s.label}`}
            onClick={() => setIndex(i)}
          >
            <Media image={s.image} art={s.art} flip={s.flip} tone={tone} alt="" decorative sizes="96px" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SpotlightBuy({
  title,
  variants,
  initialColour,
  shots,
  labels,
  children,
  after,
}: {
  title: string;
  variants: SpotlightVariant[];
  initialColour: string | null;
  shots: Shot[];
  labels: { colour: string; add: string; soldOut: string; lowStock: string };
  children: React.ReactNode;
  // shown under the button, e.g. the delivery note
  after?: React.ReactNode;
}) {
  const [colour, setColour] = useState(initialColour);
  const [addToBag, { isLoading: pending }] = useAddToBagMutation();
  const [message, setMessage] = useState("");
  const { openBag } = useBag();
  const variant = variants.find((v) => v.colour === colour) ?? variants[0];
  const colours = [...new Set(variants.map((v) => v.colour).filter((c): c is string => !!c))];

  const add = async () => {
    if (!variant) return;
    const result = await addToBag({ variantId: variant.id });
    setMessage(
      result.error ? bagErrorMessage(result.error) : `${title}${colour ? ` in ${colour}` : ""} added to your bag.`,
    );
    if (!result.error) openBag();
  };

  return (
    <>
      <SpotlightGallery title={title} shots={shots} colour={colour} />
      <div className="spot__info">
        {children}
        {colours.length > 0 && (
          <fieldset className="colour-picker">
            <legend>
              {labels.colour}: <strong>{colour}</strong>
              {variant?.lowStock && <span className="colour-picker__note"> · {labels.lowStock}</span>}
            </legend>
            <div className="colour-opts">
              {colours.map((c) => (
                <label key={c} className={cn("colour-opt", c === colour && "is-checked")}>
                  <input
                    type="radio"
                    name="spotlight-colour"
                    value={c}
                    checked={c === colour}
                    onChange={() => setColour(c)}
                  />
                  <span className="dot" style={{ background: swatchColor(c) }} aria-hidden="true" />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <button
          className="btn btn--primary btn--block"
          type="button"
          disabled={!variant?.available || pending}
          onClick={add}
        >
          {variant?.available ? `${labels.add}${variant.price ? ` · ${variant.price}` : ""}` : labels.soldOut}
        </button>
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
        {after}
      </div>
    </>
  );
}

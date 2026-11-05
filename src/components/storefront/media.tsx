import Image from "next/image";
import { Art, type ArtName } from "./art";

export type Tone = "light" | "mid" | "warm" | "dark";

export type MediaImage = { url: string; alt: string | null; width?: number | null; height?: number | null };

type MediaProps = {
  // a real photo when there is one; otherwise the line-art placeholder below is drawn
  image?: MediaImage | null;
  art: ArtName;
  tone?: Tone;
  alt: string;
  caption?: string;
  flip?: boolean;
  // responsive sizes for next/image, matching the slot the media fills
  sizes?: string;
  priority?: boolean;
  className?: string;
  decorative?: boolean;
};

// Fills its parent. Photos go through next/image; placeholders keep the design's tones and captions.
export function Media({
  image,
  art,
  tone = "light",
  alt,
  caption,
  flip,
  sizes,
  priority,
  className,
  decorative,
}: MediaProps) {
  const classes = ["ph", tone !== "light" && `ph--${tone}`, className].filter(Boolean).join(" ");
  if (image) {
    return (
      <div className={classes}>
        <Image
          src={image.url}
          alt={decorative ? "" : (image.alt ?? alt)}
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }
  return (
    <div className={classes} {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": alt })}>
      <Art name={art} flip={flip} />
      {caption && (
        <span className="ph__cap" aria-hidden="true">
          {caption}
        </span>
      )}
    </div>
  );
}

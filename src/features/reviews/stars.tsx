import { Icon } from "../../components/storefront/icon";

// A 1–5 star rating for display. The stars are decoration; `label` ("Rated 4 out of 5") is
// what assistive technology reads. Works in server and client components (no hooks).
export function RatingStars({ value, label, size }: { value: number; label: string; size?: "sm" }) {
  const filled = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className="stars rating-stars" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          filled={i < filled}
          className={i < filled ? undefined : "rating-stars__empty"}
        />
      ))}
    </span>
  );
}

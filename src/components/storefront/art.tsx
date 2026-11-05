// Line drawings of the product range, used as photo placeholders until real photography is
// uploaded to the media library. Drawn on a 120px grid.
const ART = {
  weekender: (
    <>
      <path d="M16 54c0-6 4-10 10-10h68c6 0 10 4 10 10v38c0 4-3 7-7 7H23c-4 0-7-3-7-7z" />
      <path d="M44 44c0-18 32-18 32 0" />
      <path d="M38 44v55M82 44v55" />
      <path d="M22 60h76" strokeDasharray="3 3" />
      <rect x="54" y="66" width="12" height="9" rx="1.5" />
    </>
  ),
  tote: (
    <>
      <path d="M26 42h68l-7 58H33z" />
      <path d="M44 42c0-24 32-24 32 0" />
      <path d="M31 50h58M33 92h54" strokeDasharray="3 3" />
    </>
  ),
  briefcase: (
    <>
      <rect x="14" y="40" width="92" height="56" rx="5" />
      <path d="M48 40v-8a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v8" />
      <path d="M14 62h92" />
      <rect x="55" y="57" width="10" height="10" rx="1.5" />
      <path d="M19 45h82" strokeDasharray="3 3" />
    </>
  ),
  wallet: (
    <>
      <rect x="20" y="34" width="80" height="52" rx="4" />
      <path d="M60 34v52" />
      <rect x="25" y="39" width="70" height="42" rx="2" strokeDasharray="3 3" />
      <path d="M68 50h22M68 58h22M68 66h22" />
    </>
  ),
  card: (
    <>
      <rect x="32" y="38" width="56" height="44" rx="4" />
      <path d="M32 52h56" />
      <path d="M36 42h48v36H36z" strokeDasharray="3 3" />
      <path d="M48 52c0-6 24-6 24 0" />
    </>
  ),
  belt: (
    <>
      <rect x="6" y="56" width="108" height="16" rx="2" />
      <rect x="20" y="49" width="20" height="30" rx="4" />
      <path d="M30 49v30" />
      <circle cx="74" cy="64" r="1.6" />
      <circle cx="84" cy="64" r="1.6" />
      <circle cx="94" cy="64" r="1.6" />
      <path d="M44 59h66M44 69h66" strokeDasharray="3 3" />
    </>
  ),
  passport: (
    <>
      <rect x="36" y="22" width="48" height="76" rx="4" />
      <circle cx="60" cy="54" r="11" />
      <path d="M49 54h22M60 43c5 6 5 16 0 22M60 43c-5 6-5 16 0 22" />
      <rect x="40" y="26" width="40" height="68" rx="2" strokeDasharray="3 3" />
    </>
  ),
  sling: (
    <>
      <path d="M24 62c0-10 8-16 18-16h36c10 0 18 6 18 16v14c0 12-10 20-22 20H46c-12 0-22-8-22-20z" />
      <path d="M28 54C34 20 86 20 92 54" />
      <path d="M30 64h60" strokeDasharray="3 3" />
    </>
  ),
  sleeve: (
    <>
      <rect x="16" y="32" width="88" height="62" rx="6" />
      <path d="M16 46h88M98 46v-6" />
      <path d="M22 52h76v36H22z" strokeDasharray="3 3" />
    </>
  ),
  watch: (
    <>
      <rect x="18" y="46" width="84" height="30" rx="15" />
      <path d="M33 46v30M87 46v30M60 76v10" />
      <path d="M40 61h40" strokeDasharray="3 3" />
    </>
  ),
  key: (
    <>
      <rect x="40" y="34" width="40" height="52" rx="6" />
      <circle cx="60" cy="46" r="4" />
      <path d="M60 86v12" />
      <circle cx="60" cy="102" r="4" />
      <path d="M44 56h32" strokeDasharray="3 3" />
    </>
  ),
  dopp: (
    <>
      <path d="M20 50h80v38a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" />
      <path d="M20 50c0-8 6-12 12-12h56c6 0 12 4 12 12M100 44l8-4" />
      <path d="M28 44h64" strokeDasharray="3 3" />
    </>
  ),
  pouch: (
    <>
      <path d="M28 44h64v40a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" />
      <path d="M28 52h64M92 48h6" />
      <path d="M34 58h52v28H34z" strokeDasharray="3 3" />
    </>
  ),
  stitch: (
    <>
      <path d="M4 78c30-14 82-14 112 0v30H4z" />
      <path d="M8 88c28-11 76-11 104 0" strokeDasharray="7 6" strokeWidth="2.5" />
      <path d="M70 20l22 48M72 23l-2-5" />
      <path d="M92 68c6 10-2 18-14 14" />
    </>
  ),
} as const;

export type ArtName = keyof typeof ART;
export const ART_NAMES = Object.keys(ART) as ArtName[];

// Picks a drawing for a product from words in its title or tags, so catalog products without
// photos still get a fitting placeholder.
const KEYWORDS: [RegExp, ArtName][] = [
  [/weekender|duffel|holdall/i, "weekender"],
  [/brief|laptop bag|messenger/i, "briefcase"],
  [/sleeve|laptop/i, "sleeve"],
  [/sling|crossbody/i, "sling"],
  [/tote|shopper/i, "tote"],
  [/card/i, "card"],
  [/wallet|bifold/i, "wallet"],
  [/belt/i, "belt"],
  [/passport|travel wallet/i, "passport"],
  [/watch/i, "watch"],
  [/key/i, "key"],
  [/dopp|wash|toiletr/i, "dopp"],
  [/pouch|coin/i, "pouch"],
  [/bag/i, "tote"],
];

export function artFor(...words: string[]): ArtName {
  const text = words.join(" ");
  return KEYWORDS.find(([pattern]) => pattern.test(text))?.[1] ?? "tote";
}

export function Art({ name, flip, className }: { name: ArtName; flip?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={["ph__art", flip && "ph__art--flip", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      focusable="false"
    >
      {ART[name]}
    </svg>
  );
}

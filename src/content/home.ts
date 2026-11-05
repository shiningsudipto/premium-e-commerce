import type { ArtName } from "../components/storefront/art";
import type { Tone } from "../components/storefront/media";
import type { Emphasized } from "../components/storefront/primitives";
import type { ProductSort } from "../lib/catalog";

// Editorial content of the home page (Premium Touch design). Each export is the props of one
// block, so the page builder (B-Phase 2) can supply the same shapes per block later. Commerce
// data (products, prices, menus, the bag) comes from the API, not from here. Paths are relative
// to the market prefix.

export type Placeholder = { art: ArtName; tone: Tone; alt: string; caption?: string };
type Link = { label: string; path: string };

export const announcement = ["Free delivery over ৳ 5,000", "Cash on delivery available"];

export const hero = {
  eyebrow: "Handcrafted in Bangladesh",
  title: { text: "Made", em: "slowly.", after: "Carried for decades." } satisfies Emphasized,
  lede: "Full-grain leather bags, wallets and belts, cut and stitched by hand to soften, darken and last.",
  primary: { label: "Shop the collection", path: "/#collections" },
  secondary: { label: "Explore our craft", path: "/#craft" },
  trust: [
    { icon: "shield", label: "5-year warranty" },
    { icon: "cash", label: "COD & bKash" },
    { icon: "truck", label: "2–4 days in Dhaka" },
  ] as const,
  media: {
    art: "weekender",
    tone: "warm",
    alt: "Photo placeholder: a chestnut leather weekender bag resting on a wooden bench by a window",
    caption: "Lifestyle photo · Weekender, chestnut · full-bleed",
  } satisfies Placeholder,
  inset: {
    art: "stitch",
    tone: "dark",
    alt: "Photo placeholder: close-up of hand stitching along a bag handle",
    caption: "Detail · handle stitch",
  } satisfies Placeholder,
};

export const collections = {
  eyebrow: "Shop by collection",
  title: { text: "Four things,", em: "done properly." } satisfies Emphasized,
  viewAll: { label: "View all pieces", path: "/#products" } satisfies Link,
  tiles: [
    {
      name: "Bags",
      count: "24 pieces",
      path: "/categories/bags",
      art: "weekender",
      tone: "warm",
      alt: "Photo placeholder: tote and briefcase in tan leather",
    },
    {
      name: "Wallets",
      count: "18 pieces",
      path: "/categories/wallets",
      art: "wallet",
      tone: "mid",
      alt: "Photo placeholder: open bifold wallet",
    },
    {
      name: "Belts",
      count: "9 pieces",
      path: "/categories/belts",
      art: "belt",
      tone: "light",
      alt: "Photo placeholder: coiled leather belt with brass buckle",
    },
    {
      name: "Travel",
      count: "12 pieces",
      path: "/categories/travel-bags",
      art: "passport",
      tone: "mid",
      alt: "Photo placeholder: passport holder and luggage tag",
    },
  ] satisfies (Placeholder & { name: string; count: string; path: string })[],
};

export const shop = {
  eyebrow: "The shop",
  title: { text: "Pieces people", em: "keep coming back for." } satisfies Emphasized,
  shopAll: { label: "Shop all", path: "/products" } satisfies Link,
  tabs: [
    { id: "best", label: "Bestsellers", sort: "featured" },
    { id: "new", label: "New arrivals", sort: "newest" },
  ] satisfies { id: string; label: string; sort: ProductSort }[],
  limit: 8,
  empty: {
    title: "Nothing on this shelf yet",
    body: "New pieces leave the workshop in small batches. Join the workshop letter and we’ll tell you when they land.",
    cta: { label: "Notify me", path: "/#letters" },
  },
};

export const giftSet = {
  eyebrow: "Bundle offer",
  title: { text: "The gift set:", em: "wallet and belt, boxed." } satisfies Emphasized,
  body: "Our Classic Bifold Wallet and Heritage Belt in matching leather, packed in a keepsake box with a handwritten card.",
  priceMinor: 590000,
  compareAtMinor: 670000,
  points: [
    "Choose Tan, Chestnut or Black",
    "Gift box and handwritten card included",
    "Ships free · cash on delivery or bKash",
  ],
  cta: { label: "Shop the gift set", path: "/products" } satisfies Link,
  media: [
    {
      art: "wallet",
      tone: "mid",
      alt: "Photo placeholder: Classic Bifold Wallet in chestnut, laid in an open gift box",
      caption: "Wallet · in gift box",
    },
    {
      art: "belt",
      tone: "warm",
      alt: "Photo placeholder: Heritage Belt in tan, coiled beside the box",
      caption: "Belt · coiled",
    },
  ] satisfies Placeholder[],
};

export const craft = {
  eyebrow: "Our craft",
  title: { text: "Seventy-two hours", em: "for one bag.", after: "A lifetime to wear it in." } satisfies Emphasized,
  lede: "We would rather make fewer pieces and stand behind every one. Here is what goes into each.",
  numeral: { value: "72", unit: "hrs" },
  points: [
    {
      title: "Full-grain leather from Bangladeshi tanneries",
      body: "The top layer of the hide, natural grain intact, so it softens and darkens with use instead of peeling.",
    },
    {
      title: "Hand-stitched by 12 artisans",
      body: "Every seam is saddle-stitched with waxed thread, two needles at a time, so one broken stitch never unravels the rest.",
    },
    {
      title: "5-year warranty",
      body: "If a seam, strap or buckle fails in normal use, we repair or replace it. No forms, just a message.",
    },
  ],
  cta: { label: "Explore our craft", path: "/pages/our-craft" } satisfies Link,
  media: {
    art: "stitch",
    tone: "dark",
    alt: "Photo placeholder: an artisan's hands saddle-stitching a leather panel with two needles",
    caption: "Close-up · hand-stitching, waxed thread",
  } satisfies Placeholder,
  detail: {
    art: "wallet",
    tone: "warm",
    alt: "Photo placeholder: a stack of full-grain hides in tan and chestnut",
    caption: "Hides · tannery",
  } satisfies Placeholder,
};

export const story = {
  eyebrow: "Our story",
  title: { text: "From one bag", em: "to a workshop of twelve." } satisfies Emphasized,
  chapters: [
    {
      year: "[Year]",
      title: "Where it began",
      body: "[Founder name] cut and stitched the first bag by hand in [place]. [One line on why.]",
      media: { art: "weekender", tone: "warm", alt: "Photo placeholder: the first weekender, on a workbench" },
    },
    {
      year: "[Year]",
      title: "Finding our leather",
      body: "We began working with full-grain hides from Bangladeshi tanneries, choosing [how hides are chosen].",
      media: { art: "wallet", tone: "mid", alt: "Photo placeholder: stacked full-grain hides at the tannery" },
    },
    {
      year: "[Year]",
      title: "Twelve pairs of hands",
      body: "The workshop grew to 12 artisans, each stitching by hand. [Where they trained or how the team came together.]",
      media: { art: "stitch", tone: "dark", alt: "Photo placeholder: artisans at their benches in the workshop" },
    },
    {
      year: "[Year]",
      title: "The five-year promise",
      body: "We started backing every piece with a 5-year warranty, because we expect it to outlast that.",
      media: { art: "belt", tone: "light", alt: "Photo placeholder: a well-worn belt next to a new one" },
    },
    {
      year: "[Year]",
      title: "Across the country",
      body: "Nationwide delivery with cash on delivery and bKash, so anyone can hold a piece before paying for it.",
      media: { art: "tote", tone: "warm", alt: "Photo placeholder: wrapped parcels ready for delivery" },
    },
    {
      year: "Today",
      title: "1,240 reviews later",
      body: "Still made slowly, still in small batches. Here is what the people carrying them say.",
      media: { art: "sling", tone: "mid", alt: "Photo placeholder: a customer carrying a chestnut tote through Dhaka" },
      link: { label: "Read the reviews", path: "/#reviews" },
      dark: true,
    },
  ] satisfies { year: string; title: string; body: string; media: Placeholder; link?: Link; dark?: boolean }[],
};

export const spotlight = {
  eyebrow: "Featured piece",
  productHandle: "leather-weekender-bag",
  blurb:
    "Big enough for three days away, structured enough for the overhead rack. Cut from a single run of full-grain hide, so the colour deepens evenly as it ages.",
  specs: [
    ["Leather", "Full-grain cowhide, Bangladeshi tannery"],
    ["Stitching", "Hand saddle-stitched, waxed thread"],
    ["Lining", "[Lining material]"],
    ["Hardware", "[Hardware finish]"],
    ["Dimensions", "[W × H × D cm]"],
    ["Weight", "[Weight kg]"],
  ] as [string, string][],
  shipNote: {
    strong: "This piece ships free.",
    text: "Delivered in 2–4 days in Dhaka, nationwide after. Pay cash on delivery or with bKash.",
  },
};

export const services = {
  eyebrow: "Made for you",
  title: { text: "A little extra,", em: "on the house." } satisfies Emphasized,
  cards: [
    {
      tag: "Personalise · free this month",
      title: "Your initials, stamped by hand.",
      body: "Add up to three letters to any bag at checkout. No extra charge, no extra delivery time.",
      cta: { label: "Choose a bag", path: "/categories/bags" },
      media: {
        art: "tote",
        tone: "warm",
        alt: "Photo placeholder: brass letter stamps pressing initials into a tan leather tote",
        caption: "Detail · hand-stamped initials",
      },
    },
    {
      tag: "Corporate & wedding gifts",
      title: "Gifting ten or more?",
      body: "Volume pricing, custom packaging and your logo debossed on each piece. Tell us the date; we plan the batch around it.",
      cta: { label: "Request a quote", path: "/pages/gifting" },
      media: {
        art: "card",
        tone: "dark",
        alt: "Photo placeholder: a row of boxed card sleeves tied with cotton ribbon",
        caption: "Boxed sleeves · ribbon",
      },
      dark: true,
    },
  ] satisfies { tag: string; title: string; body: string; cta: Link; media: Placeholder; dark?: boolean }[],
};

export const reviews = {
  eyebrow: "Reviews",
  title: { text: "Carried across", em: "the country." } satisfies Emphasized,
  score: { average: 4.8, count: 1240 },
  items: [
    {
      quote:
        "I carry it to the office every day and it has only got better. The tan has darkened into a lovely honey colour. Delivery to Dhanmondi took two days.",
      name: "Tasnim R.",
      city: "Dhaka",
      product: "Kawran Tote, Tan",
      rating: 5,
    },
    {
      quote:
        "Paying cash on delivery made trying a new brand easy. The stitching is tight and even; you can tell it was done by hand.",
      name: "Arif H.",
      city: "Chattogram",
      product: "Classic Bifold Wallet, Black",
      rating: 5,
    },
    {
      quote:
        "Took it to Sreemangal for a long weekend. Three days of clothes fit with room to spare, and it still looks smart. Worth saving up for.",
      name: "Nusrat J.",
      city: "Sylhet",
      product: "Leather Weekender, Chestnut",
      rating: 5,
    },
  ],
};

export const offer = {
  eyebrow: "Eid edit · limited time",
  title: { text: "15% off travel pieces,", em: "for a few days only." } satisfies Emphasized,
  body: "Weekenders, passport holders and dopp kits. Applies at checkout with the code.",
  code: "EID15",
  endsAt: "2026-12-20T23:59:00+06:00",
  cta: { label: "Shop travel", path: "/categories/travel-bags" } satisfies Link,
};

export const faq = {
  eyebrow: "Questions",
  title: { text: "Before you", em: "order." } satisfies Emphasized,
  body: "Can’t find your answer? Message us and a real person from the workshop will reply.",
  contact: { label: "Contact us", path: "/pages/contact" } satisfies Link,
  items: [
    {
      q: "How long does delivery take?",
      a: "2–4 days inside Dhaka. We deliver nationwide; outside Dhaka it usually takes [X–Y] days. Delivery is free on orders over ৳ 5,000.",
    },
    {
      q: "Can I pay cash on delivery?",
      a: "Yes. Pay in cash when your order arrives, or pay in advance with bKash. Visa and Mastercard are accepted at checkout too.",
    },
    {
      q: "What does the 5-year warranty cover?",
      a: "Seams, straps, buckles and hardware that fail in normal use within five years of purchase. We repair or replace the piece. [Exclusions, e.g. accidental damage or wear and tear.]",
    },
    {
      q: "Can I return or exchange a piece?",
      a: "[Return window, condition and who pays return delivery.] Personalised pieces with stamped initials [can / cannot] be returned.",
    },
    {
      q: "Why do the colours look slightly different on each piece?",
      a: "Full-grain leather keeps the hide’s natural grain, so marks and tone vary from piece to piece. It darkens and softens as you use it.",
    },
    {
      q: "How should I care for my leather?",
      a: "Wipe with a dry cloth, let it air-dry away from direct sun if it gets wet in the rain, and condition it [every few months]. Our care guide has the details.",
    },
  ],
};

export const letters = {
  newsletter: {
    eyebrow: "Once a month",
    title: { text: "Join the", em: "workshop letter." } satisfies Emphasized,
    body: "New pieces before they’re listed, notes from the bench, and how to care for leather through monsoon season.",
    privacy: { label: "Privacy Policy", path: "/pages/privacy-policy" } satisfies Link,
  },
  partner: {
    eyebrow: "Partner programme",
    title: { text: "Become an affiliate partner.", em: "Earn on every referral." } satisfies Emphasized,
    body: "For writers, stylists and creators who already talk about well-made things. Commission terms on application.",
    cta: { label: "Apply to the programme", path: "/affiliate/apply" } satisfies Link,
  },
};

import type { SettingHelp } from "../settings/setting-help";

// Plain-language help for each feature flag, shown behind the info button on admin → Feature
// flags. Keep in step with premium-ec-backend/src/core/flags.ts (launchFlags) and the code that
// checks each flag. Flags whose feature isn't built say so, so nobody expects them to do anything.
//
// Inline text supports `code` and **bold**.

export type FlagHelp = SettingHelp & { status: "live" | "partial" | "planned" };

const planned = (what: string, why: string): FlagHelp => ({
  status: "planned",
  what,
  why,
  effects: ["**Nothing yet.** This feature isn't built, so turning the flag on doesn't change the store."],
  recommended: "Leave **off**. It's reserved so the feature can be released gradually once it's built.",
});

export const FLAG_HELP: Record<string, FlagHelp> = {
  reviews: {
    status: "live",
    what: "Customer product reviews: star ratings and written reviews on product pages.",
    why: "Reviews from real buyers build trust and are one of the strongest drivers of sales.",
    effects: [
      "**On:** product pages show ratings and reviews, and signed-in customers can write one.",
      "Review request emails are sent after delivery (Settings → Reviews → Request delay days).",
      "**Off:** the reviews section is hidden and the review endpoints answer “feature disabled”.",
      "Existing reviews are kept either way, and moderation (Catalog → Reviews & Q&A) keeps working.",
    ],
    recommended: "**On**, together with Settings → Reviews: “Require purchase” on, “Auto approve” off at first.",
    caution: "Check Reviews & Q&A regularly while auto-approve is off, or reviews wait unpublished.",
  },
  qna: {
    status: "live",
    what: "Product questions and answers: shoppers ask a question on the product page, staff answer it publicly.",
    why: "Answers to common questions (size, material, delivery) remove doubts before purchase and cut support messages.",
    effects: [
      "**On:** product pages show a Questions section where signed-in shoppers can ask.",
      "Questions wait in Catalog → Reviews & Q&A until staff answer and approve them.",
      "**Off:** the section is hidden and the question endpoints answer “feature disabled”.",
    ],
    recommended: "**On** if someone can answer questions within a day or two.",
    caution: "Unanswered questions look worse than none; only turn it on if you'll answer them.",
  },
  affiliates: {
    status: "live",
    what: "The affiliate program: people promote your products with their own links and earn commission on the orders they bring.",
    why: "Grows sales through influencers, bloggers and loyal customers, paying only for orders that actually happen.",
    effects: [
      "**On:** shoppers can apply from the footer link (Affiliate programme) and their account page.",
      "Approved affiliates get a dashboard with links, coupon codes, earnings and payouts.",
      "Orders that come through an affiliate link (`?ref=CODE`) or affiliate coupon are credited to them.",
      "**Off:** the program pages say it isn't open yet, and new orders aren't credited to affiliates.",
      "Admin screens (Marketing → Affiliates, Payout batches…) keep working either way.",
    ],
    recommended:
      "**On** once you've published an `affiliate-terms` page and set commission and payout settings (Settings → Affiliate).",
    caution: "Turning it off stops crediting new orders; earnings already recorded stay and can still be paid.",
  },
  realtime_dashboard: {
    status: "partial",
    what: "Live updates for the admin dashboard, pushed by the server instead of waiting for a reload.",
    why: "Lets a busy team watch orders and alerts arrive without refreshing.",
    effects: [
      "**On:** the API's live stream (`/v1/admin/dashboard/stream`) is available to staff.",
      "The admin dashboard doesn't use the stream yet; it still updates when you reload the page.",
      "**Off:** the stream answers “feature disabled”.",
    ],
    recommended: "Leave **off** for now; it has no visible effect until the dashboard uses it.",
    caution:
      "Live streams keep a connection open per viewer, which serverless hosts (e.g. Vercel) cut off after a while.",
  },

  loyalty: planned(
    "A loyalty program: customers earn points on orders and redeem them for discounts.",
    "Rewards repeat customers and encourages them to come back.",
  ),
  gift_cards: planned(
    "Digital gift cards customers can buy and redeem at checkout.",
    "Gift cards bring in new customers and sales around holidays and occasions.",
  ),
  subscriptions: planned(
    "Recurring orders: customers subscribe to receive a product on a schedule.",
    "Predictable repeat revenue for consumables.",
  ),
  b2b: planned(
    "Wholesale (business-to-business) buying: company accounts, price lists and bulk ordering.",
    "Serve trade and wholesale customers alongside retail shoppers.",
  ),
  split_shipments: planned(
    "Shipping one order in several parcels from different locations, chosen automatically.",
    "Faster delivery when stock is spread across warehouses.",
  ),
  cart_reservation: planned(
    "Holding stock for a short time while it's in a shopper's bag.",
    "Useful for limited drops and flash sales, so a shopper's item isn't sold while they check out. (Today stock is reserved when the order is placed.)",
  ),
  social_proof: planned(
    "Messages like “12 people are looking at this” or “Sold 30 times this week” on product pages.",
    "Social proof can increase urgency and confidence.",
  ),
  live_chat: planned(
    "A chat widget for shoppers to talk to your team.",
    "Answers questions in the moment of purchase.",
  ),
  ar_viewer: planned(
    "Viewing products in 3D or augmented reality on a phone.",
    "Helps shoppers judge size and look for furniture, decor and similar items.",
  ),
  appointments: planned(
    "Booking appointments (e.g. fittings or consultations) from the storefront.",
    "For stores that sell services or in-person experiences.",
  ),
  product_compare: planned("Comparing several products side by side.", "Helps shoppers choose between similar items."),
  gift_registry: planned(
    "Gift registries and wish lists for occasions like weddings, which friends can buy from.",
    "Brings in buyers through the registry owner's guests.",
  ),
  popup_builder: planned(
    "Building pop-ups (newsletter sign-up, offers) in admin and showing them to chosen visitors.",
    "Captures email sign-ups and promotes offers.",
  ),
};

// How flags work in general, shown above the list.
export const FLAG_BASICS: { title: string; text: string }[] = [
  {
    title: "On / off",
    text: "The switch turns the feature on for its audience (everyone, unless the flag has targeting). The API applies changes within about 30 seconds; storefront pages follow straight away when the backend worker is running, otherwise within a few minutes.",
  },
  {
    title: "Audience (targeting)",
    text: "Open a flag to limit it to certain markets, channels, customer groups or specific customers, or to a percentage of shoppers for a gradual rollout. A shopper always gets the same answer for a percentage.",
  },
  {
    title: "Kill switch",
    text: "Turns the flag off everywhere at once, whatever its targeting. Use it when a feature misbehaves; clear it to restore the previous audience.",
  },
  {
    title: "Planned flags",
    text: "Flags marked “Not built yet” are placeholders for future features. Turning them on currently does nothing.",
  },
];

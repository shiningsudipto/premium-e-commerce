// Plain-language help for each store setting, shown behind the info button on admin → Settings.
// Keep in step with premium-ec-backend/src/contracts/settings.ts (keys, defaults, behavior).
//
// Inline text supports `code` and **bold** (rendered by the settings screen).

export type SettingHelp = {
  // what the setting is, in one or two sentences
  what: string;
  // why a store would change it
  why: string;
  // what changes in the store when it's set
  effects: string[];
  // a sensible value and the reasoning
  recommended: string;
  // pitfalls, side effects or dependencies
  caution?: string;
};

const MINOR = "Amounts are in **minor units** (paisa): ৳1,000 is `100000`.";

export const SETTING_HELP: Record<string, SettingHelp> = {
  // ── Store ──────────────────────────────────────────────────────────────────
  "store.name": {
    what: "Your store's name as customers see it.",
    why: "Set it to your real brand name before launch; it replaces the placeholder “Premium EC”.",
    effects: [
      "Shown in page titles, the header logo text and the footer.",
      "Used as `{{storeName}}` in every customer email (subjects and signatures).",
      "Can differ per market if you trade under different names.",
    ],
    recommended: "Your brand name exactly as on your packaging and social pages, e.g. “StrategyByte Store”.",
  },
  "store.support_email": {
    what: "The inbox that receives customers' replies to store emails.",
    why: "Customers often reply to an order or shipping email with a question. Without a real reply address, those replies go nowhere.",
    effects: [
      "Set as the **Reply-To** on every customer email (order updates, password reset, reminders), so replies land here.",
      "The placeholder `support@example.com` is ignored, so replies then go to the sender address.",
    ],
    recommended: "A shared inbox your team reads daily, e.g. `support@yourstore.com`, not a personal address.",
    caution: "Emails are still sent **from** the backend's `EMAIL_FROM` address; this only changes where replies go.",
  },

  // ── Checkout ───────────────────────────────────────────────────────────────
  "checkout.guest_enabled": {
    what: "Whether shoppers can buy without creating an account.",
    why: "Forcing sign-up is one of the most common reasons people abandon checkout. Guest checkout usually sells more.",
    effects: [
      "**On:** anyone can check out with just an email, phone and address.",
      "**Off:** shoppers must sign in or register before paying.",
      "Can be set per market or sales channel.",
    ],
    recommended: "**On.** Offer account creation after the order instead of before it.",
    caution: "Turn it off only if you sell to approved buyers (e.g. wholesale) or need verified accounts.",
  },

  // ── Cart ───────────────────────────────────────────────────────────────────
  "cart.merge_strategy": {
    what: "What happens to the bag a shopper filled while signed out, when they then sign in to an account that already has a bag.",
    why: "Decides whether items picked as a guest are kept, so nothing the shopper chose silently disappears.",
    effects: [
      "**merge:** both bags are combined; the same item's quantities are added together.",
      "**replace:** the signed-out bag becomes the bag; the account's older bag is set aside.",
      "**keep_customer:** the account's bag is kept; the signed-out items are dropped.",
      "If the account has no bag yet, the signed-out bag simply becomes theirs.",
    ],
    recommended: "**merge.** Shoppers expect everything they added to still be there after signing in.",
  },
  "cart.abandoned_after_minutes": {
    what: "How long a bag must sit untouched before it counts as abandoned and can get a reminder email.",
    why: "Too short feels pushy (the shopper may still be browsing); too long and they've forgotten or bought elsewhere.",
    effects: [
      "A background job checks carts regularly and picks those idle for at least this long (and active within the last 7 days).",
      "Each bag gets **one** reminder at most.",
      "Only applies when “Abandoned emails enabled” is on.",
    ],
    recommended: "**60–180 minutes.** One to three hours is the common sweet spot.",
    caution: "Minimum 15. Needs the backend worker running.",
  },
  "cart.abandoned_emails_enabled": {
    what: "Turns the abandoned-cart and abandoned-checkout reminder emails on or off.",
    why: "Many shoppers add items and leave. A single, well-timed reminder with a link back to their bag recovers a share of those sales for free.",
    effects: [
      "Sends “You left something in your cart”, or “Finish your order” if they had already entered a delivery address.",
      "The email links to their exact bag (`/cart/recover`); the link works for 7 days.",
      "Only to shoppers whose email is known **and** who accepted marketing.",
      "Emails are in the shopper's language (English or Bangla); edit them in Notifications.",
    ],
    recommended: "**On**, once email sending (Brevo) and the worker are set up.",
    caution: "Without the worker running, nothing is sent even when this is on.",
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  "analytics.product_activity_enabled": {
    what: "Records which products shoppers open and add to their bag, for the **Product activity** report (Sales → Product activity).",
    why: "Shows what's popular and what needs attention: products many people look at but don't add, items added but not bought, and popular products running low.",
    effects: [
      "**On:** each product page view and each add to the bag is recorded with an anonymous visitor ID (no name, email or phone).",
      "**Off:** nothing new is recorded; data collected earlier stays in the report until it expires.",
      "Signed-in shoppers' events are linked to their account, the same way orders are.",
      "Events are kept for the analytics retention period (`ANALYTICS_RETENTION_DAYS`, 400 days by default), then deleted automatically.",
      "Takes about a minute to start or stop on the storefront after you save.",
    ],
    recommended:
      "**On** once you're ready to use the report. Mention anonymous usage analytics in your privacy policy.",
    caution: "Needs MongoDB connected to the backend (`MONGODB_URI`), where the events are stored.",
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  "inventory.low_stock_threshold": {
    what: "The stock level at which a product counts as running low, for products that don't set their own threshold.",
    why: "Gives you time to reorder before something sells out.",
    effects: [
      "When available stock drops to this number, an `inventory.low_stock` event is raised.",
      "That event can trigger a Workflow rule (e.g. email the buyer) or a webhook.",
      "A threshold set on a product or stock level overrides this default.",
    ],
    recommended: "Roughly the number you sell during your restock lead time. **5** suits most small stores.",
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  "orders.number_prefix": {
    what: "Characters shown before every order number, e.g. `#` gives #1001.",
    why: "A recognizable prefix helps customers and staff quote orders; different channels can use different prefixes.",
    effects: [
      "Shown on order pages, emails, invoices and admin lists.",
      "Can differ per sales channel (e.g. `WEB-` and `POS-`).",
      "Changing it affects how all orders are displayed, including old ones; the numbers themselves never change.",
    ],
    recommended: "`#` or a short brand code like `SB-`. Keep it under 5 characters.",
  },
  "orders.pending_payment_ttl_minutes": {
    what: "How long an online-payment order may wait for payment before it's cancelled automatically.",
    why: "An unpaid order holds stock. Releasing it after a while puts those items back on sale.",
    effects: [
      "Orders still unpaid after this many minutes are cancelled and their stock is released.",
      "**Cash on delivery and other pay-later orders are never auto-cancelled.**",
      "`0` turns automatic cancellation off.",
    ],
    recommended: "**60** minutes. Long enough to finish a mobile-banking payment, short enough not to block stock.",
    caution: "Needs the backend worker running.",
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  "payments.manual.enabled": {
    what: "Offers the manual payment method at checkout: cash on delivery or a bank transfer you confirm by hand.",
    why: "Cash on delivery is how most online orders are paid in Bangladesh; without it many shoppers won't buy.",
    effects: [
      "**On:** the method appears at checkout under the label below.",
      "Orders placed with it wait as “pending payment” until staff mark them paid (e.g. when the courier remits).",
      "Can be turned on or off per market.",
    ],
    recommended: "**On** for Bangladesh.",
    caution: "Manual orders hold stock until shipped or cancelled; review unconfirmed orders regularly.",
  },
  "payments.manual.label": {
    what: "The name of the manual payment method shown at checkout.",
    why: "Say plainly what the customer will do, so there are no surprises at delivery.",
    effects: ["Shown as the payment option at checkout and on the order."],
    recommended: "“Cash on delivery” (or “ক্যাশ অন ডেলিভারি” for the Bangla market).",
  },
  "payments.manual.instructions": {
    what: "What the customer should do to pay, shown after they order.",
    why: "Clear instructions reduce failed deliveries and support questions.",
    effects: ["Included in the order confirmation email for orders paid this way."],
    recommended:
      "One or two short sentences, e.g. “Pay the courier in cash when your order arrives. Please keep exact change ready.”",
  },

  // ── Search ─────────────────────────────────────────────────────────────────
  "search.min_query_length": {
    what: "The fewest characters a search must have before results are shown.",
    why: "Very short searches (one letter) match almost everything and waste server work.",
    effects: ["Searches and suggestions shorter than this return nothing."],
    recommended: "**2.** Use 3 if your catalog is very large.",
  },
  "search.stop_words": {
    what: "Words ignored when searching, such as “the” or “for”.",
    why: "Common filler words add noise and can push good matches down.",
    effects: ["Listed words are removed from the search before matching.", "Applies to all languages."],
    recommended:
      "Leave empty unless you see poor results; then add filler words customers often type (e.g. “the”, “and”, “for”).",
    caution: "Don't add words that are part of product names, or those products become harder to find.",
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  "notifications.from_name": {
    what: "The sender name customers see on emails from the store.",
    why: "A familiar name makes emails more likely to be opened, and less likely to be marked as spam.",
    effects: [
      "Shown as the “From” name on every customer email; the address stays the backend's `EMAIL_FROM`.",
      "Overrides the sender name saved in Brevo.",
      "Can differ per market.",
    ],
    recommended: "Your store name, the same as “Store name”.",
  },

  // ── Promotions ─────────────────────────────────────────────────────────────
  "promotions.evaluation_order": {
    what: "The order in which several promotions are applied to one cart.",
    why: "When discounts stack, order changes the final price; this makes it predictable.",
    effects: [
      "**layers:** automatic promotions first, then promotions from codes; within each, by priority.",
      "**priority:** one list, ordered by each promotion's priority only.",
    ],
    recommended: "**layers.** Customers expect site-wide offers to apply before their code.",
  },
  "promotions.max_codes_per_cart": {
    what: "How many promotion codes a shopper can enter on one cart.",
    why: "Limits discount stacking that could make orders unprofitable.",
    effects: ["Extra codes beyond this are refused at the bag.", "Automatic promotions don't count towards the limit."],
    recommended: "**1.** Raise it only if you deliberately design codes that combine.",
  },

  // ── Reviews ────────────────────────────────────────────────────────────────
  "reviews.auto_approve": {
    what: "Publishes product reviews immediately instead of waiting for a moderator.",
    why: "Saves moderation time, at the risk of spam or abusive reviews going live.",
    effects: ["**On:** reviews appear at once.", "**Off:** reviews wait in Reviews & Q&A until approved."],
    recommended:
      "**Off** until you're confident in your traffic, then consider turning it on together with “Require purchase”.",
  },
  "reviews.require_purchase": {
    what: "Only customers who bought the product can review it.",
    why: "Verified-buyer reviews are more trustworthy and much harder to fake.",
    effects: [
      "Shoppers without a purchase of that product can't submit a review.",
      "Reviews from buyers are marked as verified either way.",
    ],
    recommended: "**On** for most stores, especially if you auto-approve reviews.",
  },
  "reviews.request_delay_days": {
    what: "How many days after delivery the store emails the customer asking for a review.",
    why: "Asking after they've used the product gets more and better reviews.",
    effects: [
      "One email listing the products they haven't reviewed yet, with links.",
      "Needs the `reviews` feature flag on.",
      "`0` turns the emails off.",
    ],
    recommended: "**7** days. Long enough to try the product, while the purchase is still fresh.",
    caution: "Needs email sending and the backend worker.",
  },

  // ── Returns ────────────────────────────────────────────────────────────────
  "returns.window_days": {
    what: "How many days customers have to request a return.",
    why: "Sets your return policy in the system so it's applied consistently.",
    effects: [
      "Counted from delivery (or shipping, or the order date if those aren't recorded).",
      "Requests after the window are refused.",
      "Can differ per market.",
    ],
    recommended: "Match your published return policy; **7–14 days** is common in Bangladesh, 30 for premium goods.",
  },
  "returns.auto_approve": {
    what: "Approves eligible return requests without staff review.",
    why: "Saves time when returns are routine and low risk.",
    effects: [
      "**On:** eligible requests go straight to approved.",
      "**Off:** each request waits for staff in Returns.",
    ],
    recommended: "**Off** while volumes are small, so you can check reasons and photos.",
  },
  "returns.final_sale_tag": {
    what: "The product tag that marks items as non-returnable.",
    why: "Clearance, personalized or hygiene items often can't be returned.",
    effects: ["Products with this tag can't be included in a return request."],
    recommended: "Keep `final-sale` and add it to the relevant products' tags.",
  },
  "returns.store_credit_bonus_percent": {
    what: "Extra value given when a customer chooses store credit instead of a refund.",
    why: "Encourages customers to shop again instead of taking the money back.",
    effects: ["e.g. **10** gives ৳1,100 of credit for a ৳1,000 return."],
    recommended: "**0–10** percent.",
  },

  // ── Privacy ────────────────────────────────────────────────────────────────
  "privacy.deletion_grace_days": {
    what: "Days between a customer asking to delete their account and their data being anonymized.",
    why: "Protects against mistakes and account takeovers while still honoring the request.",
    effects: [
      "The customer can cancel the request during this period.",
      "Afterwards personal data is anonymized; order records are kept for accounting without personal details.",
    ],
    recommended: "**14** days.",
    caution: "Needs the backend worker running.",
  },

  // ── Affiliates ─────────────────────────────────────────────────────────────
  "affiliate.terms_version": {
    what: "The version label of your current affiliate terms.",
    why: "When the terms change, affiliates must accept the new version before earning again.",
    effects: [
      "Changing it asks every affiliate to accept the terms again in their dashboard.",
      "Until they do, their dashboard shows the terms prompt instead of their data.",
    ],
    recommended: "A date like `2026-11`. Change it **only** when the terms page actually changes.",
  },
  "affiliate.cookie_days": {
    what: "How long after clicking an affiliate's link an order still earns them commission.",
    why: "Shoppers often think it over; a window credits the affiliate who sent them.",
    effects: ["Orders placed within this many days of the click are attributed to that affiliate."],
    recommended: "**30** days, the industry standard.",
  },
  "affiliate.attribution_model": {
    what: "Which affiliate gets the order when a shopper clicked several affiliates' links.",
    why: "Defines fairly who is rewarded.",
    effects: ["**last_click:** the most recent click wins.", "**first_click:** the first click wins."],
    recommended: "**last_click**, the most common and easiest for affiliates to understand.",
  },
  "affiliate.new_customers_only": {
    what: "Pays commission only for customers placing their first order.",
    why: "Stops paying for customers you already had.",
    effects: ["Orders from shoppers with earlier orders aren't attributed."],
    recommended:
      "**Off** to start, so affiliates feel rewarded; turn on if you see existing customers routed through links.",
  },
  "affiliate.hold_days": {
    what: "How long an earned commission waits before it can be paid.",
    why: "Lets returns and refunds happen first, so you don't pay commission on orders that come back.",
    effects: ["Earnings stay pending for this many days, then become approved and payable."],
    recommended: "At least your return window, e.g. **14** days.",
  },
  "affiliate.hold_starts_at": {
    what: "When the hold period starts counting.",
    why: "With cash on delivery, payment and delivery happen together, so delivery is the safe point.",
    effects: ["**delivered:** from delivery (safest).", "**paid:** from payment (faster for prepaid orders)."],
    recommended: "**delivered.**",
  },
  "affiliate.commission_basis_excludes": {
    what: "What is subtracted from an order line before commission is calculated.",
    why: "Usually you pay commission on the goods, not on tax or delivery charges.",
    effects: ["Ticked items (tax, shipping, discounts) are excluded from the commission base."],
    recommended: "Exclude **tax** and **shipping**.",
  },
  "affiliate.payout_min_minor": {
    what: "The smallest approved balance an affiliate can be paid.",
    why: "Avoids many tiny transfers and their fees.",
    effects: ["Balances below this stay until they reach it.", MINOR],
    recommended: "e.g. `50000` (৳500).",
  },
  "affiliate.suspended_pending_earnings": {
    what: "What happens to a suspended affiliate's not-yet-approved earnings.",
    why: "Suspension usually means suspected fraud or a terms breach.",
    effects: ["**hold:** kept pending until you decide.", "**forfeit:** cancelled."],
    recommended: "**hold**, so you can review before deciding.",
  },
  "affiliate.code_beats_cookie": {
    what: "When an order has one affiliate's coupon code but another affiliate's link cookie, which wins.",
    why: "A code typed at checkout is the strongest sign of who influenced the purchase.",
    effects: ["**On:** the coupon code's affiliate gets the order.", "**Off:** the link cookie decides."],
    recommended: "**On.**",
  },
  "affiliate.tier_period_days": {
    what: "The rolling period of sales used to move affiliates between tiers.",
    why: "Tiers reward recent performance.",
    effects: ["Automatic tier changes and period-based commission tiers look at sales in this many days."],
    recommended: "**90** days.",
  },
  "affiliate.margin_cap_enabled": {
    what: "Prevents commission plus discounts from pushing a sale below cost plus a minimum margin.",
    why: "Stops promotions and commissions together from making orders lose money.",
    effects: ["Uses each product's cost price; see “Margin min percent” and “Margin cap behavior”."],
    recommended: "**On** once product cost prices are filled in.",
    caution: "Products without a cost price can't be protected.",
  },
  "affiliate.margin_min_percent": {
    what: "The minimum profit over cost (as a percent of cost) the margin cap protects.",
    why: "Defines what “too little profit” means for your store.",
    effects: ["e.g. **10** means a ৳1,000-cost item must still leave at least ৳100 after discounts and commission."],
    recommended: "**10–20** percent.",
  },
  "affiliate.margin_cap_behavior": {
    what: "What happens when an order would break the margin cap.",
    why: "Choose between protecting margin automatically or reviewing case by case.",
    effects: [
      "**reduce:** commission is lowered to fit.",
      "**flag:** commission is paid in full and the order goes to Fraud review.",
    ],
    recommended: "**reduce.**",
  },
  "affiliate.payout_schedule": {
    what: "How affiliates get paid.",
    why: "Sets expectations and your team's workload.",
    effects: [
      "**monthly / weekly:** staff create payout batches on that rhythm.",
      "**on_request:** affiliates ask for a payout from their dashboard.",
    ],
    recommended: "**monthly.**",
  },
  "affiliate.fraud_refund_rate": {
    what: "Flags affiliates whose referred orders are refunded too often.",
    why: "A high refund rate can mean fake or incentivized orders.",
    effects: ["Affiliates at or above this refund rate over 30 days (minimum 5 orders) go to Fraud review."],
    recommended: "**0.3** (30%).",
  },
  "affiliate.fraud_click_spike": {
    what: "Flags affiliates with many clicks in a day and no sales.",
    why: "Sudden click floods without orders usually mean bots or click fraud.",
    effects: ["Affiliates with at least this many clicks in a day and no conversions go to Fraud review."],
    recommended: "**500**, adjusted to your traffic.",
  },

  // ── Approvals ──────────────────────────────────────────────────────────────
  "approvals.refund_threshold_minor": {
    what: "Refunds above this amount need a second staff member to approve.",
    why: "The “four-eyes” rule protects against mistakes and misuse on large refunds.",
    effects: [
      "Larger refunds wait in Approvals until another staff member approves them.",
      "Empty turns the rule off.",
      MINOR,
    ],
    recommended: "e.g. `1000000` (৳10,000).",
  },

  // ── Webhooks ───────────────────────────────────────────────────────────────
  "webhooks.max_failures": {
    what: "How many failed deliveries in a row turn a webhook endpoint off.",
    why: "Stops retrying a broken receiver forever.",
    effects: [
      "After this many consecutive failures the endpoint is disabled and a `webhook.disabled` event is raised.",
      "Fix the receiver, enable it again and replay missed deliveries (see the Webhooks guide).",
    ],
    recommended: "**15.**",
  },
};

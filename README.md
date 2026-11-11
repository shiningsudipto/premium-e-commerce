# premium-ec

The storefront and the back office in one Next.js 16 app (Cache Components, `proxy.ts`), with Tailwind 4 and shadcn/ui, talking to the Express API in `../premium-ec-backend`. Shoppers use `/{locale}-{market}/…`; staff use `/admin`. Plan: `../premium-ecommerce-implementation-plan-frontend.md`.

## Running it

1. Start the API and its worker in `premium-ec-backend` (`npm run dev`, `npm run dev:worker`).
2. `cp .env.example .env.local`, then set `REVALIDATE_SECRET`. Use the same value as the backend's `REVALIDATE_SECRET`, and set the backend's `STOREFRONT_REVALIDATE_URL=http://localhost:3000/api/revalidate`.
3. `npm install`, then `npm run dev`. Open http://localhost:3000, which redirects to `/en-bd`. The back office is at http://localhost:3000/admin; sign in as staff (the seed creates the Owner from `SEED_OWNER_EMAIL`).

| Script                                | What it does                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build`               | Dev server on :3000 / production build (prerenders each market's pages)                                    |
| `npm test`                            | Vitest: proxy, session and pure helpers, storefront and admin (the API is mocked)                          |
| `npm run test:e2e`                    | Playwright: storefront on desktop and mobile, admin on desktop; needs the API and worker                   |
| `npm run api:generate`                | From the backend's `openapi.json` (or `OPENAPI_SOURCE`): server-side types and the admin's RTK Query hooks |
| `npm run typecheck`, `lint`, `format` | `tsc`, ESLint, Prettier                                                                                    |

## How it fits together

- **Market prefix.** Every page lives under `/{locale}-{market}/`, for example `/en-bd` or `/bn-bd`. `proxy.ts` picks the prefix for URLs without one: a remembered cookie first, then the visitor's country header, then `DEFAULT_MARKET`. It passes `x-market`, `x-locale`, `x-channel` and `x-request-id` downstream. Server code reads the segment with `next/root-params`.
- **Caching.** Store config, markets, flags and the theme are `"use cache"` functions tagged `config` and `theme` (`src/lib/store-data.ts`), so pages prerender. The API's worker calls `POST /api/revalidate` with the shared secret, and tagged data refreshes on the next visit (stale-while-revalidate, `revalidateTag(tag, "max")`).
- **Sessions (ADR 0012 in the backend).** The app has no API routes of its own apart from `/api/revalidate`.
  - The API owns the session cookies (`pe_at`, `pe_rt`, `pe_guest` for shoppers): its `/v1/store/session/*` endpoints set and clear them, httpOnly, so tokens never reach JavaScript. Browser code calls the API directly with credentials, and the API refuses cookie-authenticated writes from origins outside `CORS_ORIGINS`.
  - Server Components read the cookie and pass the token on, server to server.
  - `proxy.ts` refreshes an expired session before rendering by calling `/v1/store/session/refresh` with the browser's cookies, then passes the API's `Set-Cookie` headers on (`src/lib/session/api-session.ts`).
  - Add to bag starts a guest session the same way when there's none.
  - The API revokes a whole session when a rotated refresh token is reused, so concurrent refreshes of one token share a single call (`src/lib/session/refresh.ts`). That works within one Node process; with several instances, use sticky sessions.
  - Deployments serve the API and the web app on the same site (for example `api.example.com` and `www.example.com`, with the backend's `COOKIE_DOMAIN=.example.com`). `NEXT_PUBLIC_API_URL` is the API as browsers reach it.
- **Theme.** The active theme's CSS variables and custom CSS are inlined in the root layout after `globals.css`, whose `@theme` uses the same names. Fraunces and Figtree are self-hosted with `next/font`; when a theme names them, its font stacks are pointed at the bundled files. Other families a theme names load from Google Fonts at weights 400 and 700.
- **i18n.** `next-intl` with messages in `messages/{locale}.json`. Missing keys fall back to English (`src/i18n/messages.ts`).
- **Flags.** `isEnabled(key)` in Server Components (per shopper, request-time), `useFlag(key)` in Client Components (per market, cached).

## Admin (`/admin`)

The back office is the `app/(admin)` route group. It's a second root layout with its own `<html>`, fonts (IBM Plex) and stylesheet (`app/(admin)/admin.css`), so its shadcn tokens and the storefront's theme tokens never meet. Moving between the two areas is a full page load. Its code lives in `src/admin/` and reuses the storefront's env, generated API types and session refresh.

- **Routes.** `/admin/login`, `/admin/mfa` and `/admin/mfa/enroll` (route group `(auth)`). The console shell (route group `(console)`) holds the dashboard, orders, customers, segments, returns, reports, products, categories, collections, inventory, reviews & Q&A, import & export, promotions, affiliates, pages, theme, menus, redirects, notifications, settings, shipping, tax, payments, flags, staff, roles and audit. Screens live in `src/admin/features/<area>`. The static `admin` segment wins over `[market]`.
- **B-Phase 2 screens.**
  - **Promotions** (`/admin/promotions`): the builder (nested all/any condition groups and every engine condition, every action type, stacking, schedule and limits), codes (paste or generate, disable), a simulator with a sample cart and a debug view of what applied and why not, and performance. `/admin/promotions/simulator` tests all promotions at once.
  - **Pages** (`/admin/pages`): the page builder. Block outline with drag and drop (native events) and keyboard moves, a library from `GET /v1/admin/blocks`, forms generated from each block's JSON Schema (`SchemaField` gained object lists, date-times and custom renderers), per-block visibility (breakpoints, audience, schedule, experiment), SEO, version-checked drafts, publish/schedule/unpublish/archive, versions with rollback, and a preview link (`/api/preview?...`).
  - **Theme** (`/admin/theme`): token editor (colours light/dark, typography, shape) with WCAG contrast warnings and a scoped live preview, custom CSS with `theme.css.write`, activation per channel.
  - **Segments** (`/admin/segments`): rule builder for every segment field, preview of matches, refresh. Customers gained tags, group, groups management, data export and anonymize (typed confirmation).
  - **Reviews & Q&A** (`/admin/reviews`): moderation queue with replies, answers and bulk approve/reject. **Returns** (`/admin/returns`): queue and a detail page that only offers the steps the return's state allows (decision, shipping, inspection, settlement).
  - **Import & export** (`/admin/data`): upload, column mapping, dry-run report (downloadable), import with job status; exports; job history. **Reports** (`/admin/reports`): KPIs vs the previous period, sales over time (accessible SVG chart with a table view), products, promotions, search and customers, each with CSV.
  - **Affiliates** (`/admin/affiliates`): applications queue and list, profile (status actions, codes, ledger, adjustments, payouts from prepare to paid), and `/admin/affiliates/program` for tiers and versioned commission rules.
- **Sessions.** The staff session is separate from the shopper's:
  - The API sets `pa_at` and `pa_rt`, plus `pa_mfa` between password and code, on `/v1/admin/session/*`. The sign-in screens call those endpoints, and the API only accepts these cookies on `/v1/admin/*`.
  - `proxy.ts` sends `/admin` requests to `src/admin/lib/session/proxy.ts`. It redirects signed-out staff to `/admin/login?next=…` and refreshes expired sessions through the API. Admin pages never get a market prefix.
- **Data (RTK Query).** No endpoints are written in the frontend.
  - `npm run api:generate` generates hooks for every `/v1/admin` endpoint into `src/admin/store/api.generated.ts` (config: `openapi-config.cjs`).
  - The hooks call the API directly with `credentials: "include"`.
  - OpenAPI tags become cache tags, so a mutation refetches the lists of its area.
  - The base query (`src/admin/store/base-api.ts`) refreshes the session once on an expired token, sharing one refresh between parallel requests, and sends the browser to sign-in if that fails.
  - The store is created per request and per tab (`src/admin/store/store.tsx`). The admin layout renders at request time, so nothing user-specific is prerendered.
  - `<Can permission>` and the sidebar hide what a role can't use; the API still checks every call.
- **Building blocks** (`src/admin/components`):
  - `DataTable`: cursor pagination, filters kept in the URL, saved views and bulk actions.
  - `SchemaField`: forms generated from JSON Schema.
  - `AuditDiff`: a field-level before/after view.
- **End-to-end tests** (`e2e/admin`). `purchase.spec.ts` is the B-Phase 1 exit test: a guest buys, then staff fulfil the order. To test a production build without touching the dev servers, run a separate stack (API on another port with `CORS_ORIGINS` set, `next build` with `API_URL`/`NEXT_PUBLIC_API_URL`, `next start --port 3100`) and set `STOREFRONT_URL` and `API_URL`. With `STOREFRONT_URL` set, Playwright doesn't start a dev server. They create temporary staff through the backend's `src/scripts/e2e-staff.ts` and delete them afterwards; after an interrupted run, `npx tsx src/scripts/e2e-staff.ts cleanup` in the backend removes leftovers. The API allows 20 sign-ins per 15 minutes per IP, so start it with `RATE_LIMIT_ENABLED=false` for repeated local runs.

## Home page and design system

The home page implements the Premium Touch design (`../Home — Desktop 1440-html` and `../Home — Mobile 390-html`). It's one responsive page, mobile-first, with breakpoints at 768, 1024, 1280 and 1536.

- **Styles.** `src/styles/premium-touch/` holds the design's stylesheet, split into one partial per block and imported into the `components` layer of `globals.css`. Its colour, font and radius tokens are renamed onto the theme API's palette, so editing the theme in the admin restyles the storefront:
  - oxblood is `primary`, cream is `secondary` and teal is `accent`;
  - paper, ink and lines map to `background`, `foreground` and `border`.

  Tokens that are only in the design (tobacco, swatches, spacing, type scale) live in `tokens.css`. The design's `.container` is called `.pt-container`, because Tailwind has a `container` utility.

- **Blocks.** Each section is a component in `src/blocks/` that takes typed props:
  - Server Components: hero, collection list, gift-set promo, craft, story, promo cards, testimonials and FAQ.
  - A Server Component with a small Client Component for interaction: product shelf (tabs and Quick add), spotlight (gallery, colour and Add to bag), offer (live countdown and copy code) and letters (newsletter form).
- **Data.**
  - From the API, cached and revalidated by tag: products (`featured` and `newest`), the spotlight product, the `main` menu, store config and theme.
  - From `src/content/home.ts` and `src/content/site.ts`: editorial copy, shaped as block props so the page builder can supply it later.
  - Photo slots use `<Media>`, which renders `next/image` when a product has photos and the design's line drawings otherwise.
- **Not wired yet:**
  - The newsletter form validates addresses, but the API has no sign-up endpoint, so it answers "Sign-ups open soon".
  - Collection tile counts are content.

## Shopping (B-Phase 1)

- **Listings** (`/products`, `/categories/[handle]`, `/collections/[handle]`, `/search`): filters, sort and page live in the URL (`src/features/catalog/listing-query.ts`), so every state can be linked and is crawlable. Option and attribute facets come from the API. The heading is prerendered, and the products stream in behind `<Suspense>`.
- **Product page** (`/products/[handle]`): cached per product (tag `product:handle:…`). Stock is fetched by the browser from `/v1/store/products/{handle}/availability`, so the page itself stays static. The variant picker keeps your other choices where that combination exists (`src/features/product/variants.ts`). The page also renders JSON-LD (Product, Offer, AggregateRating, BreadcrumbList) and related products from `/v1/store/recommendations`.
- **Search typeahead.** The header's search button opens a dialog that asks the API's `/search/suggest` directly, after a short pause in typing. Arrow keys move through suggestions, and Enter opens one or searches.
- **Bag.** Managed in the browser with RTK Query (`src/features/cart/cart-api.ts`), calling the API directly with its session cookies, like the admin:
  - One Redux store per tab and market (`bag-store.tsx`), provided by `BagProvider` in the shop layout. The cached `getBag` feeds the drawer, the `/cart` page and the header count, and every bag change updates it, so nothing is re-rendered on the server.
  - Add to bag, Quick add and the spotlight start a guest session (`/v1/store/session/guest`) when there's none, then open the drawer.
  - Quantity and remove update the cache at once, then settle to the API's repriced cart (rolled back if refused). Writes run one at a time with `keepalive`, so quick changes reach the API in order and finish even if the shopper leaves the page.
  - An expired customer session is refreshed once and the call retried. The API reports `TOKEN_EXPIRED` in that case rather than falling back to the guest cookie, so items never land in the wrong bag.
  - The server still reads the bag for the first render (`bag.ts`: header count, `/cart`). The header count switches to the cached bag once the browser has it.
  - Checkout steps stay Server Actions.
- **Checkout** (`app/[market]/(checkout)`, a minimal header with no footer):
  - Steps: contact and address, then delivery method, then payment and notes.
  - Place order sends an `Idempotency-Key` made once per attempt, so retries never create two orders. It then redirects to `/checkout/confirmation/[orderId]`, which only the shopper who placed the order can open.
  - Guest checkout follows the API's setting.
- **Account** (`/account/…`):
  - Sign-in, registration and sign-out are Server Actions. They call the API's `/v1/store/session/*` and pass its cookies on to the browser. Sign-in merges the guest bag into the account, and `?next=` only follows paths on this site.
  - Password reset uses the link in the email (`/account/reset-password?token=…`).
  - The signed-in area (profile, password, address book, orders and order detail with shipments and timeline) redirects visitors to sign-in.
- **CMS pages** (`/pages/[handle]`): see B-Phase 2 below.
- **SEO.**
  - `app/sitemap.ts` lists every product, category, collection and page in every market and language, with hreflang alternates.
  - `app/robots.ts` disallows everything outside production.
  - `proxy.ts` applies the admin's redirects from a table it refreshes every minute (`src/lib/redirects.ts`). Rules are written without the market prefix.

## Growth (B-Phase 2)

- **Promotion codes** (`src/features/cart/promo-codes.tsx`): on the bag page (RTK Query) and at checkout (Server Actions). Each code shows its saving, or why it isn't applying yet, in shopper terms (`promotions.ts` turns the API's reasons into messages, e.g. "Spend ৳5,000 or more"). How many codes are allowed is the API's `promotions.max_codes_per_cart` setting.
- **CMS pages** (`src/blocks/cms`): every block type in the API's registry renders: hero (with image), rich text, image, video (YouTube/Vimeo privacy embeds or a file), carousel, product grid (category, collection or hand-picked), collection list, testimonials, FAQ, accordion, tabs, countdown, newsletter, columns, spacer, global sections and custom HTML. Unknown types render nothing.
  - The store page API resolves what blocks reference (image URLs, global sections, hand-picked product cards), so a page renders from one cached fetch. Pages are tagged with the sections they include (`section:{handle}`) and, with hand-picked products, `products`.
  - `hideOn` hides a block per breakpoint. Market and schedule rules apply to the shared cached page; blocks aimed at signed-in shoppers, new visitors (no session yet) or segments are decided per visitor inside their own Suspense boundary (`visitor.ts`). Experiment-variant blocks wait for the A/B bucket (B-Phase 3).
  - **Preview:** the admin's preview link is `/api/preview?handle=&token=&market=`. The route checks the signed token with the API, turns on Draft Mode and keeps the token in an httpOnly cookie; the page then shows the draft with a "Leave preview" link (`/api/preview?exit=1`). Everyone else keeps getting the cached published page.
- **Reviews and Q&A** (flags `reviews`, `qna`; `src/features/reviews`): rating summary and bars, reviews with verified-buyer badge, merchant reply and helpful votes, review form (signed-in customers, keyboard star rating), questions with answers and an ask form. Each section is its own Suspense boundary under the cached product page; lists are cached per product and tagged `product:handle:{handle}` (sent by the worker on moderation) and `reviews:{handle}`.
- **Returns** (`src/features/returns`): `/account/returns` lists every return (`GET /v1/store/account/returns`), and an order's page has "Request a return": lines and quantities still returnable, reason, refund or store credit. Shoppers only receive the shopper-facing return fields.
- **Wishlists** (`src/features/wishlist`): a heart on product cards and pages saves to the customer's default list; `/account/wishlists` manages named lists, sharing and moving pieces to the bag; `/wishlists/shared/[token]` shows a shared list read-only. Browser state uses RTK Query on the bag's store. Hearts only query the API once the header reports a signed-in customer (`shopper-session.tsx`), so cached pages never depend on the session.
- **Affiliate program** (flag `affiliates`): `proxy.ts` turns `?ref=CODE&sub=…` into the httpOnly `pe_ref` cookie (first and last click), redirects to the clean URL and sends the click beacon. The referral goes on the cart with the checkout details and when checkout opens, so the total shown already includes it. Customers apply at `/account/affiliate`; approved affiliates get the dashboard at `/affiliate` (stats, link and QR builder, orders without buyer details, earnings, payouts).

## Layout

```
proxy.ts                 /admin → staff sign-in gate; everything else: market prefix, context headers, session refresh
app/[market]/            root layout (theme, fonts, i18n, flags), error/not-found
app/[market]/(shop)/     header/footer chrome (bag drawer), home, listings, search, product, cart, account, CMS pages, catch-all 404
app/[market]/(checkout)/ checkout and confirmation, with a minimal header
app/[market]/(affiliate)/ affiliate dashboard (flag + approved affiliates)
app/sitemap.ts, robots.ts
app/api/revalidate       tag revalidation for the worker
app/api/preview          CMS draft preview (Draft Mode) from the admin's signed link
app/(admin)/              admin root layout and stylesheet; admin/(auth) and admin/(console) pages
src/api/                 generated OpenAPI types, typed server client, upstream calls
src/lib/                 env, market, session, flags, theme, store data, catalog, money
src/blocks/              home page blocks (one per design section); cms/ renders page-builder blocks
src/components/          header, footer, storefront primitives (icons, art, media, buttons), not-found view
src/content/             editorial content for the home page and site chrome
src/features/            cart (RTK Query bag, drawer, promo codes), catalog (listing query, filters), product (variants, view),
                         checkout (address, steps, actions), account (session actions, forms), search (typeahead),
                         wishlist, reviews, returns, affiliate
src/styles/premium-touch design tokens and block styles (growth.css, community.css, affiliate.css for B-Phase 2)
src/admin/               back office: RTK Query store (generated hooks), session gate, screens, data table, schema forms, audit diff
messages/                en (split: en.json core, en.growth/affiliate/community.json), bn
e2e/                     Playwright (storefront); e2e/admin for the back office
```

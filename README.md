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

- **Routes.** `/admin/login`, `/admin/mfa` and `/admin/mfa/enroll` (route group `(auth)`). The console shell (route group `(console)`) holds the dashboard, products, categories, collections, inventory, orders, customers, shipping, tax, payments, notifications, menus, redirects, settings, flags, staff, roles and audit. Screens live in `src/admin/features/<area>`. The static `admin` segment wins over `[market]`.
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
- **Bag.** All bag actions are Server Actions in `src/features/cart/actions.ts`:
  - Add to bag, Quick add and the spotlight start a guest session when needed, then open the bag drawer (`BagProvider` in the shop layout).
  - Quantity and remove update at once (`useOptimistic`), then settle to the API's repriced cart.
  - The header's bag button opens the drawer; `/cart` is the full page.
- **Checkout** (`app/[market]/(checkout)`, a minimal header with no footer):
  - Steps: contact and address, then delivery method, then payment and notes.
  - Place order sends an `Idempotency-Key` made once per attempt, so retries never create two orders. It then redirects to `/checkout/confirmation/[orderId]`, which only the shopper who placed the order can open.
  - Guest checkout follows the API's setting.
- **Account** (`/account/…`):
  - Sign-in, registration and sign-out are Server Actions. They call the API's `/v1/store/session/*` and pass its cookies on to the browser. Sign-in merges the guest bag into the account, and `?next=` only follows paths on this site.
  - Password reset uses the link in the email (`/account/reset-password?token=…`).
  - The signed-in area (profile, password, address book, orders and order detail with shipments and timeline) redirects visitors to sign-in.
- **CMS pages** (`/pages/[handle]`): the page builder's blocks (`src/blocks/cms`). Unknown types render nothing. Blocks aimed at particular visitors (segments, signed-in, experiments) are left out of the shared cached page. `?preview=` shows a draft from the editor.
- **SEO.**
  - `app/sitemap.ts` lists every product, category, collection and page in every market and language, with hreflang alternates.
  - `app/robots.ts` disallows everything outside production.
  - `proxy.ts` applies the admin's redirects from a table it refreshes every minute (`src/lib/redirects.ts`). Rules are written without the market prefix.

## Layout

```
proxy.ts                 /admin → staff sign-in gate; everything else: market prefix, context headers, session refresh
app/[market]/            root layout (theme, fonts, i18n, flags), error/not-found
app/[market]/(shop)/     header/footer chrome (bag drawer), home, listings, search, product, cart, account, CMS pages, catch-all 404
app/[market]/(checkout)/ checkout and confirmation, with a minimal header
app/sitemap.ts, robots.ts
app/api/revalidate       tag revalidation for the worker
app/(admin)/              admin root layout and stylesheet; admin/(auth) and admin/(console) pages
src/api/                 generated OpenAPI types, typed server client, upstream calls
src/lib/                 env, market, session, flags, theme, store data, catalog, money
src/blocks/              home page blocks (one per design section); cms/ renders page-builder blocks
src/components/          header, footer, storefront primitives (icons, art, media, buttons), not-found view
src/content/             editorial content for the home page and site chrome
src/features/            cart (actions, drawer, lines), catalog (listing query, filters), product (variants, view),
                         checkout (address, steps, actions), account (session actions, forms), search (typeahead)
src/styles/premium-touch design tokens and block styles
src/admin/               back office: RTK Query store (generated hooks), session gate, screens, data table, schema forms, audit diff
messages/                en, bn
e2e/                     Playwright (storefront); e2e/admin for the back office
```

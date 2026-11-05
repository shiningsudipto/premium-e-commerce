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

- **Routes.** `/admin/login`, `/admin/mfa` and `/admin/mfa/enroll` (route group `(auth)`). `/admin`, `/admin/settings`, `/admin/flags`, `/admin/staff`, `/admin/roles` and `/admin/audit` sit in the console shell (route group `(console)`). The static `admin` segment wins over `[market]`.
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
- **End-to-end tests** (`e2e/admin`). They create temporary staff through the backend's `src/scripts/e2e-staff.ts` and delete them afterwards; after an interrupted run, `npx tsx src/scripts/e2e-staff.ts cleanup` in the backend removes leftovers. The API allows 20 sign-ins per 15 minutes per IP, so start it with `RATE_LIMIT_ENABLED=false` for repeated local runs.

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
- **Bag.** Quick add and Add to bag are Server Actions (`src/features/cart/actions.ts`). They create a guest session when needed, add the line, and refresh the header's bag count. Products with several variants send Quick add to the product page.
- **Not wired yet:**
  - The newsletter form validates addresses, but the API has no sign-up endpoint, so it answers "Sign-ups open soon".
  - Collection tile counts are content.
  - Links to category, product, cart, search, account and content pages lead to pages built in B-Phase 1.

## Layout

```
proxy.ts                 /admin → staff sign-in gate; everything else: market prefix, context headers, session refresh
app/[market]/            root layout (theme, fonts, i18n, flags), error/not-found
app/[market]/(shop)/     header/footer chrome, home, loading state, catch-all 404
app/api/revalidate       tag revalidation for the worker
app/(admin)/              admin root layout and stylesheet; admin/(auth) and admin/(console) pages
src/api/                 generated OpenAPI types, typed server client, upstream calls
src/lib/                 env, market, session, flags, theme, store data, catalog, money
src/blocks/              home page blocks (one per design section)
src/components/          header, footer, storefront primitives (icons, art, media, buttons), not-found view
src/content/             editorial content for the home page and site chrome
src/features/cart/       add-to-bag Server Actions, bag count, Quick add
src/styles/premium-touch design tokens and block styles
src/admin/               back office: RTK Query store (generated hooks), session gate, screens, data table, schema forms, audit diff
messages/                en, bn
e2e/                     Playwright (storefront); e2e/admin for the back office
```

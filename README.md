# premium-ec

The storefront: Next.js 16 (Cache Components, `proxy.ts`), Tailwind 4 and shadcn/ui, talking to the Express API in `../premium-ec-backend`. Plan: `../premium-ecommerce-implementation-plan-frontend.md`.

## Running it

1. Start the API and its worker in `premium-ec-backend` (`npm run dev`, `npm run dev:worker`).
2. `cp .env.example .env.local`, then set `REVALIDATE_SECRET`. Use the same value as the backend's `REVALIDATE_SECRET`, and set the backend's `STOREFRONT_REVALIDATE_URL=http://localhost:3000/api/revalidate`.
3. `npm install`, then `npm run dev`. Open http://localhost:3000, which redirects to `/en-bd`.

| Script                                | What it does                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev` / `build`               | Dev server on :3000 / production build (prerenders each market's pages)                   |
| `npm test`                            | Vitest: proxy, BFF, session and pure helpers (the API is mocked)                          |
| `npm run test:e2e`                    | Playwright on desktop and mobile; needs the API running                                   |
| `npm run api:generate`                | Regenerates `src/api/schema.d.ts` from the backend's `openapi.json` (or `OPENAPI_SOURCE`) |
| `npm run typecheck`, `lint`, `format` | `tsc`, ESLint, Prettier                                                                   |

## How it fits together

- **Market prefix.** Every page lives under `/{locale}-{market}/`, for example `/en-bd` or `/bn-bd`. `proxy.ts` picks the prefix for URLs without one: a remembered cookie first, then the visitor's country header, then `DEFAULT_MARKET`. It passes `x-market`, `x-locale`, `x-channel` and `x-request-id` downstream. Server code reads the segment with `next/root-params`.
- **Caching.** Store config, markets, flags and the theme are `"use cache"` functions tagged `config` and `theme` (`src/lib/store-data.ts`), so pages prerender. The API's worker calls `POST /api/revalidate` with the shared secret, and tagged data refreshes on the next visit (stale-while-revalidate, `revalidateTag(tag, "max")`).
- **BFF and sessions (ADR 0002).**
  - The browser calls `/api/bff/v1/store/…` and `/api/bff/v1/affiliate/…`. The route adds the session token from httpOnly cookies (`pe_at`, `pe_rt`, `pe_guest`), refreshes it on `TOKEN_EXPIRED`, and blocks cross-site writes by checking the `Origin` header.
  - Sign-in, registration and sign-out go through `/api/auth/{login,register,logout}`, so tokens never reach JavaScript.
  - Cart and checkout calls get a guest token automatically.
  - The API revokes a whole session when a rotated refresh token is reused, so concurrent refreshes of one token share a single call (`src/lib/session/refresh.ts`). That works within one Node process; with several instances, use sticky sessions.
- **Theme.** The active theme's CSS variables and custom CSS are inlined in the root layout after `globals.css`, whose `@theme` uses the same names. Fonts named in the tokens load from Google Fonts at weights 400 and 700.
- **i18n.** `next-intl` with messages in `messages/{locale}.json`. Missing keys fall back to English (`src/i18n/messages.ts`).
- **Flags.** `isEnabled(key)` in Server Components (per shopper, request-time), `useFlag(key)` in Client Components (per market, cached).

## Layout

```
proxy.ts                 market prefix, context headers, session refresh
app/[market]/            root layout (theme, fonts, i18n, flags), error/not-found
app/[market]/(shop)/     header/footer chrome, home, loading state, catch-all 404
app/api/bff/[...path]    BFF proxy to the API
app/api/auth/[action]    sign-in/out with cookie handling
app/api/revalidate       tag revalidation for the worker
src/api/                 generated OpenAPI types, typed server client, upstream calls
src/lib/                 env, market, session, flags, theme, store data
src/components/          site header/footer, account link, not-found view
messages/                en, bn
e2e/                     Playwright
```

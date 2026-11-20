import type { Guide, GuideContext } from "./guide-types";

// Facts here mirror the backend: keys are `sk_…`, sent as a Bearer token, scoped to staff
// permissions the creator holds, rate limited to 600 requests a minute, and only the routes
// marked `adminOrApiKey` accept them (catalog, customers, inventory, orders). Update both together.

export function apiKeysGuide({ apiUrl, adminUrl }: GuideContext): Guide {
  return {
    slug: "api-keys",
    title: "API keys guide",
    summary:
      "An API key lets another system (a courier integration, accounting or ERP software, a stock sync, a reporting script) read and change store data without a staff login.",
    audience: "For store admins who issue keys, and for developers who build the integration.",
    screen: { href: "/admin/api-keys", label: "API keys" },
    sections: [
      {
        id: "what-for",
        title: "What API keys are for",
        blocks: [
          {
            kind: "p",
            text: "Staff sign in with a password and two-step code. Software can't, so it uses a key instead. Each key has **scopes**: the exact permissions it holds, such as reading orders or adjusting stock. The key can do nothing else.",
          },
          {
            kind: "table",
            head: ["Goal", "Scopes to give"],
            rows: [
              ["A courier app pulls new orders and writes back tracking", "`orders.read`, `orders.fulfill`"],
              ["Accounting software imports paid orders", "`orders.read`"],
              ["A warehouse system keeps stock in sync", "`inventory.read`, `inventory.write`"],
              ["A supplier feed creates and updates products", "`products.read`, `products.write`"],
              ["A CRM reads customer profiles", "`customers.read`"],
              ["Cash-on-delivery money is reconciled automatically", "`orders.read`, `orders.write`"],
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Webhooks and API keys work together: a webhook tells the other system that something happened (“order 1042 was placed”), and the key lets it fetch the details or update the order.",
          },
        ],
      },
      {
        id: "create",
        title: "Create a key",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              `Open **Configuration → API keys** (${adminUrl}/admin/api-keys). You need the **Manage API keys** permission (\`api_keys.manage\`).`,
              "Click **New key** and give it a **name** that says who uses it and why, e.g. “Steadfast courier sync”.",
              "Tick the **scopes** it needs, and nothing more. You can only give scopes you hold yourself; the others are shown greyed out.",
              "Choose an **expiry**: 30 days, 90 days, a year, a date, or never. An expiry limits the damage if a key leaks; prefer one for anything temporary.",
              "Click **Create key**. The key (starts with `sk_`) is shown **once**. Copy it into the other system's settings now, tick “I've stored it safely”, and close the dialog.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "The store keeps only a fingerprint of the key, so nobody (not even an Owner) can show it again. If it's lost, revoke it and create a new one.",
          },
          { kind: "h3", text: "Looking after keys" },
          {
            kind: "list",
            items: [
              "The list shows each key's first characters (its **prefix**), scopes, expiry and **last used** time, so you can tell keys apart and spot unused ones.",
              "**Revoke** a key to stop it at once (you type its name to confirm). Revoking can't be undone; issue a new key if needed.",
              "To change a key's scopes, create a new key with the right scopes, switch the integration over, then revoke the old one.",
              "Every create and revoke is recorded in the **Audit log**.",
            ],
          },
        ],
      },
      {
        id: "use",
        title: "Use the key (for developers)",
        blocks: [
          {
            kind: "p",
            text: `Send the key in the \`Authorization\` header as a Bearer token on every request. The API is at \`${apiUrl}\`. Requests and responses are JSON.`,
          },
          {
            kind: "code",
            lang: "bash",
            title: "List the latest paid orders",
            code: `curl "${apiUrl}/v1/admin/orders?status=PAID&limit=25" \\
  -H "Authorization: Bearer sk_your_key_here"`,
          },
          {
            kind: "code",
            lang: "js",
            title: "Node.js",
            code: `const API = "${apiUrl}";
const KEY = process.env.PREMIUM_API_KEY; // sk_…

async function premium(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { authorization: \`Bearer \${KEY}\`, "content-type": "application/json", ...init.headers },
  });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(\`\${res.status} \${body?.code}: \${body?.message}\`);
  return body;
}

const { items, nextCursor } = await premium("/v1/admin/orders?status=PAID");`,
          },
          {
            kind: "note",
            tone: "warn",
            text: "Use keys only from a server. Never put a key in a website, mobile app or anything a customer can download: anyone could read it there.",
          },
        ],
      },
      {
        id: "endpoints",
        title: "What a key can call",
        blocks: [
          {
            kind: "p",
            text: "These admin endpoints accept API keys. Each needs the scope shown; a key without it gets `403`.",
          },
          {
            kind: "table",
            head: ["Method and path", "What it does", "Scope"],
            rows: [
              [
                "`GET /v1/admin/orders`",
                "List orders. Filters: `status`, `q` (number or email), `customerId`, `from`, `to`",
                "`orders.read`",
              ],
              [
                "`GET /v1/admin/orders/{id}`",
                "Order detail: lines, payments, fulfillments, refunds, timeline",
                "`orders.read`",
              ],
              [
                "`POST /v1/admin/orders/{id}/mark-paid`",
                "Record a manual (e.g. cash on delivery) payment as received",
                "`orders.write`",
              ],
              [
                "`POST /v1/admin/orders/{id}/fulfillments`",
                "Fulfill all remaining items, or the given `lines`; optional `carrier`, `trackingNumber`, `trackingUrl`, `status` (`PENDING` or `SHIPPED`)",
                "`orders.fulfill`",
              ],
              [
                "`PATCH /v1/admin/orders/fulfillments/{id}`",
                "Move a parcel along (`PICKING`, `PACKED`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`, `FAILED_DELIVERY`, `RETURNED_TO_SENDER`) or set tracking",
                "`orders.fulfill`",
              ],
              ["`GET /v1/admin/products`", "List products", "`products.read`"],
              ["`GET /v1/admin/products/{id}`", "A product with variants, prices, stock and media", "`products.read`"],
              [
                "`POST /v1/admin/products`",
                "Create a product (as a draft), optionally with variants, prices and stock",
                "`products.write`",
              ],
              ["`PATCH /v1/admin/products/{id}`", "Update a product", "`products.write`"],
              ["`POST /v1/admin/products/{id}/variants`", "Add a variant", "`products.write`"],
              ["`PATCH /v1/admin/variants/{id}`", "Update a variant", "`products.write`"],
              ["`GET /v1/admin/customers`", "List customers", "`customers.read`"],
              ["`GET /v1/admin/customers/{id}`", "A customer with addresses and order stats", "`customers.read`"],
              ["`GET /v1/admin/inventory/variants/{id}`", "Stock for a variant at each location", "`inventory.read`"],
              [
                "`GET /v1/admin/inventory/variants/{id}/history`",
                "The variant's stock adjustment history",
                "`inventory.read`",
              ],
              [
                "`POST /v1/admin/inventory/adjustments`",
                "Change stock by `delta` or set `setOnHand`, with a `reason`",
                "`inventory.write`",
              ],
              ["`PATCH /v1/admin/inventory/levels/{id}`", "Set a low-stock threshold", "`inventory.write`"],
            ],
          },
          {
            kind: "p",
            text: "Other admin screens (settings, staff, refunds, content and so on) need a signed-in staff member and don't accept keys. The public storefront endpoints under `/v1/store` (products, categories, search) need no key at all.",
          },
          { kind: "h3", text: "Examples" },
          {
            kind: "code",
            lang: "bash",
            title: "Mark an order shipped with tracking",
            code: `curl -X POST "${apiUrl}/v1/admin/orders/ORDER_ID/fulfillments" \\
  -H "Authorization: Bearer sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: ship-ORDER_ID-1" \\
  -d '{"status":"SHIPPED","carrier":"Pathao","trackingNumber":"PX123456","trackingUrl":"https://merchant.pathao.com/tracking?consignment_id=PX123456"}'`,
          },
          {
            kind: "code",
            lang: "bash",
            title: "Set stock after a count",
            code: `curl -X POST "${apiUrl}/v1/admin/inventory/adjustments" \\
  -H "Authorization: Bearer sk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"variantId":"VARIANT_ID","setOnHand":42,"reason":"CYCLE_COUNT","note":"Warehouse count"}'`,
          },
          {
            kind: "p",
            text: "Stock `reason` is one of `RECEIVED`, `CORRECTION`, `DAMAGED`, `SHRINKAGE`, `CYCLE_COUNT`, `RETURN_RESTOCK`. Send exactly one of `delta` (e.g. `-2`) or `setOnHand`.",
          },
        ],
      },
      {
        id: "conventions",
        title: "Paging, retries and errors",
        blocks: [
          { kind: "h3", text: "Paging" },
          {
            kind: "p",
            text: 'Lists return `{ "items": […], "nextCursor": "…" }`. Ask for up to 100 with `limit` (default 25). For the next page, send `cursor=<nextCursor>`; `nextCursor` is `null` on the last page.',
          },
          { kind: "h3", text: "Safe retries (Idempotency-Key)" },
          {
            kind: "p",
            text: "`mark-paid` and `fulfillments` accept an `Idempotency-Key` header. Send a unique value per intended action (e.g. `ship-<orderId>-1`); if the request times out and you send it again with the same key, the action happens only once and you get the original answer.",
          },
          { kind: "h3", text: "Rate limit" },
          {
            kind: "p",
            text: "Each key may make **600 requests a minute**. Beyond that the API answers `429`; wait a moment (see the `RateLimit` header) and retry with a growing delay.",
          },
          { kind: "h3", text: "Errors" },
          {
            kind: "p",
            text: 'Errors are JSON: `{ "code": "…", "message": "…", "details": … }`. Act on `code`; `message` is for people.',
          },
          {
            kind: "table",
            head: ["Status", "`code`", "Meaning"],
            rows: [
              ["401", "`UNAUTHENTICATED`", "Missing, wrong, expired or revoked key"],
              ["403", "`FORBIDDEN`", "The key lacks the scope (`message` names it)"],
              ["400", "`VALIDATION_FAILED`", "The body or query is invalid; `details` lists the fields"],
              ["404", "`NOT_FOUND`", "No such order, product, etc."],
              [
                "409",
                "`VERSION_CONFLICT`, `INVALID_STATE_TRANSITION`, `INSUFFICIENT_STOCK`…",
                "The change clashes with the current state; reload and decide again",
              ],
              ["429", "`RATE_LIMITED`", "Too many requests; slow down"],
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Money is in minor units (`460000` BDT = ৳4,600.00) and times are UTC in ISO 8601.",
          },
        ],
      },
      {
        id: "security",
        title: "Security checklist",
        blocks: [
          {
            kind: "list",
            items: [
              "One key per integration, named after it, so you can revoke one without breaking the others.",
              "Give the fewest scopes that work, and set an expiry where you can.",
              "Store keys in the other system's secret settings or environment, never in code, email or chat.",
              "Revoke a key straight away if it may have leaked, when the integration is retired, or when the person who managed it leaves.",
              "Review the list now and then: a key that hasn't been used for months probably isn't needed.",
            ],
          },
        ],
      },
    ],
  };
}

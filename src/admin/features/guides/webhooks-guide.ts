import type { Guide, GuideContext } from "./guide-types";

// Facts here mirror the backend (premium-ec-backend/src/modules/webhooks): the event catalog and
// payloads, the signature, 10 s timeout, 5 retries with backoff, auto-disable after
// `webhooks.max_failures` (default 15) consecutive failures. Update both together.

export function webhooksGuide({ adminUrl }: GuideContext): Guide {
  return {
    slug: "webhooks",
    title: "Webhooks guide",
    summary:
      "Webhooks send a message from the store to another system the moment something happens: an order is placed, a payment fails, a parcel ships. The other system can act on it straight away, with nobody watching the admin.",
    audience: "For store admins who set up endpoints, and for developers who build the system that receives them.",
    screen: { href: "/admin/webhooks", label: "Webhooks" },
    sections: [
      {
        id: "what-for",
        title: "What webhooks are for",
        blocks: [
          {
            kind: "p",
            text: "The store handles selling. Most businesses also run other tools: a courier, accounting, a team chat, a CRM. A webhook connects them without changing the store. You give the store a web address (an **endpoint**) and choose which events it should hear about; the store sends each matching event to that address as a signed JSON message.",
          },
          {
            kind: "table",
            head: ["When this happens", "You could…"],
            rows: [
              [
                "`order.placed` or `order.paid`",
                "Book the delivery with your courier (Pathao, Steadfast, RedX…) or add the sale to your accounting software",
              ],
              ["`order.placed`", "Post “New order #1042 – ৳4,600” to a Slack, Telegram or WhatsApp group"],
              ["`fulfillment.shipped`", "Send the customer an SMS with the tracking number"],
              ["`payment.refunded`, `return.completed`", "Update your books or warehouse system"],
              ["`customer.created`", "Add the customer to a mailing list or CRM"],
              ["`inventory.low_stock`", "Alert the buyer to reorder"],
              ["`affiliate.payout_paid`", "Record the affiliate payment in accounting"],
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "No developer? Point the endpoint at **Zapier**, **Make** or **n8n** (their “Webhook” trigger gives you a URL). From there you can connect Google Sheets, email, chat apps and thousands of others without code.",
          },
        ],
      },
      {
        id: "before",
        title: "Before you start",
        blocks: [
          {
            kind: "list",
            items: [
              "You need the **Manage webhooks** permission (`webhooks.manage`).",
              "The receiving address must be **public HTTPS** (`https://…`). Private and local addresses are refused, so the store can't be pointed at internal systems. (Only a development install accepts `http://localhost`.)",
              "The backend **worker** must be running: it sends the deliveries and the retries.",
              "The delivery log needs MongoDB. Without it, deliveries still go out but aren't listed.",
            ],
          },
        ],
      },
      {
        id: "set-up",
        title: "Set up an endpoint",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              `Open **Configuration → Webhooks** (${adminUrl}/admin/webhooks) and click **New endpoint**.`,
              "Enter the **URL** that will receive the events and a **Description** so others know what it's for (for example “Courier booking – Pathao”).",
              "Tick the **events** it should receive. Choose only what the receiver uses; fewer events means less noise and less load.",
              "Click **Create endpoint**. The **signing secret** (starts with `whsec_`) is shown **once**. Copy it into the receiving system now, tick “I've stored it safely” and close the dialog.",
              "Click **Send test** on the endpoint. A `webhook.ping` event is queued; open **Deliveries** to see whether the receiver answered.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "The secret can't be shown again. If it's lost or leaked, use **Rotate secret**: a new one is issued (shown once) and the old one stops working immediately, so update the receiver straight away.",
          },
          { kind: "h3", text: "Day-to-day actions" },
          {
            kind: "table",
            head: ["Action", "What it does"],
            rows: [
              ["Edit", "Change the URL, description or events. Takes effect at once, including retries still waiting."],
              [
                "Disable / Enable",
                "Stop deliveries without deleting; retries still waiting are skipped (replay them later). Enabling resets the failure count.",
              ],
              ["Deliveries", "The latest attempts: time, event, attempt number, HTTP status, duration and error."],
              ["Replay", "Send a logged delivery again (same event, same ID), e.g. after fixing the receiver."],
              ["Rotate secret", "Issue a new signing secret; the old one stops working."],
              ["Delete", "Remove the endpoint. Queued deliveries to it are dropped."],
            ],
          },
        ],
      },
      {
        id: "message",
        title: "What the receiver gets",
        blocks: [
          {
            kind: "p",
            text: "Each delivery is an HTTP `POST` with a JSON body. Every event has the same envelope; `data` depends on the event (see the event list).",
          },
          {
            kind: "code",
            lang: "http",
            title: "Request",
            code: `POST /your/endpoint HTTP/1.1
Content-Type: application/json
User-Agent: PremiumEC-Webhooks/1
X-Premium-Event: order.placed
X-Premium-Delivery: cmx3k1f0p0001abcd
X-Premium-Signature: t=1795680000,v1=5f2c0d9a…

{
  "id": "cmx3k1f0p0001abcd",
  "type": "order.placed",
  "version": 1,
  "occurredAt": "2026-11-20T06:40:00.000Z",
  "data": {
    "orderId": "cmx3k1e9z0000wxyz",
    "number": 1042,
    "customerId": "cmx2aa…",
    "email": "ayesha@example.com",
    "totalMinor": 460000,
    "currency": "BDT",
    "paymentProvider": "manual"
  }
}`,
          },
          {
            kind: "table",
            head: ["Field / header", "Meaning"],
            rows: [
              [
                "`id` / `X-Premium-Delivery`",
                "The event's unique ID. The same on retries and replays, so use it to ignore duplicates.",
              ],
              ["`type` / `X-Premium-Event`", "Which event this is."],
              ["`version`", "The payload version (currently 1)."],
              ["`occurredAt`", "When the event happened (UTC, ISO 8601)."],
              ["`data`", "Event details. IDs can be looked up with an API key if you need more."],
              [
                "`X-Premium-Signature`",
                "`t` = send time (Unix seconds), `v1` = HMAC-SHA256 signature. See “Verify the signature”.",
              ],
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Money is in **minor units**: `460000` with currency `BDT` is ৳4,600.00. Divide by 100.",
          },
        ],
      },
      {
        id: "verify",
        title: "Verify the signature",
        blocks: [
          {
            kind: "p",
            text: "Anyone who learns your URL could send it fake orders. The signature proves a message came from your store and wasn't changed. Always check it before acting on a message.",
          },
          {
            kind: "list",
            ordered: true,
            items: [
              "Read the **raw** request body exactly as received (before any JSON parsing).",
              "From `X-Premium-Signature`, take `t` (timestamp) and `v1` (signature).",
              'Compute `HMAC-SHA256(secret, t + "." + rawBody)` as lowercase hex, using the endpoint\'s `whsec_…` secret.',
              "Compare it with `v1` using a constant-time comparison. If they differ, answer `401` and stop.",
              "Reject messages whose `t` is more than 5 minutes from your clock, so an old captured message can't be replayed.",
            ],
          },
          {
            kind: "code",
            lang: "js",
            title: "Node.js (Express)",
            code: `import crypto from "node:crypto";
import express from "express";

const SECRET = process.env.PREMIUM_WEBHOOK_SECRET; // whsec_…
const app = express();

// keep the raw body: the signature is computed over the exact bytes sent
app.post("/webhooks/premium", express.raw({ type: "application/json" }), (req, res) => {
  const header = req.get("x-premium-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = Number(parts.t);
  const expected = crypto.createHmac("sha256", SECRET).update(\`\${t}.\${req.body}\`).digest("hex");
  const given = Buffer.from(parts.v1 ?? "", "hex");
  const valid =
    given.length === 32 &&
    crypto.timingSafeEqual(given, Buffer.from(expected, "hex")) &&
    Math.abs(Date.now() / 1000 - t) < 300;
  if (!valid) return res.sendStatus(401);

  const event = JSON.parse(req.body.toString("utf8"));
  // answer quickly, then do the work (or put it on a queue)
  res.sendStatus(204);
  handle(event).catch(console.error);
});`,
          },
          {
            kind: "code",
            lang: "php",
            title: "PHP",
            code: `<?php
$secret = getenv('PREMIUM_WEBHOOK_SECRET'); // whsec_…
$raw = file_get_contents('php://input');
$header = $_SERVER['HTTP_X_PREMIUM_SIGNATURE'] ?? '';
parse_str(str_replace(',', '&', $header), $parts);
$t = (int) ($parts['t'] ?? 0);
$expected = hash_hmac('sha256', $t . '.' . $raw, $secret);

if (!hash_equals($expected, $parts['v1'] ?? '') || abs(time() - $t) > 300) {
    http_response_code(401);
    exit;
}

$event = json_decode($raw, true);
http_response_code(204);
// … handle $event['type'] and $event['data'], skipping IDs you've already processed`,
          },
        ],
      },
      {
        id: "receiver",
        title: "How the receiver should behave",
        blocks: [
          {
            kind: "list",
            items: [
              "**Answer fast.** Reply with any `2xx` status within **10 seconds**, or the attempt counts as failed. Do slow work (calling a courier, sending SMS) after replying or on a queue.",
              "**Expect duplicates.** Retries and replays reuse the event `id`. Store the IDs you've processed and skip repeats.",
              "**Don't rely on order.** Events can arrive out of order (a retry may land after a later event). Use `occurredAt`, or fetch the current state with an API key.",
              "**No redirects.** A `3xx` answer is treated as a failure; give the final URL.",
              "**Ignore unknown fields and events.** New fields may be added to `data` over time.",
            ],
          },
        ],
      },
      {
        id: "retries",
        title: "Retries and automatic switch-off",
        blocks: [
          {
            kind: "p",
            text: "A delivery fails when the receiver answers anything other than `2xx`, takes longer than 10 seconds, or can't be reached.",
          },
          {
            kind: "list",
            items: [
              "Each failed delivery is **retried up to 5 more times**, waiting longer each time (from seconds up to 10 minutes apart).",
              "Every failed attempt counts towards the endpoint's **consecutive failures**; one success resets the count.",
              "After **15 consecutive failures** (setting `webhooks.max_failures`, changeable in Settings) the endpoint is **turned off** and the reason is shown on it. A `webhook.disabled` event is raised, which a Workflow rule can email you about.",
              "While an endpoint is off, new events aren't queued for it.",
            ],
          },
          { kind: "h3", text: "Getting back on track" },
          {
            kind: "list",
            ordered: true,
            items: [
              "Open the endpoint's **Deliveries** to see the status codes and errors.",
              "Fix the receiving server (or the URL), then **Enable** the endpoint.",
              "Use **Send test** (it works once the endpoint is enabled) and confirm it succeeds.",
              "**Replay** the deliveries that were missed while it was failing.",
            ],
          },
        ],
      },
      {
        id: "events",
        title: "Event list",
        blocks: [
          {
            kind: "p",
            text: "Subscribe to individual events, or to `*` for all of them (including any added later). Every `data` object below also has the IDs needed to look things up.",
          },
          { kind: "h3", text: "Orders and payments" },
          {
            kind: "table",
            head: ["Event", "When", "`data`"],
            rows: [
              [
                "`order.placed`",
                "A customer completes checkout (or staff create an exchange order)",
                "`orderId`, `number`, `customerId`, `email`, `totalMinor`, `currency`, `paymentProvider`",
              ],
              [
                "`order.paid`",
                "Payment is received (incl. staff marking a cash payment as paid)",
                "`orderId`, `number`, `from`/`to` or `status`",
              ],
              ["`order.partially_fulfilled`", "Some items are fulfilled", "`orderId`, `number`, `from`, `to`"],
              ["`order.fulfilled`", "All items are fulfilled", "`orderId`, `number`, `from`, `to`"],
              ["`order.delivered`", "The order is marked delivered", "`orderId`, `number`, `from`, `to`"],
              ["`order.completed`", "The order is closed", "`orderId`, `number`, `from`, `to`"],
              ["`order.cancelled`", "The order is cancelled", "`orderId`, `number`, `from`, `to`, `reason` (if given)"],
              ["`fulfillment.shipped`", "A parcel is marked shipped", "`orderId`, `fulfillmentId`"],
              ["`payment.authorized`", "A payment is authorized", "`paymentId`, `orderId`"],
              ["`payment.captured`", "A payment is captured", "`paymentId`, `orderId`, `amountMinor`"],
              ["`payment.failed`", "A payment fails", "`paymentId`, `orderId`, `reason` (if known)"],
              ["`payment.refunded`", "A refund is issued", "`orderId`, `paymentId`, `refundId`, `amountMinor`"],
              ["`promotion.applied`", "An order uses a promotion", "`promotionId`, `orderId`, `code`, `amountMinor`"],
              ["`promotion.limit_reached`", "A promotion hits its usage limit", "`promotionId`"],
            ],
          },
          { kind: "h3", text: "Returns" },
          {
            kind: "table",
            head: ["Event", "When", "`data`"],
            rows: [
              ["`return.requested`", "A customer requests a return", "`returnId`, `orderId`"],
              ["`return.approved`", "Staff approve it", "`returnId`, `orderId`, `status`"],
              ["`return.received`", "The items arrive back", "`returnId`, `orderId`, `status`"],
              [
                "`return.completed`",
                "The return is resolved (fully or partly accepted)",
                "`returnId`, `orderId`, `status`",
              ],
            ],
          },
          { kind: "h3", text: "Catalog and stock" },
          {
            kind: "table",
            head: ["Event", "When", "`data`"],
            rows: [
              ["`product.created`", "A product is created", "`productId`, `handle`"],
              [
                "`product.updated`",
                "A product changes",
                "`productId`, `handle`, `previousHandle` (if the URL changed)",
              ],
              [
                "`product.published`",
                "A product goes live (now or on schedule)",
                "`productId`, `handle`, `scheduled` (if scheduled)",
              ],
              ["`product.archived`", "A product is archived", "`productId`, `handle`"],
              ["`variant.price_changed`", "A variant's price changes", "`variantId`, `productId`"],
              [
                "`inventory.adjusted`",
                "Staff or an API key adjust stock",
                "`variantId`, `locationId`, `delta`, `reason`, `onHand`, `available`",
              ],
              [
                "`inventory.low_stock`",
                "Available stock drops to the low-stock threshold",
                "`variantId`, `levelId`, `available`, `threshold`",
              ],
              ["`inventory.out_of_stock`", "Available stock reaches zero", "`variantId`, `levelId`, `available`"],
              ["`inventory.back_in_stock`", "Stock becomes available again", "`variantId`, `levelId`, `available`"],
            ],
          },
          { kind: "h3", text: "Customers, reviews and content" },
          {
            kind: "table",
            head: ["Event", "When", "`data`"],
            rows: [
              ["`customer.created`", "A customer registers", "`customerId`, `email`, `locale`"],
              ["`customer.deleted`", "A customer's data is deleted (privacy request)", "`customerId`"],
              ["`customer.segment_entered`", "A customer joins a segment", "`segmentId`, `handle`, `customerId`"],
              ["`customer.segment_exited`", "A customer leaves a segment", "`segmentId`, `handle`, `customerId`"],
              ["`review.submitted`", "A review is submitted", "`reviewId`, `productId`"],
              ["`review.approved`", "A review is approved", "`reviewId`, `productId`"],
              ["`page.published`", "A CMS page is published", "`pageId`, `handle`, `kind`, `version` or `status`"],
            ],
          },
          { kind: "h3", text: "Affiliates" },
          {
            kind: "table",
            head: ["Event", "When", "`data`"],
            rows: [
              ["`affiliate.applied`", "Someone applies to the program", "`affiliateId`, `customerId`"],
              ["`affiliate.approved`", "An application is approved", "`affiliateId`, `customerId`"],
              [
                "`affiliate.order_attributed`",
                "An order is credited to an affiliate",
                "`orderId`, `affiliateId`, `code`, `subId`, `assetId`",
              ],
              [
                "`affiliate.earning_created`",
                "A commission is earned (or adjusted)",
                "`earningId`, `affiliateId`, `orderId`, `amountMinor`",
              ],
              [
                "`affiliate.earning_reversed`",
                "A commission is reversed (cancel, refund, return)",
                "`earningId`, `affiliateId`, `orderId`, `amountMinor` or `reason`",
              ],
              ["`affiliate.payout_paid`", "An affiliate is paid", "`payoutId`, `affiliateId`, `amountMinor`"],
            ],
          },
          {
            kind: "p",
            text: '`webhook.ping` is sent only by **Send test**; its `data` is `{ "subscriptionId": "…" }`.',
          },
        ],
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        blocks: [
          {
            kind: "table",
            head: ["What you see in Deliveries", "Likely cause", "Fix"],
            rows: [
              [
                "`HTTP 401` / `403`",
                "The receiver rejected the signature or has its own login",
                "Check it uses the current secret and the raw body; allow the path without login",
              ],
              ["`HTTP 404`", "Wrong URL path", "Correct the endpoint URL"],
              ["`HTTP 5xx`", "The receiver crashed", "Check the receiver's logs"],
              ["`The operation was aborted due to timeout`", "No answer within 10 s", "Reply first, then do the work"],
              [
                "`fetch failed`",
                "Server unreachable, DNS or TLS problem",
                "Check the domain, certificate and firewall",
              ],
              [
                "`redirect mode is set to error`",
                "The URL redirects (e.g. http→https or a trailing slash)",
                "Use the final URL",
              ],
              [
                "Nothing listed at all",
                "The worker isn't running, or no subscribed event happened yet",
                "Start the worker; use Send test",
              ],
            ],
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
              "Always verify the signature and the timestamp.",
              "Keep the secret in the receiver's environment or secret store, never in code or chat.",
              "Rotate the secret when someone with access leaves, or if it may have leaked.",
              "Subscribe only to the events the receiver needs.",
              "Delete endpoints you no longer use.",
            ],
          },
        ],
      },
    ],
  };
}

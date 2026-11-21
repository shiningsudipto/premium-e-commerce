import type { Guide, GuideContext } from "./guide-types";

// Facts here mirror the backend (premium-ec-backend/src/modules/workflows): the trigger list,
// the facts a condition can read, operators, the eight actions and their limits, once-per-event
// runs and the run log. Update both together.

export function workflowsGuide({ adminUrl }: GuideContext): Guide {
  return {
    slug: "workflows",
    title: "Workflows guide",
    summary:
      "Workflows automate routine decisions. A rule waits for an event (an order is placed, stock runs low), checks its conditions, and, if they hold, does its actions: tag, hold, add a note, email someone, call another system, or act on an affiliate.",
    audience: "For store admins and managers. No programming needed.",
    screen: { href: "/admin/workflows", label: "Workflows" },
    sections: [
      {
        id: "how",
        title: "How a rule works",
        blocks: [
          {
            kind: "p",
            text: "Every rule has three parts: **When** (the trigger), **If** (the conditions) and **Then** (the actions).",
          },
          {
            kind: "code",
            lang: "text",
            title: "Example",
            code: `When   an order is placed                       (trigger: order.placed)
If     the order total is at least ৳50,000      (order.totalMinor is at least 5000000)
  and  it's the customer's first order          (customer.orderCount is 1)
Then   put the order on hold "Check large first order"
  and  email orders@yourstore.com`,
          },
          {
            kind: "list",
            items: [
              "Rules run in the background in the **worker**, within seconds of the event. If the worker is stopped, events wait and the rules run when it starts again.",
              "A rule runs **once per event**, even if the event is delivered twice.",
              "Each event gets a **run** in the rule's history: whether the conditions matched and how each action went.",
              "Several rules can share a trigger; each decides on its own.",
              "Changes to a rule apply to events from about **30 seconds** later.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "You need the **Manage workflows** permission (`workflows.write`) to see and edit rules.",
          },
        ],
      },
      {
        id: "create",
        title: "Create a rule",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              `Open **Configuration → Workflows** (${adminUrl}/admin/workflows) and click **New rule**.`,
              "Give it a **Name** that says what it does, e.g. “Hold large first orders”.",
              "Pick the **Trigger**: the event that makes the rule check its conditions.",
              "Add **conditions** and choose whether **all** or **any** of them must hold. With no conditions, the rule acts on every event of the trigger.",
              "Add one or more **actions** (up to 10). They run in the order listed.",
              "Use **Test the rule** (below) to check it against a real order before switching it on.",
              "Leave **Enabled** off while you're trying things out; switch it on when you're happy, then **Create rule**.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "A rule acts on real orders and customers the moment it's enabled. Test first, and start with gentle actions (a tag or a note) before holds or suspensions.",
          },
        ],
      },
      {
        id: "triggers",
        title: "Triggers",
        blocks: [
          {
            kind: "table",
            head: ["Trigger", "Fires when", "Facts available"],
            rows: [
              ["`order.placed`", "A customer completes checkout", "order, customer, affiliate"],
              ["`order.paid`", "An order's payment is received", "order, customer, affiliate"],
              ["`order.processing`", "Staff start preparing an order", "order, customer, affiliate"],
              ["`order.cancelled`", "An order is cancelled", "order, customer, affiliate"],
              ["`order.fulfilled`", "Every item is in a shipment (shown as Packed)", "order, customer, affiliate"],
              ["`order.shipping`", "Every shipment is with the courier", "order, customer, affiliate"],
              ["`order.delivered`", "An order is marked delivered", "order, customer, affiliate"],
              ["`payment.failed`", "A payment fails", "order, customer"],
              ["`payment.refunded`", "A refund is issued", "order, customer"],
              ["`return.requested`", "A customer requests a return", "order, customer"],
              ["`return.completed`", "A return is resolved", "order, customer"],
              ["`customer.created`", "A customer registers", "customer"],
              ["`customer.segment_entered`", "A customer joins a segment", "customer"],
              [
                "`inventory.low_stock`",
                "Stock drops to the low-stock threshold",
                "event only (`event.variantId`, `event.available`, `event.threshold`)",
              ],
              ["`inventory.out_of_stock`", "Stock reaches zero", "event only (`event.variantId`, `event.available`)"],
              ["`review.submitted`", "A review is submitted", "event only (`event.reviewId`, `event.productId`)"],
              ["`affiliate.applied`", "Someone applies to the affiliate program", "customer, affiliate"],
              ["`affiliate.order_attributed`", "An order is credited to an affiliate", "order, customer, affiliate"],
              ["`affiliate.earning_created`", "A commission is earned", "order, customer, affiliate"],
              [
                "`affiliate.fraud_flagged`",
                "The fraud checks flag an affiliate",
                "affiliate (and the order, when there is one)",
              ],
            ],
          },
        ],
      },
      {
        id: "conditions",
        title: "Conditions",
        blocks: [
          {
            kind: "p",
            text: "A condition compares one **fact** about the event with a value. Pick the fact from the list, or type a dot path (e.g. `event.threshold`) for anything the event carries.",
          },
          { kind: "h3", text: "Facts you can check" },
          {
            kind: "table",
            head: ["Fact", "Path", "Notes"],
            rows: [
              ["Order total", "`order.totalMinor`", "Minor units: `150000` = ৳1,500.00"],
              ["Order discount", "`order.discountMinor`", "Minor units"],
              ["Order item count", "`order.itemCount`", "Total quantity across lines"],
              ["Order number", "`order.number`", ""],
              ["Order status", "`order.status`", "e.g. `PENDING_PAYMENT`, `PAID`, `FULFILLED`"],
              ["Order currency", "`order.currency`", "e.g. `BDT`"],
              ["Shipping country", "`order.shippingCountry`", "Two-letter code, e.g. `BD`"],
              ["Payment provider", "`order.paymentProvider`", "e.g. `manual` (cash on delivery / bank transfer)"],
              ["Order email", "`order.email`", ""],
              ["Order tags", "`order.tags`", "A list: use “contains”"],
              ["Order affiliate", "`order.affiliateId`", "Set when an affiliate referred the order"],
              ["Customer order count", "`customer.orderCount`", "Orders that weren't cancelled, including this one"],
              ["Customer email", "`customer.email`", ""],
              ["Customer tags", "`customer.tags`", "A list: use “contains”"],
              ["Customer group", "`customer.groupId`", ""],
              ["Customer accepts marketing", "`customer.acceptsMarketing`", "true or false"],
              ["Affiliate status", "`affiliate.status`", "e.g. `ACTIVE`, `SUSPENDED`"],
              ["Affiliate tier", "`affiliate.tierId`", ""],
              ["Event type", "`event.type`", "Plus any field of the event as `event.<field>`"],
            ],
          },
          { kind: "h3", text: "Operators" },
          {
            kind: "table",
            head: ["Operator", "Meaning", "Works with"],
            rows: [
              ["is / is not", "Exactly equal (or not)", "numbers, text, true/false"],
              ["is more than / is at least", "Greater than / greater than or equal", "numbers"],
              ["is less than / is at most", "Less than / less than or equal", "numbers"],
              ["is one of / is none of", "Matches any value in a list (or none)", "numbers, text"],
              ["contains", "Text contains the value (ignoring case), or a list includes it", "text, lists (tags)"],
              ["is set", "The fact has a value", "anything"],
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "Amounts are in **minor units** (paisa). ৳5,000 is `500000`, ৳50,000 is `5000000`. Text comparisons with “is” are exact, including capital letters; use “contains” when you're not sure.",
          },
        ],
      },
      {
        id: "actions",
        title: "Actions",
        blocks: [
          {
            kind: "table",
            head: ["Action", "What it does", "Needs"],
            rows: [
              [
                "Tag the order",
                "Adds a tag (if it isn't there already). Tags show on the order and can be filtered.",
                "an order",
              ],
              ["Tag the customer", "Adds a tag to the customer. Useful for segments.", "a customer"],
              [
                "Put the order on hold",
                "Holds the order with a reason, so nobody ships it until staff release it.",
                "an order",
              ],
              ["Add an order note", "Writes a note on the order's timeline. Placeholders allowed.", "an order"],
              ["Send an email", "Emails up to 10 addresses. Subject and message allow placeholders.", ""],
              ["Call a webhook", "POSTs the facts as JSON to a public HTTPS address (see below).", ""],
              ["Suspend the affiliate", "Suspends an active affiliate, with a reason.", "an affiliate"],
              [
                "Hold affiliate earnings",
                "Stops the affiliate's pending earnings from becoming payable until staff review them.",
                "an affiliate",
              ],
            ],
          },
          { kind: "h3", text: "Placeholders" },
          {
            kind: "p",
            text: "In notes and emails, `{{path}}` is replaced by the fact's value, e.g. `Order #{{order.number}} for {{order.email}} needs a check`. Empty facts become blank.",
          },
          { kind: "h3", text: "Call a webhook" },
          {
            kind: "list",
            items: [
              'Sends `POST` with `{ "facts": { … } }`: the same facts the conditions saw.',
              "The address must be public HTTPS. The other side must answer `2xx` within 10 seconds.",
              "It's sent **once**, unsigned, with no retries. For reliable, signed delivery of every event, use **Webhooks** instead; use this action for a simple nudge after a condition matches.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "If an action fails (e.g. there's no order to tag), the rest still run, and the failure is shown in the rule's history.",
          },
        ],
      },
      {
        id: "test",
        title: "Test a rule before switching it on",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              "In the rule editor, open **Test the rule**.",
              "Enter an **Order ID** (it loads the order and its customer). Optionally add a **Customer ID**, an **Affiliate ID**, or other event data as JSON (readable as `event.<field>`).",
              "Run it. You'll see **Matches** or **Doesn't match**, and the **facts the conditions saw**, so you can tell why.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Testing is a dry run: no actions are carried out. Copy an order ID from the order's page address in admin.",
          },
        ],
      },
      {
        id: "recipes",
        title: "Ready-made ideas",
        blocks: [
          {
            kind: "table",
            head: ["Goal", "Trigger", "Conditions", "Actions"],
            rows: [
              [
                "Check large cash-on-delivery orders before shipping",
                "`order.placed`",
                "All of: payment provider is `manual`; order total is at least `2000000` (৳20,000)",
                "Put the order on hold “Call the customer to confirm”; Send an email to the orders team",
              ],
              [
                "Welcome first-time buyers",
                "`order.paid`",
                "Customer order count is `1`",
                "Tag the customer `first-order`; Add an order note “Add a thank-you card”",
              ],
              [
                "Flag repeat customers as VIP",
                "`order.paid`",
                "Customer order count is at least `5`",
                "Tag the customer `vip`",
              ],
              [
                "Know when stock runs low",
                "`inventory.low_stock`",
                "none",
                "Send an email to the buyer: “Variant {{event.variantId}} is down to {{event.available}}”",
              ],
              [
                "Catch orders shipping abroad",
                "`order.placed`",
                "Shipping country is not `BD`",
                "Tag the order `international`; Put the order on hold “Check shipping”",
              ],
              [
                "React to affiliate fraud",
                "`affiliate.fraud_flagged`",
                "none",
                "Hold affiliate earnings; Send an email to the affiliate manager",
              ],
              [
                "Review complaints quickly",
                "`return.requested`",
                "none",
                "Send an email to support with {{order.number}}",
              ],
            ],
          },
        ],
      },
      {
        id: "manage",
        title: "History, pausing and deleting",
        blocks: [
          {
            kind: "list",
            items: [
              "The list shows each rule's trigger and when it **last ran**. Open a rule to see its **run history**: every event of the trigger while it was enabled, whether it matched, and each action's result.",
              "To pause a rule, switch **Enabled** off. Events that happen while it's off aren't caught up later.",
              "**Delete rule** removes the rule and its history. Prefer switching it off if you might want it back.",
              "If two people edit the same rule, the second save is refused with “Rule was changed; reload”, so nobody's changes are lost silently.",
              "Creating, changing and deleting rules is recorded in the **Audit log**.",
            ],
          },
          {
            kind: "table",
            head: ["Limit", "Value"],
            rows: [
              ["Conditions per rule", "20"],
              ["Actions per rule", "10"],
              ["Email recipients per action", "10"],
              ["Tag length", "50 characters"],
              ["Reason length", "200 characters"],
              ["Note length", "1,000 characters"],
              ["Email message length", "5,000 characters"],
            ],
          },
        ],
      },
    ],
  };
}

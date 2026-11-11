import { describe, expect, it } from "vitest";
import {
  answerPayload,
  bulkSummary,
  changedBy,
  decisionsFor,
  parseKind,
  parseStatus,
  replyPayload,
  reviewAuthor,
} from "./moderation";

describe("moderation helpers", () => {
  it("reads the tab and status from the URL with the API's defaults", () => {
    expect(parseKind(undefined)).toBe("reviews");
    expect(parseKind("questions")).toBe("questions");
    expect(parseKind("bogus")).toBe("reviews");
    expect(parseStatus(undefined)).toBe("PENDING");
    expect(parseStatus("REJECTED")).toBe("REJECTED");
    expect(parseStatus("ALL")).toBe("PENDING");
  });

  it("offers only decisions that change the item", () => {
    expect(decisionsFor("PENDING")).toEqual(["APPROVED", "REJECTED"]);
    expect(decisionsFor("APPROVED")).toEqual(["REJECTED"]);
    expect(decisionsFor("REJECTED")).toEqual(["APPROVED"]);
    const rows = [
      { id: "a", status: "PENDING" as const },
      { id: "b", status: "APPROVED" as const },
    ];
    expect(changedBy(rows, "APPROVED").map((r) => r.id)).toEqual(["a"]);
    expect(changedBy(rows, "REJECTED").map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("names the reviewer for staff", () => {
    expect(reviewAuthor({ firstName: "Ayesha", lastName: "Rahman", email: "a@x.test" })).toEqual({
      name: "Ayesha Rahman",
      email: "a@x.test",
    });
    expect(reviewAuthor({ firstName: null, lastName: null, email: "a@x.test" }).name).toBe("a@x.test");
    expect(reviewAuthor({ firstName: null, lastName: null, email: null }).name).toBe("Customer");
  });

  it("builds reply and answer payloads", () => {
    expect(replyPayload("  Thanks!  ")).toEqual({ reply: "Thanks!" });
    // clearing the box removes the reply
    expect(replyPayload("   ")).toEqual({ reply: null });
    expect(replyPayload("x".repeat(2001))).toHaveProperty("error");
    expect(answerPayload(" Yes ")).toEqual({ answer: "Yes" });
    expect(answerPayload("  ")).toHaveProperty("error");
    expect(answerPayload("x".repeat(2001))).toHaveProperty("error");
  });

  it("summarises bulk decisions", () => {
    const ok: PromiseSettledResult<unknown> = { status: "fulfilled", value: 1 };
    const bad: PromiseSettledResult<unknown> = { status: "rejected", reason: new Error("x") };
    expect(bulkSummary("APPROVED", [ok, ok])).toBe("2 approved");
    expect(bulkSummary("REJECTED", [ok, bad])).toBe("1 rejected, 1 failed");
  });
});

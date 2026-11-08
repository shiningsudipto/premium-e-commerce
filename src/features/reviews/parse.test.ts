import { describe, expect, it } from "vitest";
import {
  formatAverage,
  hasMoreReviews,
  ratingBars,
  readQuestionInput,
  readReviewInput,
  toQuestionPage,
  toReviewPage,
} from "./parse";

const review = {
  id: "r1",
  rating: 4,
  title: "Lovely",
  body: "Soft leather, holds a lot.",
  mediaUrls: [],
  verifiedBuyer: true,
  helpfulCount: 3,
  reply: null,
  repliedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  author: "Rina K.",
};

describe("toReviewPage", () => {
  it("reads the API's review page", () => {
    const page = toReviewPage({
      summary: { average: 4.25, count: 4, distribution: { "1": 0, "2": 0, "3": 1, "4": 1, "5": 2 } },
      items: [review],
      total: 4,
      page: 1,
      pageSize: 10,
    });
    expect(page?.summary).toEqual({ average: 4.25, count: 4, distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 } });
    expect(page?.items).toEqual([
      {
        id: "r1",
        rating: 4,
        title: "Lovely",
        body: "Soft leather, holds a lot.",
        author: "Rina K.",
        verifiedBuyer: true,
        helpfulCount: 3,
        reply: null,
        repliedAt: null,
        createdAt: "2026-10-01T10:00:00.000Z",
      },
    ]);
  });

  it("drops malformed reviews and fills missing distribution counts", () => {
    const page = toReviewPage({
      summary: { average: null, count: 0 },
      items: [review, { id: "bad", rating: 9, body: "x", createdAt: "2026-10-01" }, null, { ...review, id: 7 }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(page?.items.map((r) => r.id)).toEqual(["r1"]);
    expect(page?.summary).toEqual({ average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });

  it("refuses something that isn't a review page", () => {
    expect(toReviewPage(null)).toBeNull();
    expect(toReviewPage({ items: [] })).toBeNull();
    expect(toReviewPage("nope")).toBeNull();
  });
});

describe("hasMoreReviews", () => {
  it("knows when another page exists", () => {
    expect(hasMoreReviews({ page: 1, pageSize: 10, total: 11 })).toBe(true);
    expect(hasMoreReviews({ page: 2, pageSize: 10, total: 20 })).toBe(false);
    expect(hasMoreReviews({ page: 1, pageSize: 10, total: 0 })).toBe(false);
  });
});

describe("ratingBars", () => {
  it("lists 5 stars first with rounded percentages", () => {
    expect(ratingBars({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 1 })).toEqual([
      { rating: 5, count: 1, percent: 33 },
      { rating: 4, count: 1, percent: 33 },
      { rating: 3, count: 0, percent: 0 },
      { rating: 2, count: 0, percent: 0 },
      { rating: 1, count: 1, percent: 33 },
    ]);
  });

  it("is all zeros without reviews", () => {
    expect(ratingBars({}).every((b) => b.count === 0 && b.percent === 0)).toBe(true);
  });
});

describe("formatAverage", () => {
  it("shows one decimal", () => {
    expect(formatAverage(4.25, "en")).toBe("4.3");
    expect(formatAverage(4, "en")).toBe("4.0");
    expect(formatAverage(7, "en")).toBe("5.0");
  });
});

describe("readReviewInput", () => {
  it("accepts a valid review and trims it", () => {
    expect(readReviewInput({ rating: "5", title: "  Great ", body: "  Really well made bag. " })).toEqual({
      input: { rating: 5, title: "Great", body: "Really well made bag." },
      errors: {},
    });
  });

  it("leaves out an empty title", () => {
    expect(readReviewInput({ rating: "3", title: " ", body: "Fine for the price." }).input).toEqual({
      rating: 3,
      body: "Fine for the price.",
    });
  });

  it("reports each problem", () => {
    expect(readReviewInput({ rating: "", title: "x".repeat(151), body: "short" })).toEqual({
      input: null,
      errors: { rating: "ratingRequired", title: "titleTooLong", body: "bodyTooShort" },
    });
    expect(readReviewInput({ rating: "6", title: "", body: "x".repeat(5001) }).errors).toEqual({
      rating: "ratingRequired",
      body: "bodyTooLong",
    });
  });
});

describe("readQuestionInput", () => {
  it("checks the length", () => {
    expect(readQuestionInput("  Does it fit a laptop? ")).toEqual({ body: "Does it fit a laptop?" });
    expect(readQuestionInput("Hi")).toEqual({ body: null, error: "questionTooShort" });
    expect(readQuestionInput("x".repeat(1001))).toEqual({ body: null, error: "questionTooLong" });
  });
});

describe("toQuestionPage", () => {
  it("reads questions with their answers", () => {
    expect(
      toQuestionPage({
        items: [
          {
            id: "q1",
            body: "Is it waterproof?",
            createdAt: "2026-10-02T00:00:00.000Z",
            answers: [{ id: "a1", body: "Water resistant.", createdAt: "2026-10-03T00:00:00.000Z" }, { id: 1 }],
          },
          { id: "q2" },
        ],
        nextCursor: "q1",
      }),
    ).toEqual({
      items: [
        {
          id: "q1",
          body: "Is it waterproof?",
          createdAt: "2026-10-02T00:00:00.000Z",
          answers: [{ id: "a1", body: "Water resistant.", createdAt: "2026-10-03T00:00:00.000Z" }],
        },
      ],
      nextCursor: "q1",
    });
    expect(toQuestionPage({ items: [], nextCursor: null })).toEqual({ items: [], nextCursor: null });
    expect(toQuestionPage({})).toBeNull();
  });
});

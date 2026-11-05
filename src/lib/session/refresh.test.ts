import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRefreshCache, refreshOnce } from "./refresh";

const tokens = { accessToken: "a2", accessTokenExpiresAt: "", refreshToken: "r2", refreshTokenExpiresAt: "" };

describe("refreshOnce", () => {
  beforeEach(clearRefreshCache);

  it("shares one API call between concurrent refreshes of the same token", async () => {
    const call = vi.fn(async () => tokens);
    const results = await Promise.all([refreshOnce("r1", call), refreshOnce("r1", call), refreshOnce("r1", call)]);
    expect(call).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === tokens)).toBe(true);
    // a late request still carrying the old cookie gets the same tokens instead of replaying r1
    expect(await refreshOnce("r1", call)).toBe(tokens);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("forgets results after a minute and retries after network errors", async () => {
    const call = vi.fn(async () => tokens);
    await refreshOnce("r1", call);
    await refreshOnce("other", call, Date.now() + 61_000);
    await refreshOnce("r1", call);
    expect(call).toHaveBeenCalledTimes(3);

    const flaky = vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValueOnce(tokens);
    await expect(refreshOnce("r9", flaky)).rejects.toThrow("ECONNREFUSED");
    expect(await refreshOnce("r9", flaky)).toBe(tokens);
  });
});

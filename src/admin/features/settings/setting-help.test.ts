import { describe, expect, it } from "vitest";
import { SETTING_HELP } from "./setting-help";

// Every help entry is complete and its inline formatting is balanced (rendered on the settings
// screen). The keys themselves mirror premium-ec-backend/src/contracts/settings.ts.

describe("setting help", () => {
  const entries = Object.entries(SETTING_HELP);

  it("covers the store's settings", () => {
    expect(entries.length).toBeGreaterThanOrEqual(44);
    for (const key of [
      "store.name",
      "cart.abandoned_emails_enabled",
      "payments.manual.enabled",
      "webhooks.max_failures",
    ]) {
      expect(SETTING_HELP[key], key).toBeDefined();
    }
  });

  it.each(entries)("%s has every part filled in", (_key, help) => {
    expect(help.what.length).toBeGreaterThan(10);
    expect(help.why.length).toBeGreaterThan(10);
    expect(help.effects.length).toBeGreaterThan(0);
    expect(help.recommended.length).toBeGreaterThan(2);
    for (const text of [help.what, help.why, help.recommended, help.caution ?? "", ...help.effects]) {
      expect((text.match(/`/g) ?? []).length % 2, text).toBe(0);
      expect((text.match(/\*\*/g) ?? []).length % 2, text).toBe(0);
    }
  });
});

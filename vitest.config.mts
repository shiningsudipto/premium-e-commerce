import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}", "*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    env: {
      API_URL: "http://api.test",
      SITE_URL: "http://shop.test",
      REVALIDATE_SECRET: "test-secret-that-is-at-least-32-characters",
      DEFAULT_MARKET: "en-bd",
      CHANNEL: "web",
    },
  },
});

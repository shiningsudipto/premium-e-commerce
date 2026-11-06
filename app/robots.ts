import type { MetadataRoute } from "next";
import { env, isProduction } from "@/src/lib/env";

// Crawl the shop, not the shopper's own pages, search results or the back office. Anything
// other than production (previews, staging) asks not to be indexed at all.
export default function robots(): MetadataRoute.Robots {
  if (!isProduction || !env.SITE_URL.startsWith("https://")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/*/account", "/*/cart", "/*/checkout", "/*/search"],
    },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).toString(),
    host: env.SITE_URL,
  };
}

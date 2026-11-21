import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // records that this app is kept on Next.js security releases (set by `next upgrade --agent=security`)
    agentUpgrade: "security",
  },
  cacheComponents: true,
  // product and CMS images uploaded in admin are stored on Cloudinary
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
  partialPrefetching: true,
  // The browser can reach the API through this site at /api/v1/… (set NEXT_PUBLIC_API_URL to
  // "<this site>/api"). Session cookies then belong to this site, which is required when the API
  // is on an unrelated domain (e.g. two *.vercel.app projects can't share cookies). Locally,
  // NEXT_PUBLIC_API_URL points straight at the API and this rule goes unused.
  async rewrites() {
    const api = process.env.API_URL?.replace(/\/+$/, "");
    return api ? [{ source: "/api/v1/:path*", destination: `${api}/v1/:path*` }] : [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);

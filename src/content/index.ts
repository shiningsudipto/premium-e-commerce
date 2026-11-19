import { homeEn, type HomeContent } from "./home";
import { homeBn } from "./home.bn";
import { siteEn, type SiteContent } from "./site";
import { siteBn } from "./site.bn";

// Editorial content in the page's language (the locale of the /{locale}-{market}/ segment).
// Pure lookups, so pages that use them stay prerendered. Unknown locales get English.

export const homeContent = (locale: string): HomeContent => (locale === "bn" ? homeBn : homeEn);

export const siteContent = (locale: string): SiteContent => (locale === "bn" ? siteBn : siteEn);

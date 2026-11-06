import Link from "next/link";
import { env } from "../../lib/env";

export type Crumb = { label: string; href?: string };

// Breadcrumbs with their BreadcrumbList structured data. The last crumb is the current page.
export function Breadcrumbs({ items, label = "Breadcrumb" }: { items: Crumb[]; label?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, env.SITE_URL).toString() } : {}),
    })),
  };
  return (
    <nav aria-label={label}>
      <ol className="crumbs">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`}>
            {item.href && i < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </nav>
  );
}

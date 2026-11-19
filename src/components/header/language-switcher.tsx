"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LANGUAGES, localizedPath, type Language } from "../../i18n/languages";

type SwitcherProps = {
  /** the page's locale and market handle, from the /{locale}-{market}/ segment */
  locale: string;
  market: string;
  languages: Language[];
  /** "header": on small screens only the other language shows; "footer": on the dark footer */
  placement: "header" | "footer";
};

// EN / বাংলা: links to the same page (path and query) in each language the market offers.
// Plain <a> elements on purpose: another language is another root segment, so it is a full
// navigation, and proxy.ts remembers the choice in the market cookie. The URL is read on the client
// (usePathname/useSearchParams) inside a Suspense boundary, so the header and footer stay part of
// the prerendered shell; until it hydrates (or without JavaScript) the links go through
// /api/language, which sends the shopper to the same page in that language (from the Referer).
export function LanguageSwitcher(props: SwitcherProps) {
  if (props.languages.length < 2) return null;
  return (
    <Suspense fallback={<LanguageLinks {...props} hrefFor={(language) => `/api/language?locale=${language}`} />}>
      <CurrentPageLinks {...props} />
    </Suspense>
  );
}

function CurrentPageLinks(props: SwitcherProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return <LanguageLinks {...props} hrefFor={(language) => localizedPath(pathname, search, language, props.market)} />;
}

const tones = {
  header: {
    nav: "text-sm font-medium",
    link: "text-[var(--color-foreground)]! hover:underline",
    current: "max-sm:hidden",
  },
  footer: {
    nav: "text-sm",
    link: "text-[var(--color-on-dark-muted)]! hover:text-[var(--color-on-dark)]! hover:underline",
    current: "",
  },
};

function LanguageLinks({
  locale,
  languages,
  placement,
  hrefFor,
}: SwitcherProps & {
  hrefFor: (language: Language) => string;
}) {
  const tone = tones[placement];
  const current = locale in LANGUAGES ? LANGUAGES[locale as Language] : LANGUAGES.en;
  return (
    <nav aria-label={current.switcherLabel} className={tone.nav} data-language-switcher={placement}>
      <ul className="m-0 flex list-none items-center p-0">
        {languages.map((language, i) => {
          const isCurrent = language === locale;
          const { name, short } = LANGUAGES[language];
          return (
            <li key={language} className={`flex items-center ${isCurrent ? tone.current : ""}`}>
              {i > 0 && (
                <span aria-hidden="true" className={`px-0.5 opacity-50 ${tone.current}`}>
                  /
                </span>
              )}
              <a
                href={hrefFor(language)}
                hrefLang={language}
                lang={language}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={short === name ? undefined : name}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center px-1.5 no-underline ${tone.link} ${
                  isCurrent ? "font-semibold underline underline-offset-4" : ""
                }`}
              >
                {short}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localeName, translationStatus } from "./translation-model";

export { editorHref } from "./translation-model";

// "Bangla (বাংলা)", with the native name marked as Bangla for screen readers.
export function LocaleName({ code }: { code: string }) {
  const { name, native } = localeName(code);
  return (
    <>
      {name}
      {native && (
        <>
          {" ("}
          <span lang={code}>{native}</span>
          {")"}
        </>
      )}
    </>
  );
}

export const localeText = (code: string) => {
  const { name, native } = localeName(code);
  return native ? `${name} (${native})` : name;
};

// The language being translated into: a label when there's only one, else a picker.
export function LanguagePicker({
  locales,
  value,
  onChange,
}: {
  locales: string[];
  value: string;
  onChange: (locale: string) => void;
}) {
  const id = useId();
  if (locales.length <= 1) {
    return (
      <p className="text-sm">
        <span className="text-muted-foreground">Language: </span>
        <span className="font-medium">
          <LocaleName code={value} />
        </span>
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span id={id} className="text-sm text-muted-foreground">
        Language
      </span>
      <Select
        items={locales.map((l) => ({ value: l, label: localeText(l) }))}
        value={value}
        onValueChange={(v) => v && onChange(v)}
      >
        <SelectTrigger aria-labelledby={id} className="h-8 w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((l) => (
            <SelectItem key={l} value={l}>
              <LocaleName code={l} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StatusBadge({ item }: { item: { translation: unknown; outdated: boolean } }) {
  const status = translationStatus(item);
  if (status === "missing") return <Badge variant="outline">Missing</Badge>;
  if (status === "outdated")
    return (
      <Badge variant="destructive" title="The English text changed after this translation was saved">
        Outdated
      </Badge>
    );
  return <Badge variant="secondary">Translated</Badge>;
}

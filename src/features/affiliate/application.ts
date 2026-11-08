// The affiliate application's custom fields (admin → Custom fields, entity AFFILIATE). The API
// validates the application against the definitions, but has no storefront endpoint that lists
// them yet, so the form mirrors the program's fields here (premium-ec-backend scripts/seed.ts).
// Keys must match the definitions; labels live in messages (affiliate.apply.fields.<key>).

export type ApplicationField = {
  key: string;
  type: "text" | "textarea" | "url" | "number";
  required: boolean;
  autoComplete?: string;
};

export const APPLICATION_FIELDS: ApplicationField[] = [
  { key: "website", type: "url", required: true, autoComplete: "url" },
  { key: "audience_size", type: "number", required: false },
  { key: "promotion_methods", type: "textarea", required: false },
];

const MAX_TEXT = 2000;

// Turns the posted form into the API's `application` object, with per-field error codes
// (the shared forms.errors.* messages) for anything that can be checked before sending.
export function readApplication(form: FormData, fields: ApplicationField[] = APPLICATION_FIELDS) {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  const application: Record<string, string | number> = {};
  for (const f of fields) {
    const raw = form.get(f.key);
    const value = typeof raw === "string" ? raw.trim() : "";
    values[f.key] = value;
    if (!value) {
      if (f.required) errors[f.key] = "required";
      continue;
    }
    if (value.length > MAX_TEXT) {
      errors[f.key] = "tooLong";
      continue;
    }
    if (f.type === "number") {
      const n = Number(value.replace(/[\s,]/g, ""));
      if (!Number.isFinite(n) || n < 0) errors[f.key] = "invalid";
      else application[f.key] = n;
    } else if (f.type === "url") {
      // "example.com" is what most people type; the API wants a full URL
      const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
      try {
        const url = new URL(withScheme);
        if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) throw new Error("bad url");
        application[f.key] = url.toString();
      } catch {
        errors[f.key] = "invalid";
      }
    } else {
      application[f.key] = value;
    }
  }
  return { values, errors, application };
}

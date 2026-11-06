// Reading and checking the address form before it goes to the API, so mistakes show next to
// their fields straight away. The API validates again (contracts/common addressInput).

export type Address = {
  firstName: string;
  lastName: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
};

export type FieldErrors = Partial<Record<string, string>>;

const LIMITS: Record<keyof Address, number> = {
  firstName: 100,
  lastName: 100,
  company: 200,
  line1: 200,
  line2: 200,
  city: 100,
  region: 100,
  postalCode: 20,
  country: 2,
  phone: 40,
};
const REQUIRED: (keyof Address)[] = ["firstName", "lastName", "line1", "city", "country"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

// Field names are prefixed ("shipping.city") so one form can hold two addresses.
export function readAddress(form: FormData, prefix: string): { address: Address; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const values = {} as Record<keyof Address, string>;
  for (const key of Object.keys(LIMITS) as (keyof Address)[]) {
    const value = text(form, `${prefix}.${key}`);
    values[key] = key === "country" ? value.toUpperCase() : value;
    if (REQUIRED.includes(key) && !value) errors[`${prefix}.${key}`] = "required";
    else if (value.length > LIMITS[key]) errors[`${prefix}.${key}`] = "tooLong";
  }
  if (values.country && !/^[A-Z]{2}$/.test(values.country)) errors[`${prefix}.country`] = "invalid";
  if (values.phone && !/^[+\d][\d\s().-]{5,}$/.test(values.phone)) errors[`${prefix}.phone`] = "invalid";
  const optional = (v: string) => v || null;
  return {
    address: {
      firstName: values.firstName,
      lastName: values.lastName,
      company: optional(values.company),
      line1: values.line1,
      line2: optional(values.line2),
      city: values.city,
      region: optional(values.region),
      postalCode: optional(values.postalCode),
      country: values.country,
      phone: optional(values.phone),
    },
    errors,
  };
}

export function readEmail(form: FormData, name = "email"): { email: string; error?: string } {
  const email = text(form, name).toLowerCase();
  if (!email) return { email, error: "required" };
  if (!EMAIL.test(email) || email.length > 254) return { email, error: "invalid" };
  return { email };
}

// One line for summaries: "Ayesha Rahman, 12 Road 4, Dhaka 1205, BD".
export function formatAddress(a: Partial<Address> | null | undefined): string {
  if (!a) return "";
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const place = [a.city, a.postalCode].filter(Boolean).join(" ");
  return [name, a.company, a.line1, a.line2, place, a.region, a.country].filter(Boolean).join(", ");
}

export function isAddress(value: unknown): value is Address {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return typeof a.line1 === "string" && typeof a.city === "string" && typeof a.country === "string";
}

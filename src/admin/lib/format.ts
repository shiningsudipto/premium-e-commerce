const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
}

// Long IDs shortened for tables; the full value stays in the title attribute.
export const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-6)}` : id);

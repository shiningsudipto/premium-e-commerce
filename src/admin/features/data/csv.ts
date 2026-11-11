// CSV reading and writing for the import wizard and report downloads. RFC 4180: fields may be
// quoted, quotes inside quoted fields are doubled, and quoted fields may contain commas and
// line breaks. Both \n and \r\n end a row; a leading byte-order mark is ignored.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") endField();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else field += ch;
  }
  if (field !== "" || row.length > 0) endRow();
  // blank lines carry no data (the API skips them too)
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type CsvCell = string | number | boolean | null | undefined;

// A spreadsheet runs a cell that starts with = + - @ as a formula. Text cells that look like
// that get a leading apostrophe; numbers (including negative ones) are left alone.
function neutralise(value: string): string {
  if (/^[=+@\t\r]/.test(value) || (value.startsWith("-") && !/^-\d/.test(value))) return `'${value}`;
  return value;
}

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? neutralise(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// Columns + rows as a CSV file: one header row, then one row per record.
export function tableToCsv<T>(columns: { header: string; value: (row: T) => CsvCell }[], rows: T[]): string {
  return toCsv([columns.map((c) => c.header), ...rows.map((r) => columns.map((c) => c.value(r)))]);
}

export type ImportFormat = "csv" | "json";

export type FileSummary =
  | { ok: true; format: ImportFormat; headers: string[]; rowCount: number; sample: Record<string, string>[] }
  | { ok: false; message: string };

export function detectFormat(fileName: string, content: string): ImportFormat {
  if (/\.json$/i.test(fileName)) return "json";
  if (/\.csv$/i.test(fileName)) return "csv";
  return /^\s*\[/.test(content) ? "json" : "csv";
}

const SAMPLE_ROWS = 3;

// What the wizard needs to know about a file before mapping: its columns, how many rows it
// has and a few values per column. JSON files are an array of flat objects (the API's format).
export function summariseFile(format: ImportFormat, content: string): FileSummary {
  if (content.trim() === "") return { ok: false, message: "The file is empty." };
  if (format === "json") {
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return { ok: false, message: "This isn't valid JSON." };
    }
    if (!Array.isArray(data)) return { ok: false, message: "A JSON import must be an array of rows." };
    const objects = data.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null);
    if (objects.length !== data.length)
      return { ok: false, message: "Every item in the JSON array must be an object." };
    const headers = [...new Set(objects.flatMap((r) => Object.keys(r)))];
    if (headers.length === 0) return { ok: false, message: "The file has no rows." };
    const sample = objects
      .slice(0, SAMPLE_ROWS)
      .map((r) => Object.fromEntries(headers.map((h) => [h, r[h] === null || r[h] === undefined ? "" : String(r[h])])));
    return { ok: true, format, headers, rowCount: objects.length, sample };
  }
  const rows = parseCsv(content);
  const [head, ...body] = rows;
  if (!head) return { ok: false, message: "The file has no header row." };
  const headers = head.map((h) => h.trim());
  if (headers.some((h) => h === "")) return { ok: false, message: "Every column needs a name in the header row." };
  const dupe = headers.find((h, i) => headers.indexOf(h) !== i);
  if (dupe) return { ok: false, message: `The column "${dupe}" appears twice in the header row.` };
  if (body.length === 0) return { ok: false, message: "The file has a header row but no data rows." };
  const sample = body.slice(0, SAMPLE_ROWS).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return { ok: true, format, headers, rowCount: body.length, sample };
}

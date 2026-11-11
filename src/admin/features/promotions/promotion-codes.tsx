"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { CopyIcon, DownloadIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetV1AdminPromotionsIdCodesQuery,
  usePatchV1AdminPromotionsCodesIdMutation,
  usePostV1AdminPromotionsIdCodesMutation,
  type GetV1AdminPromotionsIdCodesApiResponse,
} from "../../store/api.generated";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { Section } from "../products/section";
import { parseCodes, parseInteger, validateGenerate, type GenerateForm, type Promotion } from "./promotion-form";

type Code = GetV1AdminPromotionsIdCodesApiResponse["items"][number];

function CodeToggle({ code }: { code: Code }) {
  const [setActive, state] = usePatchV1AdminPromotionsCodesIdMutation();
  const toggle = (isActive: boolean) =>
    setActive({ id: code.id, body: { isActive } })
      .unwrap()
      .then(() => notifySaved(`${code.code} ${isActive ? "enabled" : "disabled"}`), notifyError);
  if (!code.isActive)
    return (
      <Button size="xs" variant="outline" disabled={state.isLoading} onClick={() => toggle(true)}>
        Enable
      </Button>
    );
  return (
    <ConfirmDialog
      trigger={
        <Button size="xs" variant="ghost">
          Disable
        </Button>
      }
      title={`Disable ${code.code}?`}
      description="Shoppers can no longer use it. Orders that already used it keep their discount. You can enable it again."
      confirmLabel="Disable code"
      destructive
      onConfirm={() => toggle(false)}
    />
  );
}

function columns(canWrite: boolean): ColumnDef<Code>[] {
  return [
    {
      header: "Code",
      cell: ({ row: { original: c } }) => <span className="font-mono text-xs font-medium">{c.code}</span>,
    },
    {
      header: "Uses",
      cell: ({ row: { original: c } }) => (
        <span className="text-xs tabular-nums">
          {c.usageCount}
          {c.usageLimit !== null && <span className="text-muted-foreground"> / {c.usageLimit}</span>}
        </span>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: c } }) => (
        <span className="flex gap-1">
          {c.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Disabled</Badge>}
          {c.usageLimit !== null && c.usageCount >= c.usageLimit && <Badge variant="secondary">Used up</Badge>}
          {c.affiliateId && <Badge variant="secondary">Affiliate</Badge>}
        </span>
      ),
    },
    {
      header: "Created",
      cell: ({ row: { original: c } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(c.createdAt)}</span>
      ),
    },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => <CodeToggle code={row.original} />,
          } satisfies ColumnDef<Code>,
        ]
      : []),
  ];
}

// A code promotion's codes (spec §8.2): listed, added from a list or generated in bulk, and
// disabled one by one. The API keeps codes for order history, so they can't be deleted.
export function PromotionCodes({ promotion, canWrite }: { promotion: Promotion; canWrite: boolean }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const pages = useCursorPages(search);
  const codes = useGetV1AdminPromotionsIdCodesQuery({
    id: promotion.id,
    limit: 25,
    ...(search ? { q: search } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <div className="space-y-6">
      {canWrite && promotion.status !== "ARCHIVED" && <AddCodes promotion={promotion} />}
      <Section
        title="Codes"
        description={`${promotion._count.codes} in total. Codes can't be deleted, so past orders keep their history; disable a code to stop it working.`}
      >
        <DataTable
          tableKey={`promotion-codes-${promotion.id}`}
          columns={columns(canWrite)}
          data={codes.data?.items}
          loading={codes.isFetching}
          error={codes.error}
          getRowId={(c) => c.id}
          emptyMessage={search ? "No codes match." : "No codes yet."}
          toolbar={
            <form
              role="search"
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(query.trim());
              }}
            >
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  aria-label="Search codes"
                  placeholder="Search codes"
                  className="h-8 w-48 pl-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Search
              </Button>
            </form>
          }
          pagination={{
            page: pages.page,
            hasNext: !!codes.data?.nextCursor,
            hasPrevious: pages.hasPrevious,
            onNext: () => pages.next(codes.data?.nextCursor),
            onPrevious: pages.previous,
          }}
        />
      </Section>
    </div>
  );
}

function downloadCsv(name: string, codes: string[]) {
  const blob = new Blob([`code\n${codes.join("\n")}\n`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function AddCodes({ promotion }: { promotion: Promotion }) {
  const [mode, setMode] = useState<"list" | "generate">("list");
  const [text, setText] = useState("");
  const [gen, setGen] = useState<GenerateForm>({ count: "50", prefix: "", length: "8", usageLimit: "" });
  const [listLimit, setListLimit] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [generated, setGenerated] = useState<string[] | null>(null);
  const [addCodes, state] = usePostV1AdminPromotionsIdCodesMutation();

  const parsed = parseCodes(text);
  const listLimitValue = parseInteger(listLimit);
  const listLimitError =
    listLimitValue !== null && (Number.isNaN(listLimitValue) || listLimitValue < 1)
      ? "A whole number of at least 1, or empty"
      : null;
  const genErrors = validateGenerate(gen);

  function submit() {
    setShowErrors(true);
    if (mode === "list") {
      if (!parsed.codes.length || parsed.invalid.length || listLimitError) return;
      addCodes({ id: promotion.id, body: { codes: parsed.codes, usageLimit: listLimitValue } })
        .unwrap()
        .then((r) => {
          notifySaved(`${r.created} code${r.created === 1 ? "" : "s"} added`);
          setText("");
          setShowErrors(false);
        }, notifyError);
    } else {
      if (Object.keys(genErrors).length) return;
      addCodes({
        id: promotion.id,
        body: {
          generate: {
            count: parseInteger(gen.count)!,
            length: parseInteger(gen.length)!,
            ...(gen.prefix ? { prefix: gen.prefix.toUpperCase() } : {}),
          },
          usageLimit: parseInteger(gen.usageLimit),
        },
      })
        .unwrap()
        .then((r) => {
          notifySaved(`${r.created} codes generated`);
          setGenerated(r.codes ?? []);
          setShowErrors(false);
        }, notifyError);
    }
  }

  return (
    <Section title="Add codes" description="Codes are stored upper-case and must be unique across the store.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Tabs value={mode} onValueChange={(v) => setMode(v as "list" | "generate")}>
          <TabsList>
            <TabsTrigger value="list">Add a list</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-3 pt-3">
            <Field data-invalid={showErrors && (parsed.invalid.length > 0 || !parsed.codes.length) ? true : undefined}>
              <FieldLabel htmlFor="codes-list">Codes</FieldLabel>
              <Textarea
                id="codes-list"
                rows={4}
                className="font-mono"
                placeholder={"SUMMER10\nVIP-2026"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <FieldDescription>
                One per line, or separated by commas or spaces. {parsed.codes.length} valid
                {parsed.invalid.length > 0 && `, ${parsed.invalid.length} invalid`}.
              </FieldDescription>
              {showErrors && parsed.invalid.length > 0 && (
                <FieldError>
                  Letters, digits, - and _ only, 3 to 40 characters: {parsed.invalid.slice(0, 5).join(", ")}
                  {parsed.invalid.length > 5 && "…"}
                </FieldError>
              )}
              {showErrors && !parsed.codes.length && !parsed.invalid.length && (
                <FieldError>Enter at least one code</FieldError>
              )}
            </Field>
            <Field className="max-w-48" data-invalid={showErrors && listLimitError ? true : undefined}>
              <FieldLabel htmlFor="codes-list-limit">Uses per code</FieldLabel>
              <Input
                id="codes-list-limit"
                inputMode="numeric"
                placeholder="Unlimited"
                value={listLimit}
                onChange={(e) => setListLimit(e.target.value)}
              />
              {showErrors && listLimitError && <FieldError>{listLimitError}</FieldError>}
            </Field>
          </TabsContent>
          <TabsContent value="generate" className="pt-3">
            <div className="grid gap-4 sm:grid-cols-4">
              {(
                [
                  ["count", "How many", "50"],
                  ["prefix", "Prefix (optional)", "SUMMER-"],
                  ["length", "Random characters", "8"],
                  ["usageLimit", "Uses per code", "Unlimited"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <Field key={key} data-invalid={showErrors && genErrors[key] ? true : undefined}>
                  <FieldLabel htmlFor={`codes-gen-${key}`}>{label}</FieldLabel>
                  <Input
                    id={`codes-gen-${key}`}
                    inputMode={key === "prefix" ? undefined : "numeric"}
                    className={key === "prefix" ? "font-mono uppercase" : undefined}
                    placeholder={placeholder}
                    value={gen[key]}
                    onChange={(e) => setGen({ ...gen, [key]: e.target.value })}
                  />
                  {showErrors && genErrors[key] && <FieldError>{genErrors[key]}</FieldError>}
                </Field>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={state.isLoading}>
            {state.isLoading ? "Adding…" : mode === "list" ? "Add codes" : "Generate codes"}
          </Button>
        </div>
      </form>

      {generated && generated.length > 0 && (
        <div className="mt-4 space-y-2 rounded-md border bg-muted/40 p-3" role="status">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{generated.length} new codes</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigator.clipboard
                    .writeText(generated.join("\n"))
                    .then(() => notifySaved("Codes copied"), notifyError)
                }
              >
                <CopyIcon /> Copy all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadCsv(`${promotion.name.replace(/[^a-z0-9]+/gi, "-")}-codes.csv`, generated)}
              >
                <DownloadIcon /> Download CSV
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setGenerated(null)}>
                Dismiss
              </Button>
            </div>
          </div>
          <pre className="max-h-40 overflow-auto font-mono text-xs">{generated.slice(0, 200).join("\n")}</pre>
          {generated.length > 200 && (
            <p className="text-xs text-muted-foreground">Showing 200; copy or download for the full list.</p>
          )}
        </div>
      )}
    </Section>
  );
}

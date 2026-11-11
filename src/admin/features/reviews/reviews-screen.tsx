"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BadgeCheckIcon, CheckIcon, ImageIcon, StarIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useGetV1AdminModerationQuery,
  usePatchV1AdminModerationQuestionsIdMutation,
  usePatchV1AdminModerationReviewsIdMutation,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { PageHeader } from "../../components/console-shell";
import { DataTable, type BulkAction } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  ANSWER_MAX,
  answerPayload,
  bulkSummary,
  changedBy,
  decisionsFor,
  MODERATION_STATUS_LABELS,
  MODERATION_STATUSES,
  moderationStatusVariant,
  parseKind,
  parseStatus,
  REPLY_MAX,
  replyPayload,
  reviewAuthor,
  starLabel,
  type Decision,
  type ModerationKind,
  type ModerationStatus,
  type QuestionRow,
  type ReviewRow,
} from "./moderation";

// The tab and status live in the URL (not shown as DataTable filters: the API has no "all").
const URL_KEYS: FilterDef[] = [
  { key: "kind", label: "Kind", type: "text" },
  { key: "status", label: "Status", type: "text" },
];

const DECISION_LABELS: Record<Decision, string> = { APPROVED: "Approve", REJECTED: "Reject" };

// Reviews & Q&A moderation (spec §5.12): pending reviews and questions first; approve or reject,
// reply to reviews and answer questions.
export function ReviewsScreen() {
  const { values, setValues, key } = useTableFilters(URL_KEYS);
  const kind = parseKind(values.kind);
  const status = parseStatus(values.status);
  const pages = useCursorPages(key);
  const queue = useGetV1AdminModerationQuery({
    kind,
    status,
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  // currentData: only rows for these arguments, never the other tab's shape
  const data = queue.currentData;
  const pagination = {
    page: pages.page,
    hasNext: !!data?.nextCursor,
    hasPrevious: pages.hasPrevious,
    onNext: () => pages.next(data?.nextCursor),
    onPrevious: pages.previous,
  };
  const statusPicker = (
    <StatusPicker
      value={status}
      onChange={(next) => setValues({ kind: values.kind, status: next === "PENDING" ? undefined : next })}
    />
  );

  return (
    <>
      <PageHeader
        title="Reviews & Q&A"
        description="Approve or reject what shoppers write before it appears on product pages. Reply to reviews and answer questions."
      />
      <Tabs
        value={kind}
        onValueChange={(next) =>
          setValues({ kind: next === "questions" ? "questions" : undefined, status: values.status })
        }
      >
        <TabsList aria-label="What to moderate">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="pt-2">
          {kind === "reviews" && (
            <ReviewsTable
              rows={data?.kind === "reviews" ? data.items : undefined}
              loading={queue.isFetching}
              error={queue.error}
              status={status}
              toolbar={statusPicker}
              pagination={pagination}
            />
          )}
        </TabsContent>
        <TabsContent value="questions" className="pt-2">
          {kind === "questions" && (
            <QuestionsTable
              rows={data?.kind === "questions" ? data.items : undefined}
              loading={queue.isFetching}
              error={queue.error}
              status={status}
              toolbar={statusPicker}
              pagination={pagination}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function StatusPicker({ value, onChange }: { value: ModerationStatus; onChange: (s: ModerationStatus) => void }) {
  return (
    <Select
      items={MODERATION_STATUSES.map((s) => ({ value: s, label: MODERATION_STATUS_LABELS[s] }))}
      value={value}
      onValueChange={(v) => v && onChange(v as ModerationStatus)}
    >
      <SelectTrigger aria-label="Status" className="h-8 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODERATION_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {MODERATION_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type TableProps<T> = {
  rows: T[] | undefined;
  loading: boolean;
  error: unknown;
  status: ModerationStatus;
  toolbar: ReactNode;
  pagination: { page: number; hasNext: boolean; hasPrevious: boolean; onNext: () => void; onPrevious: () => void };
};

const emptyMessage = (kind: ModerationKind, status: ModerationStatus) =>
  status === "PENDING"
    ? `No ${kind} are waiting for moderation.`
    : `No ${MODERATION_STATUS_LABELS[status].toLowerCase()} ${kind}.`;

// Runs one decision over the selected rows that it would change, then says how it went.
function bulkActions<T extends { id: string; status: ModerationStatus }>(
  decide: (id: string, decision: Decision) => Promise<unknown>,
): BulkAction<T>[] {
  return (["APPROVED", "REJECTED"] as const).map((decision) => ({
    label: `${DECISION_LABELS[decision]} selected`,
    destructive: decision === "REJECTED",
    run: async (rows: T[]) => {
      const targets = changedBy(rows, decision);
      if (!targets.length) {
        toast.info(`Everything selected is already ${MODERATION_STATUS_LABELS[decision].toLowerCase()}.`);
        return;
      }
      const results = await Promise.allSettled(targets.map((r) => decide(r.id, decision)));
      const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failed) toast.warning(`${bulkSummary(decision, results)}. ${errorMessage(failed.reason)}`);
      else notifySaved(bulkSummary(decision, results));
    },
  }));
}

function DecisionButtons({
  status,
  label,
  onDecide,
}: {
  status: ModerationStatus;
  label: string;
  onDecide: (d: Decision) => Promise<unknown>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className="flex justify-end gap-1.5">
      {decisionsFor(status).map((d) => (
        <Button
          key={d}
          size="xs"
          variant={d === "REJECTED" ? "outline" : "secondary"}
          disabled={pending}
          aria-label={`${DECISION_LABELS[d]} ${label}`}
          onClick={async () => {
            setPending(true);
            try {
              await onDecide(d);
            } finally {
              setPending(false);
            }
          }}
        >
          {d === "APPROVED" ? <CheckIcon /> : <XIcon />}
          {DECISION_LABELS[d]}
        </Button>
      ))}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={starLabel(rating)} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          aria-hidden
          className={cn("size-3.5", n <= rating ? "fill-amber-500 text-amber-600" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

const productLink = (productId: string, title: string) => (
  <Link href={`/admin/products/${productId}`} className="text-xs underline-offset-4 hover:underline">
    {title}
  </Link>
);

// ── Reviews ──────────────────────────────────────────────────────────────────

function ReviewsTable({ rows, loading, error, status, toolbar, pagination }: TableProps<ReviewRow>) {
  const [moderate] = usePatchV1AdminModerationReviewsIdMutation();
  const decide = (id: string, decision: Decision) => moderate({ id, body: { status: decision } }).unwrap();

  const columns: ColumnDef<ReviewRow>[] = [
    {
      header: "Rating",
      cell: ({ row: { original: r } }) => <Stars rating={r.rating} />,
    },
    {
      header: "Review",
      cell: ({ row: { original: r } }) => (
        <div className="max-w-md min-w-56 space-y-0.5 whitespace-normal">
          {r.title && <p className="text-sm font-medium">{r.title}</p>}
          <p className="line-clamp-2 text-xs text-muted-foreground">{r.body}</p>
          <p className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {r.mediaUrls.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ImageIcon aria-hidden className="size-3" /> {r.mediaUrls.length} photo
                {r.mediaUrls.length === 1 ? "" : "s"}
              </span>
            )}
            {r.reply && <span>Replied</span>}
          </p>
        </div>
      ),
    },
    { header: "Product", cell: ({ row: { original: r } }) => productLink(r.productId, r.product.title) },
    {
      header: "Author",
      cell: ({ row: { original: r } }) => {
        const author = reviewAuthor(r.customer);
        return (
          <div className="space-y-0.5 text-xs">
            <Link href={`/admin/customers/${r.customerId}`} className="underline-offset-4 hover:underline">
              {author.name}
            </Link>
            {author.email && author.email !== author.name && <p className="text-muted-foreground">{author.email}</p>}
            {r.verifiedBuyer && (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheckIcon aria-hidden /> Verified buyer
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: "Submitted",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: r } }) => (
        <Badge variant={moderationStatusVariant(r.status)}>{MODERATION_STATUS_LABELS[r.status]}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: r } }) => (
        <DecisionButtons
          status={r.status}
          label={`review by ${reviewAuthor(r.customer).name}`}
          onDecide={(d) =>
            decide(r.id, d).then(
              () => notifySaved(d === "APPROVED" ? "Review approved" : "Review rejected"),
              notifyError,
            )
          }
        />
      ),
    },
  ];

  return (
    <DataTable
      tableKey="moderation-reviews"
      columns={columns}
      data={rows}
      loading={loading}
      error={error}
      getRowId={(r) => r.id}
      toolbar={toolbar}
      bulkActions={bulkActions<ReviewRow>(decide)}
      renderExpanded={(r) => <ReviewDetail review={r} />}
      emptyMessage={emptyMessage("reviews", status)}
      pagination={pagination}
    />
  );
}

function ReviewDetail({ review }: { review: ReviewRow }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {review.title && <h3 className="text-sm font-medium">{review.title}</h3>}
        <p className="text-sm whitespace-pre-wrap">{review.body}</p>
        {review.mediaUrls.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Photos">
            {review.mediaUrls.map((url, i) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-md border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host */}
                  <img src={url} alt={`Photo ${i + 1} (opens in a new tab)`} className="size-20 object-cover" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          {review.helpfulCount} found this helpful · updated {formatDateTime(review.updatedAt)}
        </p>
      </div>
      <ReplyForm key={`${review.id}:${review.repliedAt ?? ""}`} review={review} />
    </div>
  );
}

function ReplyForm({ review }: { review: ReviewRow }) {
  const [moderate, state] = usePatchV1AdminModerationReviewsIdMutation();
  const [text, setText] = useState(review.reply ?? "");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `reply-${review.id}`;
  const dirty = text.trim() !== (review.reply ?? "");

  function save(reply: string | null) {
    moderate({ id: review.id, body: { reply } })
      .unwrap()
      .then(() => notifySaved(reply ? "Reply saved" : "Reply removed"), notifyError);
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = replyPayload(text);
        if ("error" in payload) return setError(payload.error);
        setError(null);
        save(payload.reply);
      }}
    >
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={fieldId}>Merchant reply</FieldLabel>
        <Textarea
          id={fieldId}
          rows={4}
          maxLength={REPLY_MAX}
          value={text}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setText(e.target.value)}
          placeholder="Thank the reviewer or answer their concern"
        />
        <FieldDescription>
          Shown publicly under the review once it&apos;s approved.
          {review.repliedAt ? ` Last replied ${formatDateTime(review.repliedAt)}.` : ""}
        </FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>
      <div className="flex justify-end gap-2">
        {review.reply && (
          <Button type="button" size="sm" variant="ghost" disabled={state.isLoading} onClick={() => save(null)}>
            Remove reply
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!dirty || state.isLoading}>
          {review.reply ? "Update reply" : "Post reply"}
        </Button>
      </div>
    </form>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function QuestionsTable({ rows, loading, error, status, toolbar, pagination }: TableProps<QuestionRow>) {
  const [moderate] = usePatchV1AdminModerationQuestionsIdMutation();
  const decide = (id: string, decision: Decision) => moderate({ id, body: { status: decision } }).unwrap();

  const columns: ColumnDef<QuestionRow>[] = [
    {
      header: "Question",
      cell: ({ row: { original: q } }) => (
        <p className="line-clamp-2 max-w-md min-w-56 text-sm whitespace-normal">{q.body}</p>
      ),
    },
    { header: "Product", cell: ({ row: { original: q } }) => productLink(q.productId, q.product.title) },
    {
      header: "Answers",
      cell: ({ row: { original: q } }) => (
        <span className={cn("text-xs", q.answers.length === 0 && "text-muted-foreground")}>
          {q.answers.length || "None yet"}
        </span>
      ),
    },
    {
      header: "Asked",
      cell: ({ row: { original: q } }) => (
        <span className="text-xs whitespace-nowrap">{formatDateTime(q.createdAt)}</span>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: q } }) => (
        <Badge variant={moderationStatusVariant(q.status)}>{MODERATION_STATUS_LABELS[q.status]}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: q } }) => (
        <DecisionButtons
          status={q.status}
          label={`question about ${q.product.title}`}
          onDecide={(d) =>
            decide(q.id, d).then(
              () => notifySaved(d === "APPROVED" ? "Question approved" : "Question rejected"),
              notifyError,
            )
          }
        />
      ),
    },
  ];

  return (
    <DataTable
      tableKey="moderation-questions"
      columns={columns}
      data={rows}
      loading={loading}
      error={error}
      getRowId={(q) => q.id}
      toolbar={toolbar}
      bulkActions={bulkActions<QuestionRow>(decide)}
      renderExpanded={(q) => <QuestionDetail question={q} />}
      emptyMessage={emptyMessage("questions", status)}
      pagination={pagination}
    />
  );
}

function QuestionDetail({ question }: { question: QuestionRow }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-sm whitespace-pre-wrap">{question.body}</p>
        <div className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Answers</h3>
          {question.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers yet.</p>
          ) : (
            <ul className="space-y-2">
              {question.answers.map((a) => (
                <li key={a.id} className="border-l-2 pl-3">
                  <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <AnswerForm key={`${question.id}:${question.answers.length}`} question={question} />
    </div>
  );
}

function AnswerForm({ question }: { question: QuestionRow }) {
  const [moderate, state] = usePatchV1AdminModerationQuestionsIdMutation();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `answer-${question.id}`;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = answerPayload(text);
        if ("error" in payload) return setError(payload.error);
        setError(null);
        moderate({ id: question.id, body: payload })
          .unwrap()
          .then(() => notifySaved("Answer posted"), notifyError);
      }}
    >
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={fieldId}>Your answer</FieldLabel>
        <Textarea
          id={fieldId}
          rows={4}
          maxLength={ANSWER_MAX}
          value={text}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setText(e.target.value)}
        />
        <FieldDescription>
          {question.status === "PENDING"
            ? "Answering a pending question approves it, so it appears on the product page."
            : "Added below any existing answers."}
        </FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!text.trim() || state.isLoading}>
          Post answer
        </Button>
      </div>
    </form>
  );
}

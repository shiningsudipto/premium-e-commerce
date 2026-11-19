"use client";

import { useState } from "react";
import { CheckCircle2Icon, CircleSlashIcon, FlaskConicalIcon, XCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "../../store/api-errors";
import {
  usePostV1AdminWorkflowsTestMutation,
  type PostV1AdminWorkflowsTestApiResponse,
} from "../../store/api.generated";
import {
  actionPayload,
  buildTestData,
  conditionsPayload,
  planActions,
  validateCondition,
  type RuleForm,
  type TestDataInput,
} from "./workflow-rules";

// Dry run of the rule as currently edited (saved or not): the API loads the facts for the sample
// event and checks the conditions. Nothing is executed; the action plan is worked out here.
export function RuleTestPanel({ form }: { form: RuleForm }) {
  const [input, setInput] = useState<TestDataInput>({ orderId: "", customerId: "", affiliateId: "", extra: "" });
  const [dataError, setDataError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: TestDataInput; response: PostV1AdminWorkflowsTestApiResponse } | null>(
    null,
  );
  const [runTest, test] = usePostV1AdminWorkflowsTestMutation();
  const conditionsReady = form.conditions.every((c) => !validateCondition(c));
  const ready = !!form.trigger && conditionsReady;

  const field = (key: keyof Omit<TestDataInput, "extra">, label: string, placeholder: string) => (
    <Field>
      <FieldLabel htmlFor={`test-${key}`}>{label}</FieldLabel>
      <Input
        id={`test-${key}`}
        className="font-mono text-xs"
        placeholder={placeholder}
        value={input[key]}
        onChange={(e) => setInput({ ...input, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        aria-label="Test the rule"
        onSubmit={(e) => {
          e.preventDefault();
          const built = buildTestData(input);
          if ("error" in built) {
            setDataError(built.error);
            return;
          }
          setDataError(null);
          const sent = input;
          runTest({ body: { trigger: form.trigger, conditions: conditionsPayload(form), data: built.data } })
            .unwrap()
            .then(
              (response) => setResult({ sent, response }),
              () => setResult(null),
            );
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {field("orderId", "Order ID", "Loads the order (and its customer)")}
          {field("customerId", "Customer ID", "Optional")}
          {field("affiliateId", "Affiliate ID", "Optional")}
        </div>
        <Field>
          <FieldLabel htmlFor="test-extra">Other event data (JSON)</FieldLabel>
          <Textarea
            id="test-extra"
            rows={3}
            className="font-mono text-xs"
            placeholder='{ "segmentId": "…" }'
            value={input.extra}
            aria-invalid={dataError ? true : undefined}
            onChange={(e) => setInput({ ...input, extra: e.target.value })}
          />
          <FieldDescription>Readable in conditions as event.&lt;field&gt;.</FieldDescription>
          {dataError && <FieldError>{dataError}</FieldError>}
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" variant="secondary" disabled={!ready || test.isLoading}>
            <FlaskConicalIcon /> Run test
          </Button>
          {!ready && (
            <span className="text-xs text-muted-foreground">
              {form.trigger ? "Fix the conditions first." : "Choose a trigger first."}
            </span>
          )}
        </div>
      </form>

      {test.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(test.error)}</AlertDescription>
        </Alert>
      ) : null}

      <div aria-live="polite">{result && !test.error && <TestResult form={form} {...result} />}</div>
    </div>
  );
}

function TestResult({
  form,
  sent,
  response,
}: {
  form: RuleForm;
  sent: TestDataInput;
  response: PostV1AdminWorkflowsTestApiResponse;
}) {
  const facts = response.facts;
  const missing = (
    [
      ["orderId", "order"],
      ["customerId", "customer"],
      ["affiliateId", "affiliate"],
    ] as const
  ).filter(([key, fact]) => sent[key].trim() && !facts[fact]);
  const plan = planActions(form.actions.map(actionPayload), facts);

  return (
    <div className="space-y-3 rounded-md border bg-background p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        {response.matched ? (
          <>
            <Badge variant="secondary">Matches</Badge> These actions would run, in order:
          </>
        ) : (
          <>
            <Badge variant="outline">Doesn&apos;t match</Badge> Nothing would happen for this event.
          </>
        )}
      </p>
      {missing.map(([, fact]) => (
        <p key={fact} className="text-xs text-destructive">
          No {fact} was found for that ID.
        </p>
      ))}
      {response.matched && (
        <ol className="space-y-1 text-sm">
          {plan.map((p, i) => (
            <li key={i} className="flex items-start gap-2">
              {p.outcome === "run" ? (
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              )}
              <span>
                {p.label}
                {p.outcome === "fail" && <span className="text-destructive"> — would fail: {p.reason}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {!response.matched && form.conditions.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CircleSlashIcon className="size-3.5" aria-hidden /> Compare the conditions with the facts below.
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-xs font-medium">Facts the conditions saw</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(facts, null, 2)}</pre>
      </details>
    </div>
  );
}

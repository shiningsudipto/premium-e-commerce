"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { errorCode, errorMessage, fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminPromotionsIdQuery,
  usePatchV1AdminPromotionsIdMutation,
  usePostV1AdminPromotionsIdStatusMutation,
  usePostV1AdminPromotionsMutation,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { Section } from "../products/section";
import { ActionBuilder } from "./action-builder";
import { ConditionBuilder } from "./condition-builder";
import {
  blankForm,
  EFFECTIVE_STATUS_LABELS,
  effectiveStatusVariant,
  formFromPromotion,
  hasErrors,
  parseCodes,
  statusTransitions,
  toCreateBody,
  toUpdateBody,
  transitionCopy,
  TYPE_LABELS,
  validateForm,
  type FormErrors,
  type Promotion,
  type PromotionForm,
  type PromotionType,
} from "./promotion-form";
import { PromotionCodes } from "./promotion-codes";
import { PromotionPerformance } from "./promotion-performance";
import { SimulatorPanel } from "./promotion-simulator";
import { RuleOptionsProvider, useRuleOptions } from "./rule-inputs";

function BackLink() {
  return (
    <Link
      href="/admin/promotions"
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
    >
      <ArrowLeftIcon className="size-3.5" aria-hidden /> Promotions
    </Link>
  );
}

export function NewPromotionScreen() {
  return (
    <RuleOptionsProvider>
      <BackLink />
      <PageHeader
        title="New promotion"
        description="It's saved as a draft. Test it in the simulator, then activate it."
      />
      <PromotionFormView promotion={null} />
    </RuleOptionsProvider>
  );
}

// Promotion builder (spec §8.2–8.3): rules, limits, codes, simulator and performance.
export function PromotionEditScreen({ id }: { id: string }) {
  return (
    <RuleOptionsProvider>
      <EditScreen id={id} />
    </RuleOptionsProvider>
  );
}

function EditScreen({ id }: { id: string }) {
  const promotion = useGetV1AdminPromotionsIdQuery({ id });
  const canWrite = useCan("promotions.write");
  const canReport = useCan("analytics.read");
  const { currency } = useRuleOptions();
  if (promotion.error) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(promotion.error)}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!promotion.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const p = promotion.data;
  return (
    <>
      <BackLink />
      <PageHeader
        title={p.name}
        description={p.description ?? `Updated ${formatDateTime(p.updatedAt)}`}
        actions={canWrite && <StatusActions promotion={p} />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={effectiveStatusVariant(p.effectiveStatus)}>{EFFECTIVE_STATUS_LABELS[p.effectiveStatus]}</Badge>
        <Badge variant="outline">{TYPE_LABELS[p.type]}</Badge>
        <span className="text-muted-foreground">
          Used {p.usageCount}
          {p.usageLimit !== null ? ` of ${p.usageLimit}` : ""} time{p.usageCount === 1 ? "" : "s"}
          {p.type === "CODE" && ` · ${p._count.codes} code${p._count.codes === 1 ? "" : "s"}`}
          {p.startsAt && ` · starts ${formatDateTime(p.startsAt)}`}
          {p.endsAt && ` · ends ${formatDateTime(p.endsAt)}`}
        </span>
      </div>
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          {p.type === "CODE" && <TabsTrigger value="codes">Codes</TabsTrigger>}
          <TabsTrigger value="simulate">Simulate</TabsTrigger>
          {canReport && <TabsTrigger value="performance">Performance</TabsTrigger>}
        </TabsList>
        {/* unsaved edits survive a look at the simulator */}
        <TabsContent value="rules" keepMounted className="pt-4">
          {/* a new version (after any save) resets the form to what the API stored */}
          <PromotionFormView key={p.version} promotion={p} readOnly={!canWrite} onConflict={promotion.refetch} />
        </TabsContent>
        {p.type === "CODE" && (
          <TabsContent value="codes" className="pt-4">
            <PromotionCodes promotion={p} canWrite={canWrite} />
          </TabsContent>
        )}
        <TabsContent value="simulate" keepMounted className="pt-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Runs the saved version of this promotion. Save your changes first to test them.
          </p>
          <SimulatorPanel promotion={p} />
        </TabsContent>
        {canReport && (
          <TabsContent value="performance" className="pt-4">
            <PromotionPerformance promotionId={p.id} currency={currency} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

function StatusActions({ promotion: p }: { promotion: Promotion }) {
  const [setStatus] = usePostV1AdminPromotionsIdStatusMutation();
  const [create, createState] = usePostV1AdminPromotionsMutation();
  const router = useRouter();
  const { currency } = useRuleOptions();
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={createState.isLoading}
        onClick={() =>
          create({
            body: {
              ...toCreateBody(formFromPromotion(p, currency), currency),
              name: `Copy of ${p.name}`.slice(0, 200),
            },
          })
            .unwrap()
            .then((copy) => {
              notifySaved(`${copy.name} created as a draft`);
              router.push(`/admin/promotions/${copy.id}`);
            }, notifyError)
        }
      >
        <CopyIcon /> Duplicate
      </Button>
      {statusTransitions(p.status).map((to) => {
        const copy = transitionCopy(to, p);
        return (
          <ConfirmDialog
            key={to}
            trigger={
              <Button size="sm" variant={to === "ACTIVE" ? "default" : to === "ARCHIVED" ? "ghost" : "outline"}>
                {copy.label}
              </Button>
            }
            title={copy.title}
            description={copy.description}
            confirmLabel={copy.confirm}
            destructive={copy.destructive}
            onConfirm={() =>
              setStatus({ id: p.id, body: { status: to } })
                .unwrap()
                .then(
                  (r) => notifySaved(`${r.name} is now ${EFFECTIVE_STATUS_LABELS[r.effectiveStatus].toLowerCase()}`),
                  notifyError,
                )
            }
          />
        );
      })}
    </>
  );
}

const NO_ERRORS: FormErrors = { fields: {}, conditions: {}, actions: {} };

function PromotionFormView({
  promotion,
  readOnly = false,
  onConflict,
}: {
  promotion: Promotion | null;
  readOnly?: boolean;
  onConflict?: () => void;
}) {
  const options = useRuleOptions();
  if (!options.ready) return <Skeleton className="h-96 w-full" />;
  return <FormBody promotion={promotion} readOnly={readOnly} onConflict={onConflict} currency={options.currency} />;
}

function FormBody({
  promotion,
  readOnly,
  onConflict,
  currency,
}: {
  promotion: Promotion | null;
  readOnly: boolean;
  onConflict?: () => void;
  currency: string;
}) {
  const router = useRouter();
  const [initial] = useState<PromotionForm>(() => (promotion ? formFromPromotion(promotion, currency) : blankForm()));
  const [form, setForm] = useState<PromotionForm>(initial);
  const [codesText, setCodesText] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({});
  const [createPromotion, createState] = usePostV1AdminPromotionsMutation();
  const [updatePromotion, updateState] = usePatchV1AdminPromotionsIdMutation();

  const errors = validateForm(form, currency);
  const shown = showErrors ? errors : NO_ERRORS;
  const codes = parseCodes(codesText);
  const codeError = codes.invalid.length ? `Invalid codes: ${codes.invalid.slice(0, 5).join(", ")}` : null;
  const dirty = JSON.stringify(toCreateBody(form, currency)) !== JSON.stringify(toCreateBody(initial, currency));
  const set = <K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) => setForm({ ...form, [key]: value });
  const fieldError = (key: string) => shown.fields[key] ?? apiErrors[key]?.[0];
  const id = (name: string) => `promo-${name}-${promotion?.id ?? "new"}`;

  function submit() {
    setShowErrors(true);
    if (hasErrors(errors) || (!promotion && codeError)) {
      toast.error("Check the highlighted fields");
      return;
    }
    const onError = (error: unknown) => {
      setApiErrors(fieldErrors(error));
      notifyError(error);
      if (errorCode(error) === "VERSION_CONFLICT") onConflict?.();
    };
    if (promotion) {
      updatePromotion({ id: promotion.id, body: toUpdateBody(form, currency, promotion.version) })
        .unwrap()
        .then((p) => notifySaved(`${p.name} saved`), onError);
    } else {
      const body = toCreateBody(form, currency);
      createPromotion({
        body: { ...body, ...(form.type === "CODE" && codes.codes.length ? { codes: codes.codes } : {}) },
      })
        .unwrap()
        .then((p) => {
          notifySaved(`${p.name} created as a draft`);
          router.push(`/admin/promotions/${p.id}`);
        }, onError);
    }
  }

  const textField = (
    key: "name" | "exclusivityGroup" | "priority" | "usageLimit" | "perCustomerLimit" | "maxDiscount",
    label: string,
    props: { description?: string; placeholder?: string; inputMode?: "numeric" | "decimal"; maxLength?: number } = {},
  ) => (
    <Field data-invalid={fieldError(key) ? true : undefined}>
      <FieldLabel htmlFor={id(key)}>{label}</FieldLabel>
      <Input
        id={id(key)}
        value={form[key]}
        disabled={readOnly}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        aria-invalid={fieldError(key) ? true : undefined}
        onChange={(e) => set(key, e.target.value)}
      />
      {props.description && <FieldDescription>{props.description}</FieldDescription>}
      <FieldError>{fieldError(key)}</FieldError>
    </Field>
  );

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Section title="Details">
        <div className="grid gap-4 md:grid-cols-2">
          {textField("name", "Name", { maxLength: 200, description: "Shown to shoppers on the cart and order." })}
          <Field>
            <FieldLabel htmlFor={id("type")}>Type</FieldLabel>
            <Select
              value={form.type}
              disabled={readOnly || !!promotion}
              onValueChange={(v) => set("type", v as PromotionType)}
            >
              <SelectTrigger id={id("type")} className="w-full">
                <SelectValue>
                  {form.type === "AUTOMATIC" ? "Automatic: applies by itself" : "Code: shoppers enter a code"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTOMATIC">Automatic: applies by itself</SelectItem>
                <SelectItem value="CODE">Code: shoppers enter a code</SelectItem>
              </SelectContent>
            </Select>
            {promotion && <FieldDescription>A promotion’s type can’t change.</FieldDescription>}
          </Field>
          <Field className="md:col-span-2" data-invalid={fieldError("description") ? true : undefined}>
            <FieldLabel htmlFor={id("description")}>Description (internal)</FieldLabel>
            <Textarea
              id={id("description")}
              rows={2}
              maxLength={1000}
              value={form.description}
              disabled={readOnly}
              onChange={(e) => set("description", e.target.value)}
            />
            <FieldError>{fieldError("description")}</FieldError>
          </Field>
          {!promotion && form.type === "CODE" && (
            <Field className="md:col-span-2" data-invalid={showErrors && codeError ? true : undefined}>
              <FieldLabel htmlFor={id("codes")}>Codes (optional)</FieldLabel>
              <Textarea
                id={id("codes")}
                rows={2}
                className="font-mono"
                placeholder="SUMMER10"
                value={codesText}
                onChange={(e) => setCodesText(e.target.value)}
              />
              <FieldDescription>
                One per line or comma-separated. You can generate codes in bulk after creating it.
              </FieldDescription>
              {showErrors && codeError && <FieldError>{codeError}</FieldError>}
            </Field>
          )}
        </div>
      </Section>

      <Section
        title="Stacking"
        description="Automatic promotions run before code promotions (unless the store evaluates purely by priority); within each, higher priority runs first."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {textField("priority", "Priority", { inputMode: "numeric", description: "Higher runs first. Default 0." })}
          {textField("exclusivityGroup", "Exclusivity group", {
            maxLength: 50,
            placeholder: "e.g. seasonal",
            description: "At most one promotion per group applies. Leave empty to combine freely.",
          })}
          <Field orientation="horizontal">
            <Switch
              id={id("stop")}
              checked={form.stopFurther}
              disabled={readOnly}
              onCheckedChange={(on) => set("stopFurther", on)}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor={id("stop")}>Stop further promotions</FieldLabel>
              <FieldDescription>When this applies, nothing after it does.</FieldDescription>
            </div>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id={id("sale")}
              checked={form.combinesWithSalePrices}
              disabled={readOnly}
              onCheckedChange={(on) => set("combinesWithSalePrices", on)}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor={id("sale")}>Combines with sale prices</FieldLabel>
              <FieldDescription>When off, items with a compare-at price get no item discount.</FieldDescription>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Schedule and limits">
        <div className="grid gap-4 md:grid-cols-3">
          {(["startsAt", "endsAt"] as const).map((key) => (
            <Field key={key} data-invalid={fieldError(key) ? true : undefined}>
              <FieldLabel htmlFor={id(key)}>{key === "startsAt" ? "Starts" : "Ends"}</FieldLabel>
              <Input
                id={id(key)}
                type="datetime-local"
                value={form[key]}
                disabled={readOnly}
                aria-invalid={fieldError(key) ? true : undefined}
                onChange={(e) => set(key, e.target.value)}
              />
              <FieldDescription>
                {key === "startsAt" ? "Empty: as soon as it's active." : "Empty: no end."}
              </FieldDescription>
              <FieldError>{fieldError(key)}</FieldError>
            </Field>
          ))}
          <div className="hidden md:block" />
          {textField("usageLimit", "Total uses", { inputMode: "numeric", placeholder: "Unlimited" })}
          {textField("perCustomerLimit", "Uses per customer", {
            inputMode: "numeric",
            placeholder: "Unlimited",
            description: "Counted by account or email.",
          })}
          {textField("maxDiscount", `Maximum discount per order (${currency})`, {
            inputMode: "decimal",
            placeholder: "No cap",
          })}
        </div>
      </Section>

      <Section title="Conditions" description="When the promotion applies. Leave empty for every cart.">
        <ConditionBuilder
          root={form.conditions}
          onChange={(conditions) => set("conditions", conditions)}
          errors={shown.conditions}
          readOnly={readOnly}
        />
      </Section>

      <Section
        title="Actions"
        description={`What it does. Amounts are in ${currency}; actions run in order and each sees what the previous one left.`}
      >
        <ActionBuilder
          actions={form.actions}
          onChange={(actions) => set("actions", actions)}
          errors={shown.actions}
          readOnly={readOnly}
        />
      </Section>

      {apiErrors._form && <p className="text-sm text-destructive">{apiErrors._form[0]}</p>}
      {Object.keys(apiErrors).some((k) => k === "conditions" || k === "actions") && (
        <p className="text-sm text-destructive">
          The API refused the rules: {(apiErrors.conditions ?? apiErrors.actions)?.[0]}
        </p>
      )}

      {!readOnly && (
        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
          {promotion && dirty && <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>}
          {promotion && dirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setForm(initial);
                setShowErrors(false);
                setApiErrors({});
              }}
            >
              Discard
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={createState.isLoading || updateState.isLoading || (!!promotion && !dirty)}
          >
            {promotion ? "Save promotion" : "Create draft"}
          </Button>
        </div>
      )}
    </form>
  );
}

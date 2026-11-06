"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { EyeIcon, PlusIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminNotificationTemplatesQuery,
  usePostV1AdminNotificationTemplatesMutation,
  usePostV1AdminNotificationTemplatesPreviewMutation,
  usePostV1AdminNotificationTemplatesTestSendMutation,
  usePutV1AdminNotificationTemplatesIdMutation,
  type GetV1AdminNotificationTemplatesApiResponse,
  type PostV1AdminNotificationTemplatesPreviewApiResponse,
} from "../../store/api.generated";
import { useCan, useMe } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";

type Template = GetV1AdminNotificationTemplatesApiResponse[number];

const KEY_PATTERN = /^[a-z_]+\.[a-z_.]+$/;

// Notification templates (spec §5.10): one per event key and locale. Template managers hold
// notifications.templates.write; content editors (notifications.copy.write) may only reword.
export function NotificationsScreen() {
  const templates = useGetV1AdminNotificationTemplatesQuery({});
  const canManage = useCan("notifications.templates.write");

  const columns: ColumnDef<Template>[] = [
    {
      header: "Template",
      cell: ({ row: { original: t } }) => (
        <div className="max-w-md space-y-0.5 whitespace-normal">
          <p className="font-mono text-xs font-medium">{t.key}</p>
          <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
        </div>
      ),
    },
    {
      header: "Channel",
      cell: ({ row: { original: t } }) => <Badge variant="outline">{t.channel === "EMAIL" ? "Email" : "SMS"}</Badge>,
    },
    { header: "Locale", cell: ({ row: { original: t } }) => <span className="font-mono text-xs">{t.locale}</span> },
    {
      header: "Status",
      cell: ({ row: { original: t } }) =>
        t.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Off</Badge>,
    },
    {
      header: "Updated",
      cell: ({ row: { original: t } }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(t.updatedAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Emails and messages sent on order, account and affiliate events. Templates use {{variables}}; an inactive template sends nothing."
        actions={canManage && <NewTemplateDialog />}
      />
      <DataTable
        tableKey="notification-templates"
        columns={columns}
        data={templates.data}
        loading={templates.isLoading}
        error={templates.error}
        getRowId={(t) => t.id}
        // remounting on a new version resets the draft to what was saved
        renderExpanded={(t) => <TemplateEditor key={`${t.id}:${t.version}`} template={t} canManage={canManage} />}
        emptyMessage="No templates yet."
      />
    </>
  );
}

function TemplateEditor({ template, canManage }: { template: Template; canManage: boolean }) {
  const me = useMe();
  const [draft, setDraft] = useState({
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    bodyText: template.bodyText,
    isActive: template.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [preview, setPreview] = useState<PostV1AdminNotificationTemplatesPreviewApiResponse | null>(null);
  const [saveTemplate, save] = usePutV1AdminNotificationTemplatesIdMutation();
  const [renderPreview, previewing] = usePostV1AdminNotificationTemplatesPreviewMutation();
  const [testSend, sending] = usePostV1AdminNotificationTemplatesTestSendMutation();
  const [to, setTo] = useState("");
  const dirty =
    draft.subject !== template.subject ||
    draft.bodyHtml !== template.bodyHtml ||
    draft.bodyText !== template.bodyText ||
    draft.isActive !== template.isActive;
  const id = (name: string) => `${template.id}-${name}`;
  // the API renders the active email template for a key and locale (falling back to the
  // language, then "en"), so inactive and SMS templates can't be previewed or test-sent
  const previewable = template.isActive && template.channel === "EMAIL";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveTemplate({
            id: template.id,
            body: {
              subject: draft.subject,
              bodyHtml: draft.bodyHtml,
              bodyText: draft.bodyText,
              version: template.version,
              // copy editors may not (de)activate; the API refuses isActive from them
              ...(canManage ? { isActive: draft.isActive } : {}),
            },
          })
            .unwrap()
            .then(
              () => {
                setErrors({});
                notifySaved(`${template.key} (${template.locale}) saved`);
              },
              (error) => {
                setErrors(fieldErrors(error));
                notifyError(error);
              },
            );
        }}
      >
        <FieldGroup>
          <Field data-invalid={errors.subject ? true : undefined}>
            <FieldLabel htmlFor={id("subject")}>Subject</FieldLabel>
            <Input
              id={id("subject")}
              value={draft.subject}
              maxLength={300}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
            <FieldError>{errors.subject?.[0]}</FieldError>
          </Field>
          <Field data-invalid={errors.bodyHtml ? true : undefined}>
            <FieldLabel htmlFor={id("html")}>HTML body</FieldLabel>
            <Textarea
              id={id("html")}
              value={draft.bodyHtml}
              rows={10}
              className="font-mono text-xs"
              onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })}
            />
            <FieldError>{errors.bodyHtml?.[0]}</FieldError>
          </Field>
          <Field data-invalid={errors.bodyText ? true : undefined}>
            <FieldLabel htmlFor={id("text")}>Plain-text body</FieldLabel>
            <Textarea
              id={id("text")}
              value={draft.bodyText}
              rows={6}
              className="font-mono text-xs"
              onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
            />
            <FieldDescription>Sent alongside the HTML for mail clients that don&apos;t show it.</FieldDescription>
            <FieldError>{errors.bodyText?.[0]}</FieldError>
          </Field>
          {canManage && (
            <Field orientation="horizontal">
              <Switch
                id={id("active")}
                checked={draft.isActive}
                onCheckedChange={(isActive) => setDraft({ ...draft, isActive })}
              />
              <div>
                <FieldLabel htmlFor={id("active")}>Active</FieldLabel>
                <FieldDescription>Off means this event sends nothing in this locale.</FieldDescription>
              </div>
            </Field>
          )}
          {errors._form && <FieldError>{errors._form[0]}</FieldError>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!dirty || save.isLoading}>
              {save.isLoading ? "Saving…" : "Save template"}
            </Button>
          </div>
        </FieldGroup>
      </form>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!previewable || previewing.isLoading}
            onClick={() =>
              renderPreview({ body: { key: template.key, locale: template.locale } })
                .unwrap()
                .then(setPreview, notifyError)
            }
          >
            <EyeIcon /> Preview
          </Button>
          <span className="text-xs text-muted-foreground">
            {previewable
              ? `Preview shows the saved version with sample data${dirty ? ". Save first to see your changes." : "."}`
              : template.channel === "SMS"
                ? "SMS templates can't be previewed yet."
                : "Activate the template to preview or test it."}
          </span>
        </div>
        {preview && (
          <div className="space-y-3 rounded-lg border bg-background p-4">
            <p className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{preview.subject}</span>
            </p>
            {/* sandboxed with no permissions: template HTML can't run scripts or reach the admin */}
            <iframe
              title={`Preview of ${template.key}`}
              sandbox=""
              srcDoc={preview.html}
              className="h-80 w-full rounded-md border bg-white"
            />
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {preview.text}
            </pre>
          </div>
        )}

        {canManage && previewable && (
          <form
            className="flex flex-wrap items-end gap-2 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              testSend({ body: { key: template.key, locale: template.locale, to: to.trim() } })
                .unwrap()
                .then((result) => {
                  if ("sent" in result) notifySaved(`Test sent to ${to.trim()}`);
                  else toast.warning(`Not sent: ${result.skipped}`);
                }, notifyError);
            }}
          >
            <Field className="w-auto grow">
              <FieldLabel htmlFor={id("to")}>Send a test to</FieldLabel>
              <Input
                id={id("to")}
                type="email"
                required
                value={to}
                placeholder={me.data?.email ?? "you@example.com"}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
            <Button type="submit" size="sm" variant="secondary" disabled={sending.isLoading}>
              <SendIcon /> Send test
            </Button>
          </form>
        )}
        {!canManage && (
          <Alert>
            <AlertDescription>
              You can change the wording. Activating templates and test sends need a template manager.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

function NewTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createTemplate, create] = usePostV1AdminNotificationTemplatesMutation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setErrors({});
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon /> New template
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const key = String(form.get("key")).trim();
            if (!KEY_PATTERN.test(key)) {
              setErrors({ key: ["An event key like order.paid (lowercase, dots and underscores)"] });
              return;
            }
            createTemplate({
              body: {
                key,
                locale: String(form.get("locale")).trim(),
                subject: String(form.get("subject")).trim(),
                bodyHtml: String(form.get("bodyHtml")),
                bodyText: String(form.get("bodyText")),
                isActive: false,
              },
            })
              .unwrap()
              .then(
                (t) => {
                  notifySaved(`${t.key} (${t.locale}) created, off until you activate it`);
                  setOpen(false);
                },
                (error) => {
                  setErrors(fieldErrors(error));
                  notifyError(error);
                },
              );
          }}
        >
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>
              One template per event and locale. It starts off; preview it, then activate it from the list.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field data-invalid={errors.key ? true : undefined}>
                <FieldLabel htmlFor="template-key">Event key</FieldLabel>
                <Input id="template-key" name="key" required placeholder="e.g. order.shipped" className="font-mono" />
                <FieldError>{errors.key?.[0]}</FieldError>
              </Field>
              <Field data-invalid={errors.locale ? true : undefined}>
                <FieldLabel htmlFor="template-locale">Locale</FieldLabel>
                <Input
                  id="template-locale"
                  name="locale"
                  required
                  minLength={2}
                  defaultValue="en"
                  className="font-mono"
                />
                <FieldError>{errors.locale?.[0]}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="template-subject">Subject</FieldLabel>
              <Input id="template-subject" name="subject" required maxLength={300} />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-html">HTML body</FieldLabel>
              <Textarea id="template-html" name="bodyHtml" required rows={6} className="font-mono text-xs" />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-text">Plain-text body</FieldLabel>
              <Textarea id="template-text" name="bodyText" required rows={4} className="font-mono text-xs" />
            </Field>
            {errors._form && <FieldError>{errors._form[0]}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading}>
              Create template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

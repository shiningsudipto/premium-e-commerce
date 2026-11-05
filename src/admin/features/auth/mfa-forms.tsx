"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorBody } from "../../store/api-errors";
import {
  usePostV1AdminSessionMfaEnrollConfirmMutation,
  usePostV1AdminSessionMfaEnrollMutation,
  usePostV1AdminSessionMfaVerifyMutation,
} from "../../store/api.generated";
import { safeNext } from "./auth-api";

const MESSAGES: Record<string, string> = {
  MFA_INVALID_CODE: "That code didn't match. Codes change every 30 seconds; try the current one.",
  UNAUTHENTICATED: "This sign-in step expired. Sign in again.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
};

type CodeMutation =
  typeof usePostV1AdminSessionMfaVerifyMutation | typeof usePostV1AdminSessionMfaEnrollConfirmMutation;

function useCodeSubmit(useMutation: CodeMutation) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submit, { isLoading, isSuccess }] = useMutation();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setError(null);
    try {
      await submit({ body: { code } }).unwrap();
      router.replace(next);
    } catch (err) {
      const body = apiErrorBody(err);
      setExpired(body?.code === "UNAUTHENTICATED");
      setError((body && MESSAGES[body.code]) ?? body?.message ?? "Verification failed.");
    }
  }
  return { onSubmit, error, expired, pending: isLoading || isSuccess };
}

function CodeField() {
  return (
    <Field>
      <FieldLabel htmlFor="code">6-digit code</FieldLabel>
      <Input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        className="h-11 text-center font-mono text-xl tracking-[0.4em]"
      />
    </Field>
  );
}

function ErrorNotice({ error, expired }: { error: string | null; expired: boolean }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {error}{" "}
        {expired && (
          <Link href="/admin/login" className="underline">
            Back to sign-in
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function MfaVerifyForm() {
  const { onSubmit, error, expired, pending } = useCodeSubmit(usePostV1AdminSessionMfaVerifyMutation);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Two-step verification</h1>
        <p className="text-sm text-muted-foreground">Enter the code from your authenticator app.</p>
      </div>
      <ErrorNotice error={error} expired={expired} />
      <CodeField />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}

export function MfaEnrollForm() {
  const { onSubmit, error, expired, pending } = useCodeSubmit(usePostV1AdminSessionMfaEnrollConfirmMutation);
  const [enroll] = usePostV1AdminSessionMfaEnrollMutation();
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Each enroll call issues a new secret, so it must run once: Strict Mode runs effects twice in
  // development, and a second secret would make the QR code on screen stale.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    enroll({ body: {} })
      .unwrap()
      .then(setEnrollment)
      .catch((err) => {
        const body = apiErrorBody(err);
        setLoadError((body && MESSAGES[body.code]) ?? body?.message ?? "Couldn't start enrollment.");
      });
  }, [enroll]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Set up two-step verification</h1>
        <p className="text-sm text-muted-foreground">
          Your role requires it. Scan the code with an authenticator app, then enter the 6-digit code it shows.
        </p>
      </div>
      <ErrorNotice error={error ?? loadError} expired={expired || !!loadError} />
      <div className="flex items-center gap-5 rounded-lg border bg-card p-4">
        {enrollment ? (
          <QRCodeSVG value={enrollment.otpauthUrl} size={136} marginSize={1} title="Authenticator QR code" />
        ) : (
          <Skeleton className="size-[136px] shrink-0" />
        )}
        <Field className="min-w-0">
          <FieldLabel>Or enter this key</FieldLabel>
          <code className="font-mono text-xs break-all select-all" data-testid="mfa-secret">
            {enrollment?.secret ?? "…"}
          </code>
          <FieldDescription>Keep it private: anyone with it can generate your codes.</FieldDescription>
        </Field>
      </div>
      <CodeField />
      <Button type="submit" size="lg" className="w-full" disabled={pending || !enrollment}>
        {pending ? "Verifying…" : "Turn on and continue"}
      </Button>
    </form>
  );
}

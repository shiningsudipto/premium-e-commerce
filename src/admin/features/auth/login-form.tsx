"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiErrorBody } from "../../store/api-errors";
import { usePostV1AdminSessionLoginMutation } from "../../store/api.generated";
import { pathAfterSignIn, safeNext } from "./auth-api";

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "That email and password don't match an account.",
  ACCOUNT_DISABLED: "This account is disabled. Ask an Owner to re-enable it.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
};

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading: pending, isSuccess }] = usePostV1AdminSessionLoginMutation();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const { status } = await login({
        body: { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") },
      }).unwrap();
      router.replace(pathAfterSignIn(status, next));
    } catch (err) {
      const body = apiErrorBody(err);
      setError((body && MESSAGES[body.code]) ?? body?.message ?? "Sign-in failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use your staff account.</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" className="w-full" disabled={pending || isSuccess}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

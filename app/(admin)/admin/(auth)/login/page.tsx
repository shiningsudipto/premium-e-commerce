import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/src/admin/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

// In development the form can be prefilled from ADMIN_DEV_EMAIL / ADMIN_DEV_PASSWORD (.env.local)
// so local sign-in is one click. Never in a production build, whatever the environment holds.
const defaults =
  process.env.NODE_ENV === "production"
    ? {}
    : { email: process.env.ADMIN_DEV_EMAIL, password: process.env.ADMIN_DEV_PASSWORD };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm defaultEmail={defaults.email} defaultPassword={defaults.password} />
    </Suspense>
  );
}

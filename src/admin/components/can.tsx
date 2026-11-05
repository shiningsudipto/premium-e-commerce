"use client";

import type { ReactNode } from "react";
import { can } from "../lib/permissions";
import { useGetV1AdminAuthMeQuery } from "../store/api.generated";

// The signed-in staff member. Permissions drive what the UI shows.
export function useMe() {
  return useGetV1AdminAuthMeQuery({});
}

export function useCan(permission: string | readonly string[]): boolean {
  return can(useMe().data?.permissions, permission);
}

// <Can permission="flags.write">…</Can> renders its children only for staff who hold the
// permission (any of them, for a list). Hides UI only; the API enforces permissions itself.
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string | readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}

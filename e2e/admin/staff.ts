import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Temporary staff for the run, created and removed by the backend's e2e-staff script.
export type TestStaff = { id: string; email: string; password: string; totpSecret: string | null };

const backendDir = process.env.BACKEND_DIR ?? path.resolve(__dirname, "../../../premium-ec-backend");
const store = path.join(__dirname, ".staff.json");
export const OWNER_STATE = path.join(__dirname, ".auth", "owner.json");

export function runStaffScript(args: string[]): string {
  // run through a shell (npx is a script on Windows), so each argument is quoted
  const out = execFileSync("npx", ["tsx", "src/scripts/e2e-staff.ts", ...args.map((a) => JSON.stringify(a))], {
    cwd: backendDir,
    shell: true,
    encoding: "utf8",
  });
  return out.trim().split("\n").pop()!;
}

export function saveStaff(staff: Record<string, TestStaff>) {
  writeFileSync(store, JSON.stringify(staff));
}

export function loadStaff(): Record<string, TestStaff> {
  return JSON.parse(readFileSync(store, "utf8"));
}

import { runStaffScript, saveStaff, type TestStaff } from "./staff";

export default async function globalSetup() {
  const api = process.env.API_URL ?? "http://localhost:4000";
  const health = await fetch(`${api}/health/ready`).catch(() => null);
  if (!health?.ok)
    throw new Error(`The API isn't ready at ${api}. Start premium-ec-backend (npm run dev, npm run dev:worker).`);
  // saved after each user, so teardown removes whatever was created even if a later step fails
  const staff: Record<string, TestStaff> = {};
  const accounts: [string, string[]][] = [
    ["owner", ["Owner"]],
    ["newcomer", ["Owner", "--no-mfa"]],
    ["editor", ["Content Editor"]],
  ];
  for (const [key, args] of accounts) {
    staff[key] = JSON.parse(runStaffScript(["create", ...args]));
    saveStaff(staff);
  }
}

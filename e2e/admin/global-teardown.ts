import { existsSync } from "node:fs";
import path from "node:path";
import { loadStaff, runStaffScript } from "./staff";

export default async function globalTeardown() {
  if (!existsSync(path.join(__dirname, ".staff.json"))) return;
  for (const staff of Object.values(loadStaff())) runStaffScript(["delete", staff.id]);
}

// Generates, from the backend's OpenAPI document:
// - src/api/schema.d.ts: types for the storefront's server-side client (openapi-fetch);
// - src/admin/store/api.generated.ts: the admin's RTK Query endpoints and hooks (openapi-config.cjs).
// OPENAPI_SOURCE may be a file path or a URL (a non-production API serves /v1/openapi.json).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const source = process.env.OPENAPI_SOURCE ?? "../premium-ec-backend/openapi.json";
if (!source.startsWith("http") && !existsSync(source)) {
  console.error(
    `OpenAPI document not found at ${source}. Run "npm run openapi" in premium-ec-backend, or set OPENAPI_SOURCE.`,
  );
  process.exit(1);
}
execFileSync("npx", ["openapi-typescript", source, "-o", "src/api/schema.d.ts"], { stdio: "inherit", shell: true });
execFileSync("npx", ["rtk-query-codegen-openapi", "openapi-config.cjs"], { stdio: "inherit", shell: true });

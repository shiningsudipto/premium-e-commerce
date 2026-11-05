// RTK Query endpoints for the admin, generated from the Express API's OpenAPI document:
//   npm run api:generate   (OPENAPI_SOURCE may point at a file or a running API's /v1/openapi.json)
// Only admin endpoints are generated; the storefront reads the API on the server.

/** @type {import("@rtk-query/codegen-openapi").ConfigFile} */
module.exports = {
  schemaFile: process.env.OPENAPI_SOURCE ?? "../premium-ec-backend/openapi.json",
  apiFile: "./src/admin/store/base-api.ts",
  apiImport: "baseApi",
  outputFile: "./src/admin/store/api.generated.ts",
  exportName: "adminApi",
  hooks: true,
  // OpenAPI tags become cache tags: a mutation refetches the queries of its API area
  tag: true,
  filterEndpoints: (_name, operation) => operation.path.startsWith("/v1/admin/"),
};

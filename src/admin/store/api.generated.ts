import { baseApi as api } from "./base-api";
export const addTagTypes = [
  "Affiliates",
  "Approvals",
  "Dashboard",
  "Experiments",
  "Catalog",
  "Reports",
  "Search tuning",
  "Webhooks",
  "Workflows",
  "Page builder",
  "Customers",
  "Import & export",
  "Promotions",
  "Returns",
  "Reviews & Q&A",
  "Themes",
  "Audit log",
  "Content",
  "Custom fields",
  "Inventory",
  "Markets, channels & locations",
  "Media",
  "Notifications",
  "Orders",
  "Pricing",
  "Settings & flags",
  "Shipping",
  "Staff & roles",
  "Tax",
  "Admin auth",
  "Admin session",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getV1AdminAffiliateProgramAffiliatesIdPayoutMethods: build.query<
        GetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsApiResponse,
        GetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/affiliates/${queryArg.id}/payout-methods`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            reveal: queryArg.reveal,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramAffiliatesIdCouponCodes: build.mutation<
        PostV1AdminAffiliateProgramAffiliatesIdCouponCodesApiResponse,
        PostV1AdminAffiliateProgramAffiliatesIdCouponCodesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/affiliates/${queryArg.id}/coupon-codes`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliateProgramFraudFlags: build.query<
        GetV1AdminAffiliateProgramFraudFlagsApiResponse,
        GetV1AdminAffiliateProgramFraudFlagsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/fraud-flags`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            status: queryArg.status,
            affiliateId: queryArg.affiliateId,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramAffiliatesIdFraudFlags: build.mutation<
        PostV1AdminAffiliateProgramAffiliatesIdFraudFlagsApiResponse,
        PostV1AdminAffiliateProgramAffiliatesIdFraudFlagsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/affiliates/${queryArg.id}/fraud-flags`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramFraudFlagsIdResolve: build.mutation<
        PostV1AdminAffiliateProgramFraudFlagsIdResolveApiResponse,
        PostV1AdminAffiliateProgramFraudFlagsIdResolveApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/fraud-flags/${queryArg.id}/resolve`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliateProgramPayoutBatches: build.query<
        GetV1AdminAffiliateProgramPayoutBatchesApiResponse,
        GetV1AdminAffiliateProgramPayoutBatchesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramPayoutBatches: build.mutation<
        PostV1AdminAffiliateProgramPayoutBatchesApiResponse,
        PostV1AdminAffiliateProgramPayoutBatchesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliateProgramPayoutBatchesId: build.query<
        GetV1AdminAffiliateProgramPayoutBatchesIdApiResponse,
        GetV1AdminAffiliateProgramPayoutBatchesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramPayoutBatchesIdApprove: build.mutation<
        PostV1AdminAffiliateProgramPayoutBatchesIdApproveApiResponse,
        PostV1AdminAffiliateProgramPayoutBatchesIdApproveApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches/${queryArg.id}/approve`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramPayoutBatchesIdPaid: build.mutation<
        PostV1AdminAffiliateProgramPayoutBatchesIdPaidApiResponse,
        PostV1AdminAffiliateProgramPayoutBatchesIdPaidApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches/${queryArg.id}/paid`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramPayoutBatchesIdCancel: build.mutation<
        PostV1AdminAffiliateProgramPayoutBatchesIdCancelApiResponse,
        PostV1AdminAffiliateProgramPayoutBatchesIdCancelApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches/${queryArg.id}/cancel`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliateProgramPayoutBatchesIdExport: build.query<
        GetV1AdminAffiliateProgramPayoutBatchesIdExportApiResponse,
        GetV1AdminAffiliateProgramPayoutBatchesIdExportApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payout-batches/${queryArg.id}/export`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramPayoutsIdSend: build.mutation<
        PostV1AdminAffiliateProgramPayoutsIdSendApiResponse,
        PostV1AdminAffiliateProgramPayoutsIdSendApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/payouts/${queryArg.id}/send`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliateProgramAssets: build.query<
        GetV1AdminAffiliateProgramAssetsApiResponse,
        GetV1AdminAffiliateProgramAssetsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/assets`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliateProgramAssets: build.mutation<
        PostV1AdminAffiliateProgramAssetsApiResponse,
        PostV1AdminAffiliateProgramAssetsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/assets`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      putV1AdminAffiliateProgramAssetsId: build.mutation<
        PutV1AdminAffiliateProgramAssetsIdApiResponse,
        PutV1AdminAffiliateProgramAssetsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/assets/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliateProgramAssetsAnalytics: build.query<
        GetV1AdminAffiliateProgramAssetsAnalyticsApiResponse,
        GetV1AdminAffiliateProgramAssetsAnalyticsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliate-program/assets-analytics`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      getV1AdminApprovals: build.query<
        GetV1AdminApprovalsApiResponse,
        GetV1AdminApprovalsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/approvals`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            status: queryArg.status,
          },
        }),
        providesTags: ["Approvals"],
      }),
      postV1AdminApprovalsIdDecision: build.mutation<
        PostV1AdminApprovalsIdDecisionApiResponse,
        PostV1AdminApprovalsIdDecisionApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/approvals/${queryArg.id}/decision`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Approvals"],
      }),
      getV1AdminDashboard: build.query<
        GetV1AdminDashboardApiResponse,
        GetV1AdminDashboardApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/dashboard`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Dashboard"],
      }),
      getV1AdminDashboardStream: build.query<
        GetV1AdminDashboardStreamApiResponse,
        GetV1AdminDashboardStreamApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/dashboard/stream`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Dashboard"],
      }),
      getV1AdminExperiments: build.query<
        GetV1AdminExperimentsApiResponse,
        GetV1AdminExperimentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/experiments`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Experiments"],
      }),
      postV1AdminExperiments: build.mutation<
        PostV1AdminExperimentsApiResponse,
        PostV1AdminExperimentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/experiments`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Experiments"],
      }),
      putV1AdminExperimentsId: build.mutation<
        PutV1AdminExperimentsIdApiResponse,
        PutV1AdminExperimentsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/experiments/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Experiments"],
      }),
      postV1AdminExperimentsIdStatus: build.mutation<
        PostV1AdminExperimentsIdStatusApiResponse,
        PostV1AdminExperimentsIdStatusApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/experiments/${queryArg.id}/status`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Experiments"],
      }),
      getV1AdminExperimentsIdResults: build.query<
        GetV1AdminExperimentsIdResultsApiResponse,
        GetV1AdminExperimentsIdResultsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/experiments/${queryArg.id}/results`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Experiments"],
      }),
      putV1AdminProductsIdRelations: build.mutation<
        PutV1AdminProductsIdRelationsApiResponse,
        PutV1AdminProductsIdRelationsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}/relations`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminReportBuilderCatalog: build.query<
        GetV1AdminReportBuilderCatalogApiResponse,
        GetV1AdminReportBuilderCatalogApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/catalog`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Reports"],
      }),
      postV1AdminReportBuilderRun: build.mutation<
        PostV1AdminReportBuilderRunApiResponse,
        PostV1AdminReportBuilderRunApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/run`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Reports"],
      }),
      getV1AdminReportBuilderReports: build.query<
        GetV1AdminReportBuilderReportsApiResponse,
        GetV1AdminReportBuilderReportsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/reports`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Reports"],
      }),
      postV1AdminReportBuilderReports: build.mutation<
        PostV1AdminReportBuilderReportsApiResponse,
        PostV1AdminReportBuilderReportsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/reports`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Reports"],
      }),
      putV1AdminReportBuilderReportsId: build.mutation<
        PutV1AdminReportBuilderReportsIdApiResponse,
        PutV1AdminReportBuilderReportsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/reports/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Reports"],
      }),
      deleteV1AdminReportBuilderReportsId: build.mutation<
        DeleteV1AdminReportBuilderReportsIdApiResponse,
        DeleteV1AdminReportBuilderReportsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/reports/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Reports"],
      }),
      getV1AdminReportBuilderReportsIdRun: build.query<
        GetV1AdminReportBuilderReportsIdRunApiResponse,
        GetV1AdminReportBuilderReportsIdRunApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/reports/${queryArg.id}/run`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReportBuilderFunnel: build.query<
        GetV1AdminReportBuilderFunnelApiResponse,
        GetV1AdminReportBuilderFunnelApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/report-builder/funnel`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminSearchSynonyms: build.query<
        GetV1AdminSearchSynonymsApiResponse,
        GetV1AdminSearchSynonymsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/synonyms`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Search tuning"],
      }),
      postV1AdminSearchSynonyms: build.mutation<
        PostV1AdminSearchSynonymsApiResponse,
        PostV1AdminSearchSynonymsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/synonyms`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Search tuning"],
      }),
      deleteV1AdminSearchSynonymsId: build.mutation<
        DeleteV1AdminSearchSynonymsIdApiResponse,
        DeleteV1AdminSearchSynonymsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/synonyms/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Search tuning"],
      }),
      getV1AdminSearchRedirects: build.query<
        GetV1AdminSearchRedirectsApiResponse,
        GetV1AdminSearchRedirectsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/redirects`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Search tuning"],
      }),
      putV1AdminSearchRedirects: build.mutation<
        PutV1AdminSearchRedirectsApiResponse,
        PutV1AdminSearchRedirectsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/redirects`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Search tuning"],
      }),
      deleteV1AdminSearchRedirectsId: build.mutation<
        DeleteV1AdminSearchRedirectsIdApiResponse,
        DeleteV1AdminSearchRedirectsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/redirects/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Search tuning"],
      }),
      getV1AdminSearchRules: build.query<
        GetV1AdminSearchRulesApiResponse,
        GetV1AdminSearchRulesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/rules`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Search tuning"],
      }),
      putV1AdminSearchRules: build.mutation<
        PutV1AdminSearchRulesApiResponse,
        PutV1AdminSearchRulesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/rules`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Search tuning"],
      }),
      deleteV1AdminSearchRulesId: build.mutation<
        DeleteV1AdminSearchRulesIdApiResponse,
        DeleteV1AdminSearchRulesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/search/rules/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Search tuning"],
      }),
      getV1AdminWebhooksEvents: build.query<
        GetV1AdminWebhooksEventsApiResponse,
        GetV1AdminWebhooksEventsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/events`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Webhooks"],
      }),
      getV1AdminWebhooks: build.query<
        GetV1AdminWebhooksApiResponse,
        GetV1AdminWebhooksApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Webhooks"],
      }),
      postV1AdminWebhooks: build.mutation<
        PostV1AdminWebhooksApiResponse,
        PostV1AdminWebhooksApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Webhooks"],
      }),
      patchV1AdminWebhooksId: build.mutation<
        PatchV1AdminWebhooksIdApiResponse,
        PatchV1AdminWebhooksIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Webhooks"],
      }),
      deleteV1AdminWebhooksId: build.mutation<
        DeleteV1AdminWebhooksIdApiResponse,
        DeleteV1AdminWebhooksIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Webhooks"],
      }),
      postV1AdminWebhooksIdRotateSecret: build.mutation<
        PostV1AdminWebhooksIdRotateSecretApiResponse,
        PostV1AdminWebhooksIdRotateSecretApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/${queryArg.id}/rotate-secret`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Webhooks"],
      }),
      postV1AdminWebhooksIdPing: build.mutation<
        PostV1AdminWebhooksIdPingApiResponse,
        PostV1AdminWebhooksIdPingApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/${queryArg.id}/ping`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Webhooks"],
      }),
      getV1AdminWebhooksIdDeliveries: build.query<
        GetV1AdminWebhooksIdDeliveriesApiResponse,
        GetV1AdminWebhooksIdDeliveriesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/${queryArg.id}/deliveries`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Webhooks"],
      }),
      postV1AdminWebhooksDeliveriesIdReplay: build.mutation<
        PostV1AdminWebhooksDeliveriesIdReplayApiResponse,
        PostV1AdminWebhooksDeliveriesIdReplayApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/webhooks/deliveries/${queryArg.id}/replay`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Webhooks"],
      }),
      getV1AdminWorkflowsTriggers: build.query<
        GetV1AdminWorkflowsTriggersApiResponse,
        GetV1AdminWorkflowsTriggersApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows/triggers`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Workflows"],
      }),
      getV1AdminWorkflows: build.query<
        GetV1AdminWorkflowsApiResponse,
        GetV1AdminWorkflowsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Workflows"],
      }),
      postV1AdminWorkflows: build.mutation<
        PostV1AdminWorkflowsApiResponse,
        PostV1AdminWorkflowsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Workflows"],
      }),
      putV1AdminWorkflowsId: build.mutation<
        PutV1AdminWorkflowsIdApiResponse,
        PutV1AdminWorkflowsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Workflows"],
      }),
      deleteV1AdminWorkflowsId: build.mutation<
        DeleteV1AdminWorkflowsIdApiResponse,
        DeleteV1AdminWorkflowsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Workflows"],
      }),
      getV1AdminWorkflowsIdRuns: build.query<
        GetV1AdminWorkflowsIdRunsApiResponse,
        GetV1AdminWorkflowsIdRunsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows/${queryArg.id}/runs`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Workflows"],
      }),
      postV1AdminWorkflowsTest: build.mutation<
        PostV1AdminWorkflowsTestApiResponse,
        PostV1AdminWorkflowsTestApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/workflows/test`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Workflows"],
      }),
      getV1AdminAffiliates: build.query<
        GetV1AdminAffiliatesApiResponse,
        GetV1AdminAffiliatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            status: queryArg.status,
            tierId: queryArg.tierId,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      getV1AdminAffiliatesId: build.query<
        GetV1AdminAffiliatesIdApiResponse,
        GetV1AdminAffiliatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Affiliates"],
      }),
      patchV1AdminAffiliatesId: build.mutation<
        PatchV1AdminAffiliatesIdApiResponse,
        PatchV1AdminAffiliatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesIdStatus: build.mutation<
        PostV1AdminAffiliatesIdStatusApiResponse,
        PostV1AdminAffiliatesIdStatusApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}/status`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      patchV1AdminAffiliatesLinksId: build.mutation<
        PatchV1AdminAffiliatesLinksIdApiResponse,
        PatchV1AdminAffiliatesLinksIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/links/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliatesIdEarnings: build.query<
        GetV1AdminAffiliatesIdEarningsApiResponse,
        GetV1AdminAffiliatesIdEarningsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}/earnings`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesIdAdjustments: build.mutation<
        PostV1AdminAffiliatesIdAdjustmentsApiResponse,
        PostV1AdminAffiliatesIdAdjustmentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}/adjustments`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliatesIdPayouts: build.query<
        GetV1AdminAffiliatesIdPayoutsApiResponse,
        GetV1AdminAffiliatesIdPayoutsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}/payouts`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesIdPayouts: build.mutation<
        PostV1AdminAffiliatesIdPayoutsApiResponse,
        PostV1AdminAffiliatesIdPayoutsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/${queryArg.id}/payouts`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesPayoutsIdApprove: build.mutation<
        PostV1AdminAffiliatesPayoutsIdApproveApiResponse,
        PostV1AdminAffiliatesPayoutsIdApproveApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/payouts/${queryArg.id}/approve`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesPayoutsIdPaid: build.mutation<
        PostV1AdminAffiliatesPayoutsIdPaidApiResponse,
        PostV1AdminAffiliatesPayoutsIdPaidApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/payouts/${queryArg.id}/paid`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesPayoutsIdCancel: build.mutation<
        PostV1AdminAffiliatesPayoutsIdCancelApiResponse,
        PostV1AdminAffiliatesPayoutsIdCancelApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/payouts/${queryArg.id}/cancel`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliatesConfigTiers: build.query<
        GetV1AdminAffiliatesConfigTiersApiResponse,
        GetV1AdminAffiliatesConfigTiersApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/config/tiers`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesConfigTiers: build.mutation<
        PostV1AdminAffiliatesConfigTiersApiResponse,
        PostV1AdminAffiliatesConfigTiersApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/config/tiers`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      putV1AdminAffiliatesConfigTiersId: build.mutation<
        PutV1AdminAffiliatesConfigTiersIdApiResponse,
        PutV1AdminAffiliatesConfigTiersIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/config/tiers/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminAffiliatesConfigRules: build.query<
        GetV1AdminAffiliatesConfigRulesApiResponse,
        GetV1AdminAffiliatesConfigRulesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/config/rules`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Affiliates"],
      }),
      postV1AdminAffiliatesConfigRules: build.mutation<
        PostV1AdminAffiliatesConfigRulesApiResponse,
        PostV1AdminAffiliatesConfigRulesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/config/rules`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      putV1AdminAffiliatesConfigRulesId: build.mutation<
        PutV1AdminAffiliatesConfigRulesIdApiResponse,
        PutV1AdminAffiliatesConfigRulesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/affiliates/config/rules/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      putV1AdminOrdersIdAttribution: build.mutation<
        PutV1AdminOrdersIdAttributionApiResponse,
        PutV1AdminOrdersIdAttributionApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/attribution`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Affiliates"],
      }),
      getV1AdminBlocks: build.query<
        GetV1AdminBlocksApiResponse,
        GetV1AdminBlocksApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/blocks`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Page builder"],
      }),
      getV1AdminPages: build.query<
        GetV1AdminPagesApiResponse,
        GetV1AdminPagesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            kind: queryArg.kind,
          },
        }),
        providesTags: ["Page builder"],
      }),
      postV1AdminPages: build.mutation<
        PostV1AdminPagesApiResponse,
        PostV1AdminPagesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Page builder"],
      }),
      getV1AdminPagesId: build.query<
        GetV1AdminPagesIdApiResponse,
        GetV1AdminPagesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Page builder"],
      }),
      putV1AdminPagesId: build.mutation<
        PutV1AdminPagesIdApiResponse,
        PutV1AdminPagesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Page builder"],
      }),
      postV1AdminPagesIdPublish: build.mutation<
        PostV1AdminPagesIdPublishApiResponse,
        PostV1AdminPagesIdPublishApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}/publish`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Page builder"],
      }),
      postV1AdminPagesIdUnpublish: build.mutation<
        PostV1AdminPagesIdUnpublishApiResponse,
        PostV1AdminPagesIdUnpublishApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}/unpublish`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Page builder"],
      }),
      getV1AdminPagesIdVersions: build.query<
        GetV1AdminPagesIdVersionsApiResponse,
        GetV1AdminPagesIdVersionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}/versions`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Page builder"],
      }),
      postV1AdminPagesIdRollback: build.mutation<
        PostV1AdminPagesIdRollbackApiResponse,
        PostV1AdminPagesIdRollbackApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}/rollback`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Page builder"],
      }),
      postV1AdminPagesIdPreviewLink: build.mutation<
        PostV1AdminPagesIdPreviewLinkApiResponse,
        PostV1AdminPagesIdPreviewLinkApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/pages/${queryArg.id}/preview-link`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Page builder"],
      }),
      getV1AdminCustomersIdExport: build.query<
        GetV1AdminCustomersIdExportApiResponse,
        GetV1AdminCustomersIdExportApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers/${queryArg.id}/export`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Customers"],
      }),
      postV1AdminCustomersIdAnonymize: build.mutation<
        PostV1AdminCustomersIdAnonymizeApiResponse,
        PostV1AdminCustomersIdAnonymizeApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers/${queryArg.id}/anonymize`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      getV1AdminCustomersIdStoreCredit: build.query<
        GetV1AdminCustomersIdStoreCreditApiResponse,
        GetV1AdminCustomersIdStoreCreditApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers/${queryArg.id}/store-credit`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Customers"],
      }),
      postV1AdminCustomersIdStoreCredit: build.mutation<
        PostV1AdminCustomersIdStoreCreditApiResponse,
        PostV1AdminCustomersIdStoreCreditApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers/${queryArg.id}/store-credit`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      getV1AdminImportsColumns: build.query<
        GetV1AdminImportsColumnsApiResponse,
        GetV1AdminImportsColumnsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/imports/columns`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Import & export"],
      }),
      postV1AdminImports: build.mutation<
        PostV1AdminImportsApiResponse,
        PostV1AdminImportsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/imports`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Import & export"],
      }),
      postV1AdminExports: build.mutation<
        PostV1AdminExportsApiResponse,
        PostV1AdminExportsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/exports`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Import & export"],
      }),
      getV1AdminDataJobs: build.query<
        GetV1AdminDataJobsApiResponse,
        GetV1AdminDataJobsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/data-jobs`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Import & export"],
      }),
      getV1AdminDataJobsId: build.query<
        GetV1AdminDataJobsIdApiResponse,
        GetV1AdminDataJobsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/data-jobs/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Import & export"],
      }),
      getV1AdminDataJobsIdDownload: build.query<
        GetV1AdminDataJobsIdDownloadApiResponse,
        GetV1AdminDataJobsIdDownloadApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/data-jobs/${queryArg.id}/download`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Import & export"],
      }),
      getV1AdminPromotions: build.query<
        GetV1AdminPromotionsApiResponse,
        GetV1AdminPromotionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            type: queryArg["type"],
            status: queryArg.status,
            q: queryArg.q,
          },
        }),
        providesTags: ["Promotions"],
      }),
      postV1AdminPromotions: build.mutation<
        PostV1AdminPromotionsApiResponse,
        PostV1AdminPromotionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Promotions"],
      }),
      getV1AdminPromotionsId: build.query<
        GetV1AdminPromotionsIdApiResponse,
        GetV1AdminPromotionsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Promotions"],
      }),
      patchV1AdminPromotionsId: build.mutation<
        PatchV1AdminPromotionsIdApiResponse,
        PatchV1AdminPromotionsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Promotions"],
      }),
      postV1AdminPromotionsIdStatus: build.mutation<
        PostV1AdminPromotionsIdStatusApiResponse,
        PostV1AdminPromotionsIdStatusApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/${queryArg.id}/status`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Promotions"],
      }),
      getV1AdminPromotionsIdCodes: build.query<
        GetV1AdminPromotionsIdCodesApiResponse,
        GetV1AdminPromotionsIdCodesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/${queryArg.id}/codes`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            q: queryArg.q,
          },
        }),
        providesTags: ["Promotions"],
      }),
      postV1AdminPromotionsIdCodes: build.mutation<
        PostV1AdminPromotionsIdCodesApiResponse,
        PostV1AdminPromotionsIdCodesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/${queryArg.id}/codes`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Promotions"],
      }),
      patchV1AdminPromotionsCodesId: build.mutation<
        PatchV1AdminPromotionsCodesIdApiResponse,
        PatchV1AdminPromotionsCodesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/codes/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Promotions"],
      }),
      postV1AdminPromotionsSimulate: build.mutation<
        PostV1AdminPromotionsSimulateApiResponse,
        PostV1AdminPromotionsSimulateApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/simulate`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Promotions"],
      }),
      getV1AdminPromotionsIdPerformance: build.query<
        GetV1AdminPromotionsIdPerformanceApiResponse,
        GetV1AdminPromotionsIdPerformanceApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/promotions/${queryArg.id}/performance`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
          },
        }),
        providesTags: ["Promotions"],
      }),
      getV1AdminReportsSales: build.query<
        GetV1AdminReportsSalesApiResponse,
        GetV1AdminReportsSalesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/reports/sales`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            currency: queryArg.currency,
            interval: queryArg.interval,
            limit: queryArg.limit,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReportsProducts: build.query<
        GetV1AdminReportsProductsApiResponse,
        GetV1AdminReportsProductsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/reports/products`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            currency: queryArg.currency,
            interval: queryArg.interval,
            limit: queryArg.limit,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReportsCustomers: build.query<
        GetV1AdminReportsCustomersApiResponse,
        GetV1AdminReportsCustomersApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/reports/customers`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            currency: queryArg.currency,
            interval: queryArg.interval,
            limit: queryArg.limit,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReportsPromotions: build.query<
        GetV1AdminReportsPromotionsApiResponse,
        GetV1AdminReportsPromotionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/reports/promotions`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            currency: queryArg.currency,
            interval: queryArg.interval,
            limit: queryArg.limit,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReportsSearch: build.query<
        GetV1AdminReportsSearchApiResponse,
        GetV1AdminReportsSearchApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/reports/search`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            currency: queryArg.currency,
            interval: queryArg.interval,
            limit: queryArg.limit,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReportsAffiliates: build.query<
        GetV1AdminReportsAffiliatesApiResponse,
        GetV1AdminReportsAffiliatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/reports/affiliates`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            from: queryArg["from"],
            to: queryArg.to,
            currency: queryArg.currency,
            interval: queryArg.interval,
            limit: queryArg.limit,
            format: queryArg.format,
          },
        }),
        providesTags: ["Reports"],
      }),
      getV1AdminReturns: build.query<
        GetV1AdminReturnsApiResponse,
        GetV1AdminReturnsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/returns`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            status: queryArg.status,
          },
        }),
        providesTags: ["Returns"],
      }),
      getV1AdminReturnsId: build.query<
        GetV1AdminReturnsIdApiResponse,
        GetV1AdminReturnsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/returns/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Returns"],
      }),
      postV1AdminReturnsIdDecision: build.mutation<
        PostV1AdminReturnsIdDecisionApiResponse,
        PostV1AdminReturnsIdDecisionApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/returns/${queryArg.id}/decision`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Returns"],
      }),
      postV1AdminReturnsIdShipping: build.mutation<
        PostV1AdminReturnsIdShippingApiResponse,
        PostV1AdminReturnsIdShippingApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/returns/${queryArg.id}/shipping`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Returns"],
      }),
      postV1AdminReturnsIdInspection: build.mutation<
        PostV1AdminReturnsIdInspectionApiResponse,
        PostV1AdminReturnsIdInspectionApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/returns/${queryArg.id}/inspection`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Returns"],
      }),
      postV1AdminReturnsIdComplete: build.mutation<
        PostV1AdminReturnsIdCompleteApiResponse,
        PostV1AdminReturnsIdCompleteApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/returns/${queryArg.id}/complete`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "Idempotency-Key": queryArg["Idempotency-Key"],
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Returns"],
      }),
      getV1AdminModeration: build.query<
        GetV1AdminModerationApiResponse,
        GetV1AdminModerationApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/moderation`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            kind: queryArg.kind,
            status: queryArg.status,
          },
        }),
        providesTags: ["Reviews & Q&A"],
      }),
      patchV1AdminModerationReviewsId: build.mutation<
        PatchV1AdminModerationReviewsIdApiResponse,
        PatchV1AdminModerationReviewsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/moderation/reviews/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Reviews & Q&A"],
      }),
      patchV1AdminModerationQuestionsId: build.mutation<
        PatchV1AdminModerationQuestionsIdApiResponse,
        PatchV1AdminModerationQuestionsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/moderation/questions/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Reviews & Q&A"],
      }),
      getV1AdminSegments: build.query<
        GetV1AdminSegmentsApiResponse,
        GetV1AdminSegmentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/segments`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Customers"],
      }),
      postV1AdminSegments: build.mutation<
        PostV1AdminSegmentsApiResponse,
        PostV1AdminSegmentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/segments`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      postV1AdminSegmentsPreview: build.mutation<
        PostV1AdminSegmentsPreviewApiResponse,
        PostV1AdminSegmentsPreviewApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/segments/preview`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      putV1AdminSegmentsId: build.mutation<
        PutV1AdminSegmentsIdApiResponse,
        PutV1AdminSegmentsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/segments/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      deleteV1AdminSegmentsId: build.mutation<
        DeleteV1AdminSegmentsIdApiResponse,
        DeleteV1AdminSegmentsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/segments/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      postV1AdminSegmentsIdRefresh: build.mutation<
        PostV1AdminSegmentsIdRefreshApiResponse,
        PostV1AdminSegmentsIdRefreshApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/segments/${queryArg.id}/refresh`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      getV1AdminThemes: build.query<
        GetV1AdminThemesApiResponse,
        GetV1AdminThemesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/themes`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Themes"],
      }),
      postV1AdminThemes: build.mutation<
        PostV1AdminThemesApiResponse,
        PostV1AdminThemesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/themes`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Themes"],
      }),
      getV1AdminThemesId: build.query<
        GetV1AdminThemesIdApiResponse,
        GetV1AdminThemesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/themes/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Themes"],
      }),
      putV1AdminThemesId: build.mutation<
        PutV1AdminThemesIdApiResponse,
        PutV1AdminThemesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/themes/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Themes"],
      }),
      postV1AdminThemesIdActivate: build.mutation<
        PostV1AdminThemesIdActivateApiResponse,
        PostV1AdminThemesIdActivateApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/themes/${queryArg.id}/activate`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Themes"],
      }),
      postV1AdminThemesIdPreviewLink: build.mutation<
        PostV1AdminThemesIdPreviewLinkApiResponse,
        PostV1AdminThemesIdPreviewLinkApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/themes/${queryArg.id}/preview-link`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Themes"],
      }),
      getV1AdminAudit: build.query<
        GetV1AdminAuditApiResponse,
        GetV1AdminAuditApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/audit`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            entityType: queryArg.entityType,
            entityId: queryArg.entityId,
            actorId: queryArg.actorId,
            action: queryArg.action,
            before: queryArg.before,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Audit log"],
      }),
      getV1AdminProducts: build.query<
        GetV1AdminProductsApiResponse,
        GetV1AdminProductsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            q: queryArg.q,
            status: queryArg.status,
            categoryId: queryArg.categoryId,
            vendor: queryArg.vendor,
          },
        }),
        providesTags: ["Catalog"],
      }),
      postV1AdminProducts: build.mutation<
        PostV1AdminProductsApiResponse,
        PostV1AdminProductsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminProductsId: build.query<
        GetV1AdminProductsIdApiResponse,
        GetV1AdminProductsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Catalog"],
      }),
      patchV1AdminProductsId: build.mutation<
        PatchV1AdminProductsIdApiResponse,
        PatchV1AdminProductsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      postV1AdminProductsIdStatus: build.mutation<
        PostV1AdminProductsIdStatusApiResponse,
        PostV1AdminProductsIdStatusApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}/status`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      postV1AdminProductsIdVariants: build.mutation<
        PostV1AdminProductsIdVariantsApiResponse,
        PostV1AdminProductsIdVariantsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}/variants`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      postV1AdminProductsIdVariantsGenerate: build.mutation<
        PostV1AdminProductsIdVariantsGenerateApiResponse,
        PostV1AdminProductsIdVariantsGenerateApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}/variants/generate`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      patchV1AdminVariantsId: build.mutation<
        PatchV1AdminVariantsIdApiResponse,
        PatchV1AdminVariantsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/variants/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      deleteV1AdminVariantsId: build.mutation<
        DeleteV1AdminVariantsIdApiResponse,
        DeleteV1AdminVariantsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/variants/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminProductsIdMedia: build.mutation<
        PutV1AdminProductsIdMediaApiResponse,
        PutV1AdminProductsIdMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/products/${queryArg.id}/media`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminCategories: build.query<
        GetV1AdminCategoriesApiResponse,
        GetV1AdminCategoriesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/categories`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Catalog"],
      }),
      postV1AdminCategories: build.mutation<
        PostV1AdminCategoriesApiResponse,
        PostV1AdminCategoriesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/categories`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminCategoriesId: build.mutation<
        PutV1AdminCategoriesIdApiResponse,
        PutV1AdminCategoriesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/categories/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      deleteV1AdminCategoriesId: build.mutation<
        DeleteV1AdminCategoriesIdApiResponse,
        DeleteV1AdminCategoriesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/categories/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminCategoriesIdProducts: build.mutation<
        PutV1AdminCategoriesIdProductsApiResponse,
        PutV1AdminCategoriesIdProductsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/categories/${queryArg.id}/products`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminCollections: build.query<
        GetV1AdminCollectionsApiResponse,
        GetV1AdminCollectionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/collections`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Catalog"],
      }),
      postV1AdminCollections: build.mutation<
        PostV1AdminCollectionsApiResponse,
        PostV1AdminCollectionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/collections`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminCollectionsId: build.mutation<
        PutV1AdminCollectionsIdApiResponse,
        PutV1AdminCollectionsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/collections/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      deleteV1AdminCollectionsId: build.mutation<
        DeleteV1AdminCollectionsIdApiResponse,
        DeleteV1AdminCollectionsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/collections/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminCollectionsIdProducts: build.mutation<
        PutV1AdminCollectionsIdProductsApiResponse,
        PutV1AdminCollectionsIdProductsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/collections/${queryArg.id}/products`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminAttributes: build.query<
        GetV1AdminAttributesApiResponse,
        GetV1AdminAttributesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/attributes`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Catalog"],
      }),
      postV1AdminAttributes: build.mutation<
        PostV1AdminAttributesApiResponse,
        PostV1AdminAttributesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/attributes`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminAttributesId: build.mutation<
        PutV1AdminAttributesIdApiResponse,
        PutV1AdminAttributesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/attributes/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminProductTypes: build.query<
        GetV1AdminProductTypesApiResponse,
        GetV1AdminProductTypesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/product-types`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Catalog"],
      }),
      postV1AdminProductTypes: build.mutation<
        PostV1AdminProductTypesApiResponse,
        PostV1AdminProductTypesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/product-types`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      putV1AdminProductTypesId: build.mutation<
        PutV1AdminProductTypesIdApiResponse,
        PutV1AdminProductTypesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/product-types/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Catalog"],
      }),
      getV1AdminRedirects: build.query<
        GetV1AdminRedirectsApiResponse,
        GetV1AdminRedirectsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/redirects`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            q: queryArg.q,
          },
        }),
        providesTags: ["Content"],
      }),
      postV1AdminRedirects: build.mutation<
        PostV1AdminRedirectsApiResponse,
        PostV1AdminRedirectsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/redirects`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Content"],
      }),
      deleteV1AdminRedirectsId: build.mutation<
        DeleteV1AdminRedirectsIdApiResponse,
        DeleteV1AdminRedirectsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/redirects/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Content"],
      }),
      getV1AdminMenus: build.query<
        GetV1AdminMenusApiResponse,
        GetV1AdminMenusApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/menus`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Content"],
      }),
      putV1AdminMenusHandle: build.mutation<
        PutV1AdminMenusHandleApiResponse,
        PutV1AdminMenusHandleApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/menus/${queryArg.handle}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Content"],
      }),
      getV1AdminCustomFields: build.query<
        GetV1AdminCustomFieldsApiResponse,
        GetV1AdminCustomFieldsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/custom-fields`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            entityType: queryArg.entityType,
          },
        }),
        providesTags: ["Custom fields"],
      }),
      postV1AdminCustomFields: build.mutation<
        PostV1AdminCustomFieldsApiResponse,
        PostV1AdminCustomFieldsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/custom-fields`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Custom fields"],
      }),
      putV1AdminCustomFieldsId: build.mutation<
        PutV1AdminCustomFieldsIdApiResponse,
        PutV1AdminCustomFieldsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/custom-fields/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Custom fields"],
      }),
      deleteV1AdminCustomFieldsId: build.mutation<
        DeleteV1AdminCustomFieldsIdApiResponse,
        DeleteV1AdminCustomFieldsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/custom-fields/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Custom fields"],
      }),
      getV1AdminCustomers: build.query<
        GetV1AdminCustomersApiResponse,
        GetV1AdminCustomersApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            q: queryArg.q,
            groupId: queryArg.groupId,
            tag: queryArg.tag,
          },
        }),
        providesTags: ["Customers"],
      }),
      getV1AdminCustomersId: build.query<
        GetV1AdminCustomersIdApiResponse,
        GetV1AdminCustomersIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Customers"],
      }),
      patchV1AdminCustomersId: build.mutation<
        PatchV1AdminCustomersIdApiResponse,
        PatchV1AdminCustomersIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customers/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      getV1AdminCustomerGroups: build.query<
        GetV1AdminCustomerGroupsApiResponse,
        GetV1AdminCustomerGroupsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customer-groups`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Customers"],
      }),
      postV1AdminCustomerGroups: build.mutation<
        PostV1AdminCustomerGroupsApiResponse,
        PostV1AdminCustomerGroupsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/customer-groups`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Customers"],
      }),
      getV1AdminInventoryVariantsId: build.query<
        GetV1AdminInventoryVariantsIdApiResponse,
        GetV1AdminInventoryVariantsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/inventory/variants/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Inventory"],
      }),
      getV1AdminInventoryVariantsIdHistory: build.query<
        GetV1AdminInventoryVariantsIdHistoryApiResponse,
        GetV1AdminInventoryVariantsIdHistoryApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/inventory/variants/${queryArg.id}/history`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Inventory"],
      }),
      postV1AdminInventoryAdjustments: build.mutation<
        PostV1AdminInventoryAdjustmentsApiResponse,
        PostV1AdminInventoryAdjustmentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/inventory/adjustments`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Inventory"],
      }),
      patchV1AdminInventoryLevelsId: build.mutation<
        PatchV1AdminInventoryLevelsIdApiResponse,
        PatchV1AdminInventoryLevelsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/inventory/levels/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Inventory"],
      }),
      getV1AdminMarkets: build.query<
        GetV1AdminMarketsApiResponse,
        GetV1AdminMarketsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/markets`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Markets, channels & locations"],
      }),
      postV1AdminMarkets: build.mutation<
        PostV1AdminMarketsApiResponse,
        PostV1AdminMarketsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/markets`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Markets, channels & locations"],
      }),
      putV1AdminMarketsId: build.mutation<
        PutV1AdminMarketsIdApiResponse,
        PutV1AdminMarketsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/markets/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Markets, channels & locations"],
      }),
      getV1AdminChannels: build.query<
        GetV1AdminChannelsApiResponse,
        GetV1AdminChannelsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/channels`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Markets, channels & locations"],
      }),
      postV1AdminChannels: build.mutation<
        PostV1AdminChannelsApiResponse,
        PostV1AdminChannelsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/channels`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Markets, channels & locations"],
      }),
      putV1AdminChannelsId: build.mutation<
        PutV1AdminChannelsIdApiResponse,
        PutV1AdminChannelsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/channels/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Markets, channels & locations"],
      }),
      getV1AdminLocations: build.query<
        GetV1AdminLocationsApiResponse,
        GetV1AdminLocationsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/locations`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Markets, channels & locations"],
      }),
      postV1AdminLocations: build.mutation<
        PostV1AdminLocationsApiResponse,
        PostV1AdminLocationsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/locations`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Markets, channels & locations"],
      }),
      putV1AdminLocationsId: build.mutation<
        PutV1AdminLocationsIdApiResponse,
        PutV1AdminLocationsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/locations/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Markets, channels & locations"],
      }),
      postV1AdminMediaUploadUrl: build.mutation<
        PostV1AdminMediaUploadUrlApiResponse,
        PostV1AdminMediaUploadUrlApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/media/upload-url`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Media"],
      }),
      postV1AdminMedia: build.mutation<
        PostV1AdminMediaApiResponse,
        PostV1AdminMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/media`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Media"],
      }),
      getV1AdminMedia: build.query<
        GetV1AdminMediaApiResponse,
        GetV1AdminMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/media`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            tag: queryArg.tag,
          },
        }),
        providesTags: ["Media"],
      }),
      patchV1AdminMediaId: build.mutation<
        PatchV1AdminMediaIdApiResponse,
        PatchV1AdminMediaIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/media/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Media"],
      }),
      deleteV1AdminMediaId: build.mutation<
        DeleteV1AdminMediaIdApiResponse,
        DeleteV1AdminMediaIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/media/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Media"],
      }),
      getV1AdminNotificationTemplates: build.query<
        GetV1AdminNotificationTemplatesApiResponse,
        GetV1AdminNotificationTemplatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/notification-templates`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Notifications"],
      }),
      postV1AdminNotificationTemplates: build.mutation<
        PostV1AdminNotificationTemplatesApiResponse,
        PostV1AdminNotificationTemplatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/notification-templates`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Notifications"],
      }),
      putV1AdminNotificationTemplatesId: build.mutation<
        PutV1AdminNotificationTemplatesIdApiResponse,
        PutV1AdminNotificationTemplatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/notification-templates/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Notifications"],
      }),
      postV1AdminNotificationTemplatesPreview: build.mutation<
        PostV1AdminNotificationTemplatesPreviewApiResponse,
        PostV1AdminNotificationTemplatesPreviewApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/notification-templates/preview`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Notifications"],
      }),
      postV1AdminNotificationTemplatesTestSend: build.mutation<
        PostV1AdminNotificationTemplatesTestSendApiResponse,
        PostV1AdminNotificationTemplatesTestSendApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/notification-templates/test-send`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Notifications"],
      }),
      getV1AdminOrders: build.query<
        GetV1AdminOrdersApiResponse,
        GetV1AdminOrdersApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
            status: queryArg.status,
            q: queryArg.q,
            customerId: queryArg.customerId,
            from: queryArg["from"],
            to: queryArg.to,
          },
        }),
        providesTags: ["Orders"],
      }),
      getV1AdminOrdersId: build.query<
        GetV1AdminOrdersIdApiResponse,
        GetV1AdminOrdersIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Orders"],
      }),
      postV1AdminOrdersIdMarkPaid: build.mutation<
        PostV1AdminOrdersIdMarkPaidApiResponse,
        PostV1AdminOrdersIdMarkPaidApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/mark-paid`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "Idempotency-Key": queryArg["Idempotency-Key"],
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdFulfillments: build.mutation<
        PostV1AdminOrdersIdFulfillmentsApiResponse,
        PostV1AdminOrdersIdFulfillmentsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/fulfillments`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "Idempotency-Key": queryArg["Idempotency-Key"],
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      patchV1AdminOrdersFulfillmentsId: build.mutation<
        PatchV1AdminOrdersFulfillmentsIdApiResponse,
        PatchV1AdminOrdersFulfillmentsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/fulfillments/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdRefunds: build.mutation<
        PostV1AdminOrdersIdRefundsApiResponse,
        PostV1AdminOrdersIdRefundsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/refunds`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "Idempotency-Key": queryArg["Idempotency-Key"],
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdCancel: build.mutation<
        PostV1AdminOrdersIdCancelApiResponse,
        PostV1AdminOrdersIdCancelApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/cancel`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdHold: build.mutation<
        PostV1AdminOrdersIdHoldApiResponse,
        PostV1AdminOrdersIdHoldApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/hold`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdRelease: build.mutation<
        PostV1AdminOrdersIdReleaseApiResponse,
        PostV1AdminOrdersIdReleaseApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/release`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdComplete: build.mutation<
        PostV1AdminOrdersIdCompleteApiResponse,
        PostV1AdminOrdersIdCompleteApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/complete`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      postV1AdminOrdersIdNotes: build.mutation<
        PostV1AdminOrdersIdNotesApiResponse,
        PostV1AdminOrdersIdNotesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/notes`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      putV1AdminOrdersIdTags: build.mutation<
        PutV1AdminOrdersIdTagsApiResponse,
        PutV1AdminOrdersIdTagsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/orders/${queryArg.id}/tags`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Orders"],
      }),
      getV1AdminPriceLists: build.query<
        GetV1AdminPriceListsApiResponse,
        GetV1AdminPriceListsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/price-lists`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Pricing"],
      }),
      postV1AdminPriceLists: build.mutation<
        PostV1AdminPriceListsApiResponse,
        PostV1AdminPriceListsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/price-lists`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Pricing"],
      }),
      putV1AdminPriceListsId: build.mutation<
        PutV1AdminPriceListsIdApiResponse,
        PutV1AdminPriceListsIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/price-lists/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Pricing"],
      }),
      putV1AdminVariantsIdPrices: build.mutation<
        PutV1AdminVariantsIdPricesApiResponse,
        PutV1AdminVariantsIdPricesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/variants/${queryArg.id}/prices`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Pricing"],
      }),
      getV1AdminSettings: build.query<
        GetV1AdminSettingsApiResponse,
        GetV1AdminSettingsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/settings`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Settings & flags"],
      }),
      putV1AdminSettingsKey: build.mutation<
        PutV1AdminSettingsKeyApiResponse,
        PutV1AdminSettingsKeyApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/settings/${queryArg.key}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Settings & flags"],
      }),
      deleteV1AdminSettingsKey: build.mutation<
        DeleteV1AdminSettingsKeyApiResponse,
        DeleteV1AdminSettingsKeyApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/settings/${queryArg.key}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            scope: queryArg.scope,
            scopeId: queryArg.scopeId,
          },
        }),
        invalidatesTags: ["Settings & flags"],
      }),
      getV1AdminSettingsExport: build.query<
        GetV1AdminSettingsExportApiResponse,
        GetV1AdminSettingsExportApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/settings-export`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Settings & flags"],
      }),
      postV1AdminSettingsImport: build.mutation<
        PostV1AdminSettingsImportApiResponse,
        PostV1AdminSettingsImportApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/settings-import`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Settings & flags"],
      }),
      getV1AdminFlags: build.query<
        GetV1AdminFlagsApiResponse,
        GetV1AdminFlagsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/flags`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Settings & flags"],
      }),
      putV1AdminFlagsKey: build.mutation<
        PutV1AdminFlagsKeyApiResponse,
        PutV1AdminFlagsKeyApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/flags/${queryArg.key}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Settings & flags"],
      }),
      getV1AdminShippingZones: build.query<
        GetV1AdminShippingZonesApiResponse,
        GetV1AdminShippingZonesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/zones`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Shipping"],
      }),
      postV1AdminShippingZones: build.mutation<
        PostV1AdminShippingZonesApiResponse,
        PostV1AdminShippingZonesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/zones`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Shipping"],
      }),
      putV1AdminShippingZonesId: build.mutation<
        PutV1AdminShippingZonesIdApiResponse,
        PutV1AdminShippingZonesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/zones/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Shipping"],
      }),
      deleteV1AdminShippingZonesId: build.mutation<
        DeleteV1AdminShippingZonesIdApiResponse,
        DeleteV1AdminShippingZonesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/zones/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Shipping"],
      }),
      postV1AdminShippingZonesIdRates: build.mutation<
        PostV1AdminShippingZonesIdRatesApiResponse,
        PostV1AdminShippingZonesIdRatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/zones/${queryArg.id}/rates`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Shipping"],
      }),
      putV1AdminShippingZonesZoneIdRatesId: build.mutation<
        PutV1AdminShippingZonesZoneIdRatesIdApiResponse,
        PutV1AdminShippingZonesZoneIdRatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/zones/${queryArg.zoneId}/rates/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Shipping"],
      }),
      deleteV1AdminShippingRatesId: build.mutation<
        DeleteV1AdminShippingRatesIdApiResponse,
        DeleteV1AdminShippingRatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/shipping/rates/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Shipping"],
      }),
      getV1AdminStaff: build.query<
        GetV1AdminStaffApiResponse,
        GetV1AdminStaffApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/staff`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
          params: {
            cursor: queryArg.cursor,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Staff & roles"],
      }),
      postV1AdminStaff: build.mutation<
        PostV1AdminStaffApiResponse,
        PostV1AdminStaffApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/staff`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      getV1AdminStaffId: build.query<
        GetV1AdminStaffIdApiResponse,
        GetV1AdminStaffIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/staff/${queryArg.id}`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Staff & roles"],
      }),
      patchV1AdminStaffId: build.mutation<
        PatchV1AdminStaffIdApiResponse,
        PatchV1AdminStaffIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/staff/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      postV1AdminStaffIdResetMfa: build.mutation<
        PostV1AdminStaffIdResetMfaApiResponse,
        PostV1AdminStaffIdResetMfaApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/staff/${queryArg.id}/reset-mfa`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      getV1AdminPermissions: build.query<
        GetV1AdminPermissionsApiResponse,
        GetV1AdminPermissionsApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/permissions`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Staff & roles"],
      }),
      getV1AdminRoles: build.query<
        GetV1AdminRolesApiResponse,
        GetV1AdminRolesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/roles`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Staff & roles"],
      }),
      postV1AdminRoles: build.mutation<
        PostV1AdminRolesApiResponse,
        PostV1AdminRolesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/roles`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      patchV1AdminRolesId: build.mutation<
        PatchV1AdminRolesIdApiResponse,
        PatchV1AdminRolesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/roles/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      deleteV1AdminRolesId: build.mutation<
        DeleteV1AdminRolesIdApiResponse,
        DeleteV1AdminRolesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/roles/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      getV1AdminApiKeys: build.query<
        GetV1AdminApiKeysApiResponse,
        GetV1AdminApiKeysApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/api-keys`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Staff & roles"],
      }),
      postV1AdminApiKeys: build.mutation<
        PostV1AdminApiKeysApiResponse,
        PostV1AdminApiKeysApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/api-keys`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      postV1AdminApiKeysIdRevoke: build.mutation<
        PostV1AdminApiKeysIdRevokeApiResponse,
        PostV1AdminApiKeysIdRevokeApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/api-keys/${queryArg.id}/revoke`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Staff & roles"],
      }),
      getV1AdminTaxClasses: build.query<
        GetV1AdminTaxClassesApiResponse,
        GetV1AdminTaxClassesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/classes`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Tax"],
      }),
      postV1AdminTaxClasses: build.mutation<
        PostV1AdminTaxClassesApiResponse,
        PostV1AdminTaxClassesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/classes`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Tax"],
      }),
      putV1AdminTaxClassesId: build.mutation<
        PutV1AdminTaxClassesIdApiResponse,
        PutV1AdminTaxClassesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/classes/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Tax"],
      }),
      getV1AdminTaxRates: build.query<
        GetV1AdminTaxRatesApiResponse,
        GetV1AdminTaxRatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/rates`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Tax"],
      }),
      postV1AdminTaxRates: build.mutation<
        PostV1AdminTaxRatesApiResponse,
        PostV1AdminTaxRatesApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/rates`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Tax"],
      }),
      putV1AdminTaxRatesId: build.mutation<
        PutV1AdminTaxRatesIdApiResponse,
        PutV1AdminTaxRatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/rates/${queryArg.id}`,
          method: "PUT",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Tax"],
      }),
      deleteV1AdminTaxRatesId: build.mutation<
        DeleteV1AdminTaxRatesIdApiResponse,
        DeleteV1AdminTaxRatesIdApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/tax/rates/${queryArg.id}`,
          method: "DELETE",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Tax"],
      }),
      postV1AdminAuthLogin: build.mutation<
        PostV1AdminAuthLoginApiResponse,
        PostV1AdminAuthLoginApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/login`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin auth"],
      }),
      postV1AdminAuthMfaVerify: build.mutation<
        PostV1AdminAuthMfaVerifyApiResponse,
        PostV1AdminAuthMfaVerifyApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/mfa/verify`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin auth"],
      }),
      postV1AdminAuthMfaEnroll: build.mutation<
        PostV1AdminAuthMfaEnrollApiResponse,
        PostV1AdminAuthMfaEnrollApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/mfa/enroll`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin auth"],
      }),
      postV1AdminAuthMfaEnrollConfirm: build.mutation<
        PostV1AdminAuthMfaEnrollConfirmApiResponse,
        PostV1AdminAuthMfaEnrollConfirmApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/mfa/enroll/confirm`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin auth"],
      }),
      postV1AdminAuthRefresh: build.mutation<
        PostV1AdminAuthRefreshApiResponse,
        PostV1AdminAuthRefreshApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/refresh`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin auth"],
      }),
      postV1AdminAuthLogout: build.mutation<
        PostV1AdminAuthLogoutApiResponse,
        PostV1AdminAuthLogoutApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/logout`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin auth"],
      }),
      getV1AdminAuthMe: build.query<
        GetV1AdminAuthMeApiResponse,
        GetV1AdminAuthMeApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/auth/me`,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        providesTags: ["Admin auth"],
      }),
      postV1AdminSessionLogin: build.mutation<
        PostV1AdminSessionLoginApiResponse,
        PostV1AdminSessionLoginApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/session/login`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin session"],
      }),
      postV1AdminSessionMfaVerify: build.mutation<
        PostV1AdminSessionMfaVerifyApiResponse,
        PostV1AdminSessionMfaVerifyApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/session/mfa/verify`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin session"],
      }),
      postV1AdminSessionMfaEnroll: build.mutation<
        PostV1AdminSessionMfaEnrollApiResponse,
        PostV1AdminSessionMfaEnrollApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/session/mfa/enroll`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin session"],
      }),
      postV1AdminSessionMfaEnrollConfirm: build.mutation<
        PostV1AdminSessionMfaEnrollConfirmApiResponse,
        PostV1AdminSessionMfaEnrollConfirmApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/session/mfa/enroll/confirm`,
          method: "POST",
          body: queryArg.body,
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin session"],
      }),
      postV1AdminSessionRefresh: build.mutation<
        PostV1AdminSessionRefreshApiResponse,
        PostV1AdminSessionRefreshApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/session/refresh`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin session"],
      }),
      postV1AdminSessionLogout: build.mutation<
        PostV1AdminSessionLogoutApiResponse,
        PostV1AdminSessionLogoutApiArg
      >({
        query: (queryArg) => ({
          url: `/v1/admin/session/logout`,
          method: "POST",
          headers: {
            "x-market": queryArg["x-market"],
            "x-locale": queryArg["x-locale"],
          },
        }),
        invalidatesTags: ["Admin session"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as adminApi };
export type GetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsApiResponse =
  unknown;
export type GetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsApiArg = {
  id: string;
  reveal?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramAffiliatesIdCouponCodesApiResponse =
  unknown;
export type PostV1AdminAffiliateProgramAffiliatesIdCouponCodesApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    promotionId: string;
    code: string;
    usageLimit?: number | null;
  };
};
export type GetV1AdminAffiliateProgramFraudFlagsApiResponse = unknown;
export type GetV1AdminAffiliateProgramFraudFlagsApiArg = {
  cursor?: string;
  limit?: number;
  status?: "OPEN" | "DISMISSED" | "CONFIRMED";
  affiliateId?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramAffiliatesIdFraudFlagsApiResponse =
  unknown;
export type PostV1AdminAffiliateProgramAffiliatesIdFraudFlagsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    kind: "COUPON_LEAK" | "OTHER";
    note: string;
    orderId?: string;
  };
};
export type PostV1AdminAffiliateProgramFraudFlagsIdResolveApiResponse = unknown;
export type PostV1AdminAffiliateProgramFraudFlagsIdResolveApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "DISMISSED" | "CONFIRMED";
    note?: string;
    suspend?: boolean;
  };
};
export type GetV1AdminAffiliateProgramPayoutBatchesApiResponse = unknown;
export type GetV1AdminAffiliateProgramPayoutBatchesApiArg = {
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramPayoutBatchesApiResponse = unknown;
export type PostV1AdminAffiliateProgramPayoutBatchesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    currency: string;
  };
};
export type GetV1AdminAffiliateProgramPayoutBatchesIdApiResponse = unknown;
export type GetV1AdminAffiliateProgramPayoutBatchesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramPayoutBatchesIdApproveApiResponse =
  unknown;
export type PostV1AdminAffiliateProgramPayoutBatchesIdApproveApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramPayoutBatchesIdPaidApiResponse = unknown;
export type PostV1AdminAffiliateProgramPayoutBatchesIdPaidApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    references: {
      [key: string]: string;
    };
  };
};
export type PostV1AdminAffiliateProgramPayoutBatchesIdCancelApiResponse =
  unknown;
export type PostV1AdminAffiliateProgramPayoutBatchesIdCancelApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminAffiliateProgramPayoutBatchesIdExportApiResponse =
  unknown;
export type GetV1AdminAffiliateProgramPayoutBatchesIdExportApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramPayoutsIdSendApiResponse = unknown;
export type PostV1AdminAffiliateProgramPayoutsIdSendApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    provider?: string;
  };
};
export type GetV1AdminAffiliateProgramAssetsApiResponse = unknown;
export type GetV1AdminAffiliateProgramAssetsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliateProgramAssetsApiResponse = unknown;
export type PostV1AdminAffiliateProgramAssetsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    title: string;
    kind: "banner" | "image" | "copy";
    mediaId?: string | null;
    body?: string | null;
    productId?: string | null;
    isActive?: boolean;
  };
};
export type PutV1AdminAffiliateProgramAssetsIdApiResponse = unknown;
export type PutV1AdminAffiliateProgramAssetsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    title: string;
    kind: "banner" | "image" | "copy";
    mediaId?: string | null;
    body?: string | null;
    productId?: string | null;
    isActive?: boolean;
  };
};
export type GetV1AdminAffiliateProgramAssetsAnalyticsApiResponse = unknown;
export type GetV1AdminAffiliateProgramAssetsAnalyticsApiArg = {
  from?: string;
  to?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminApprovalsApiResponse = unknown;
export type GetV1AdminApprovalsApiArg = {
  cursor?: string;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminApprovalsIdDecisionApiResponse = unknown;
export type PostV1AdminApprovalsIdDecisionApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    decision: "APPROVED" | "REJECTED";
    note?: string;
  };
};
export type GetV1AdminDashboardApiResponse = unknown;
export type GetV1AdminDashboardApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminDashboardStreamApiResponse = unknown;
export type GetV1AdminDashboardStreamApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminExperimentsApiResponse = unknown;
export type GetV1AdminExperimentsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminExperimentsApiResponse = unknown;
export type PostV1AdminExperimentsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    key: string;
    name: string;
    variants: {
      key: string;
      weight: number;
    }[];
    trafficPercent?: number;
  };
};
export type PutV1AdminExperimentsIdApiResponse = unknown;
export type PutV1AdminExperimentsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    key: string;
    name: string;
    variants: {
      key: string;
      weight: number;
    }[];
    trafficPercent?: number;
    version: number;
  };
};
export type PostV1AdminExperimentsIdStatusApiResponse = unknown;
export type PostV1AdminExperimentsIdStatusApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "RUNNING" | "STOPPED";
  };
};
export type GetV1AdminExperimentsIdResultsApiResponse = unknown;
export type GetV1AdminExperimentsIdResultsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminProductsIdRelationsApiResponse = unknown;
export type PutV1AdminProductsIdRelationsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    kind: "RELATED" | "COMPLETE_THE_LOOK" | "UPSELL";
    relatedIds: string[];
  };
};
export type GetV1AdminReportBuilderCatalogApiResponse = unknown;
export type GetV1AdminReportBuilderCatalogApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminReportBuilderRunApiResponse = unknown;
export type PostV1AdminReportBuilderRunApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    definition: {
      source: "orders" | "order_lines" | "customers";
      dimensions?: string[];
      metrics: string[];
      filters?: {
        field: string;
        op: "eq" | "in";
        value: string | string[];
      }[];
      lastDays?: number;
      sort?: {
        by: string;
        dir?: "asc" | "desc";
      };
      limit?: number;
    };
    from?: string;
    to?: string;
    format?: "json" | "csv";
  };
};
export type GetV1AdminReportBuilderReportsApiResponse = unknown;
export type GetV1AdminReportBuilderReportsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminReportBuilderReportsApiResponse = unknown;
export type PostV1AdminReportBuilderReportsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    definition: any;
    schedule?: ("daily" | "weekly") | null;
    recipients?: string[];
  };
};
export type PutV1AdminReportBuilderReportsIdApiResponse = unknown;
export type PutV1AdminReportBuilderReportsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    definition: any;
    schedule?: ("daily" | "weekly") | null;
    recipients?: string[];
  };
};
export type DeleteV1AdminReportBuilderReportsIdApiResponse = unknown;
export type DeleteV1AdminReportBuilderReportsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportBuilderReportsIdRunApiResponse = unknown;
export type GetV1AdminReportBuilderReportsIdRunApiArg = {
  id: string;
  from?: string;
  to?: string;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportBuilderFunnelApiResponse = unknown;
export type GetV1AdminReportBuilderFunnelApiArg = {
  from?: string;
  to?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminSearchSynonymsApiResponse = unknown;
export type GetV1AdminSearchSynonymsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminSearchSynonymsApiResponse = unknown;
export type PostV1AdminSearchSynonymsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    terms: string[];
  };
};
export type DeleteV1AdminSearchSynonymsIdApiResponse = unknown;
export type DeleteV1AdminSearchSynonymsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminSearchRedirectsApiResponse = unknown;
export type GetV1AdminSearchRedirectsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminSearchRedirectsApiResponse = unknown;
export type PutV1AdminSearchRedirectsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    query: string;
    target: string;
  };
};
export type DeleteV1AdminSearchRedirectsIdApiResponse = unknown;
export type DeleteV1AdminSearchRedirectsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminSearchRulesApiResponse = unknown;
export type GetV1AdminSearchRulesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminSearchRulesApiResponse = unknown;
export type PutV1AdminSearchRulesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    query: string;
    pinnedIds?: string[];
    boostedIds?: string[];
    hiddenIds?: string[];
  };
};
export type DeleteV1AdminSearchRulesIdApiResponse = unknown;
export type DeleteV1AdminSearchRulesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminWebhooksEventsApiResponse = unknown;
export type GetV1AdminWebhooksEventsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminWebhooksApiResponse = unknown;
export type GetV1AdminWebhooksApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminWebhooksApiResponse = unknown;
export type PostV1AdminWebhooksApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    url: string;
    events: string[];
    description?: string;
  };
};
export type PatchV1AdminWebhooksIdApiResponse = unknown;
export type PatchV1AdminWebhooksIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    url?: string;
    events?: string[];
    description?: string | null;
    isActive?: boolean;
  };
};
export type DeleteV1AdminWebhooksIdApiResponse = unknown;
export type DeleteV1AdminWebhooksIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminWebhooksIdRotateSecretApiResponse = unknown;
export type PostV1AdminWebhooksIdRotateSecretApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminWebhooksIdPingApiResponse = unknown;
export type PostV1AdminWebhooksIdPingApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminWebhooksIdDeliveriesApiResponse = unknown;
export type GetV1AdminWebhooksIdDeliveriesApiArg = {
  id: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminWebhooksDeliveriesIdReplayApiResponse = unknown;
export type PostV1AdminWebhooksDeliveriesIdReplayApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminWorkflowsTriggersApiResponse = unknown;
export type GetV1AdminWorkflowsTriggersApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminWorkflowsApiResponse = unknown;
export type GetV1AdminWorkflowsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminWorkflowsApiResponse = unknown;
export type PostV1AdminWorkflowsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    trigger: string;
    conditions?: any;
    actions: any;
    isActive?: boolean;
  };
};
export type PutV1AdminWorkflowsIdApiResponse = unknown;
export type PutV1AdminWorkflowsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    trigger: string;
    conditions?: any;
    actions: any;
    isActive?: boolean;
    version: number;
  };
};
export type DeleteV1AdminWorkflowsIdApiResponse = unknown;
export type DeleteV1AdminWorkflowsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminWorkflowsIdRunsApiResponse = unknown;
export type GetV1AdminWorkflowsIdRunsApiArg = {
  id: string;
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminWorkflowsTestApiResponse = unknown;
export type PostV1AdminWorkflowsTestApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    trigger: string;
    conditions?: any;
    data: {
      [key: string]: any;
    };
  };
};
export type GetV1AdminAffiliatesApiResponse = unknown;
export type GetV1AdminAffiliatesApiArg = {
  cursor?: string;
  limit?: number;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "CLOSED";
  tierId?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminAffiliatesIdApiResponse = unknown;
export type GetV1AdminAffiliatesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminAffiliatesIdApiResponse = unknown;
export type PatchV1AdminAffiliatesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    version: number;
    tierId?: string | null;
    notes?: string | null;
    customFields?: {
      [key: string]: any;
    };
  };
};
export type PostV1AdminAffiliatesIdStatusApiResponse = unknown;
export type PostV1AdminAffiliatesIdStatusApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "CLOSED";
    reason?: string;
  };
};
export type PatchV1AdminAffiliatesLinksIdApiResponse = unknown;
export type PatchV1AdminAffiliatesLinksIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "ACTIVE" | "DISABLED";
  };
};
export type GetV1AdminAffiliatesIdEarningsApiResponse = unknown;
export type GetV1AdminAffiliatesIdEarningsApiArg = {
  id: string;
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliatesIdAdjustmentsApiResponse = unknown;
export type PostV1AdminAffiliatesIdAdjustmentsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    amountMinor: number;
    currency: string;
    reason: string;
  };
};
export type GetV1AdminAffiliatesIdPayoutsApiResponse = unknown;
export type GetV1AdminAffiliatesIdPayoutsApiArg = {
  id: string;
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliatesIdPayoutsApiResponse = unknown;
export type PostV1AdminAffiliatesIdPayoutsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    method?: "bank" | "mobile_wallet" | "manual";
  };
};
export type PostV1AdminAffiliatesPayoutsIdApproveApiResponse = unknown;
export type PostV1AdminAffiliatesPayoutsIdApproveApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliatesPayoutsIdPaidApiResponse = unknown;
export type PostV1AdminAffiliatesPayoutsIdPaidApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    reference: string;
  };
};
export type PostV1AdminAffiliatesPayoutsIdCancelApiResponse = unknown;
export type PostV1AdminAffiliatesPayoutsIdCancelApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminAffiliatesConfigTiersApiResponse = unknown;
export type GetV1AdminAffiliatesConfigTiersApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliatesConfigTiersApiResponse = unknown;
export type PostV1AdminAffiliatesConfigTiersApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    rewardType: "CASH" | "STORE_CREDIT";
    autoApprove?: boolean;
    isDefault?: boolean;
    position?: number;
    minSalesMinor?: number | null;
  };
};
export type PutV1AdminAffiliatesConfigTiersIdApiResponse = unknown;
export type PutV1AdminAffiliatesConfigTiersIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    rewardType: "CASH" | "STORE_CREDIT";
    autoApprove?: boolean;
    isDefault?: boolean;
    position?: number;
    minSalesMinor?: number | null;
  };
};
export type GetV1AdminAffiliatesConfigRulesApiResponse = unknown;
export type GetV1AdminAffiliatesConfigRulesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAffiliatesConfigRulesApiResponse = unknown;
export type PostV1AdminAffiliatesConfigRulesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    scope:
      | "affiliate_product"
      | "product"
      | "category"
      | "affiliate"
      | "tier"
      | "program";
    scopeId?: string;
    rule: {
      type: "percent" | "fixed_per_item" | "fixed_per_order" | "tiered";
      percent?: number;
      amountMinor?: number;
      tiers?: {
        minSalesMinor: number;
        percent: number;
      }[];
      appliesTo?: "all" | "first_order" | "returning";
    };
    priority?: number;
    isActive?: boolean;
    activeFrom?: string | null;
    activeTo?: string | null;
  };
};
export type PutV1AdminAffiliatesConfigRulesIdApiResponse = unknown;
export type PutV1AdminAffiliatesConfigRulesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    scope:
      | "affiliate_product"
      | "product"
      | "category"
      | "affiliate"
      | "tier"
      | "program";
    scopeId?: string;
    rule: {
      type: "percent" | "fixed_per_item" | "fixed_per_order" | "tiered";
      percent?: number;
      amountMinor?: number;
      tiers?: {
        minSalesMinor: number;
        percent: number;
      }[];
      appliesTo?: "all" | "first_order" | "returning";
    };
    priority?: number;
    isActive?: boolean;
    activeFrom?: string | null;
    activeTo?: string | null;
  };
};
export type PutV1AdminOrdersIdAttributionApiResponse = /** status 200 OK */ {
  ok: true;
};
export type PutV1AdminOrdersIdAttributionApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    affiliateId: string | null;
    reason: string;
  };
};
export type GetV1AdminBlocksApiResponse = unknown;
export type GetV1AdminBlocksApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminPagesApiResponse = unknown;
export type GetV1AdminPagesApiArg = {
  cursor?: string;
  limit?: number;
  kind?: "PAGE" | "SECTION";
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminPagesApiResponse = unknown;
export type PostV1AdminPagesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    title: string;
    kind?: "PAGE" | "SECTION";
    blocks: Recursive1[];
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    publishAt?: string | null;
  };
};
export type GetV1AdminPagesIdApiResponse = unknown;
export type GetV1AdminPagesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminPagesIdApiResponse = unknown;
export type PutV1AdminPagesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    title: string;
    kind?: "PAGE" | "SECTION";
    blocks: Recursive1[];
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    publishAt?: string | null;
    version: number;
  };
};
export type PostV1AdminPagesIdPublishApiResponse = unknown;
export type PostV1AdminPagesIdPublishApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    note?: string;
  };
};
export type PostV1AdminPagesIdUnpublishApiResponse = unknown;
export type PostV1AdminPagesIdUnpublishApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status?: "DRAFT" | "ARCHIVED";
  };
};
export type GetV1AdminPagesIdVersionsApiResponse = unknown;
export type GetV1AdminPagesIdVersionsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminPagesIdRollbackApiResponse = unknown;
export type PostV1AdminPagesIdRollbackApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    versionId: string;
  };
};
export type PostV1AdminPagesIdPreviewLinkApiResponse = /** status 200 OK */ {
  token: string;
  handle: string;
  expiresAt: string;
};
export type PostV1AdminPagesIdPreviewLinkApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    hours?: number;
  };
};
export type GetV1AdminCustomersIdExportApiResponse = unknown;
export type GetV1AdminCustomersIdExportApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminCustomersIdAnonymizeApiResponse = /** status 200 OK */ {
  ok: true;
};
export type PostV1AdminCustomersIdAnonymizeApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    reason: string;
  };
};
export type GetV1AdminCustomersIdStoreCreditApiResponse = unknown;
export type GetV1AdminCustomersIdStoreCreditApiArg = {
  id: string;
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminCustomersIdStoreCreditApiResponse = unknown;
export type PostV1AdminCustomersIdStoreCreditApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    amountMinor: number;
    currency: string;
    note: string;
    expiresAt?: string | null;
  };
};
export type GetV1AdminImportsColumnsApiResponse = unknown;
export type GetV1AdminImportsColumnsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminImportsApiResponse = unknown;
export type PostV1AdminImportsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    format: "csv" | "json";
    content: string;
    mapping?: {
      [key: string]:
        | "handle"
        | "title"
        | "description"
        | "vendor"
        | "tags"
        | "status"
        | "option1_name"
        | "option1_value"
        | "option2_name"
        | "option2_value"
        | "option3_name"
        | "option3_value"
        | "sku"
        | "price"
        | "compare_at_price"
        | "cost"
        | "weight_grams"
        | "barcode"
        | "stock"
        | "categories";
    };
    dryRun?: boolean;
  };
};
export type PostV1AdminExportsApiResponse = unknown;
export type PostV1AdminExportsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    format?: "csv" | "json";
  };
};
export type GetV1AdminDataJobsApiResponse = unknown;
export type GetV1AdminDataJobsApiArg = {
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminDataJobsIdApiResponse = unknown;
export type GetV1AdminDataJobsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminDataJobsIdDownloadApiResponse = unknown;
export type GetV1AdminDataJobsIdDownloadApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminPromotionsApiResponse = unknown;
export type GetV1AdminPromotionsApiArg = {
  cursor?: string;
  limit?: number;
  type?: "AUTOMATIC" | "CODE";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  q?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminPromotionsApiResponse = unknown;
export type PostV1AdminPromotionsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    description?: string | null;
    type: "AUTOMATIC" | "CODE";
    priority?: number;
    stopFurther?: boolean;
    exclusivityGroup?: string | null;
    combinesWithSalePrices?: boolean;
    conditions?: {} | Recursive2;
    actions: (
      | {
          type: "percent_off";
          percent: number;
          target: "order" | "items" | "cheapest" | "most_expensive";
          filter?: {
            productIds?: string[];
            variantIds?: string[];
            collectionIds?: string[];
            categoryIds?: string[];
            tags?: string[];
            vendors?: string[];
          };
        }
      | {
          type: "fixed_off";
          amountMinor: number;
          target: "order" | "items" | "cheapest" | "most_expensive";
          filter?: {
            productIds?: string[];
            variantIds?: string[];
            collectionIds?: string[];
            categoryIds?: string[];
            tags?: string[];
            vendors?: string[];
          };
          perItem?: boolean;
        }
      | {
          type: "bogo";
          buy: {
            quantity: number;
            filter?: {
              productIds?: string[];
              variantIds?: string[];
              collectionIds?: string[];
              categoryIds?: string[];
              tags?: string[];
              vendors?: string[];
            };
          };
          get: {
            quantity: number;
            filter?: {
              productIds?: string[];
              variantIds?: string[];
              collectionIds?: string[];
              categoryIds?: string[];
              tags?: string[];
              vendors?: string[];
            };
            percent?: number;
          };
          maxApplications?: number;
        }
      | {
          type: "tiered";
          basis: "subtotal" | "quantity";
          filter?: {
            productIds?: string[];
            variantIds?: string[];
            collectionIds?: string[];
            categoryIds?: string[];
            tags?: string[];
            vendors?: string[];
          };
          tiers: {
            threshold: number;
            percent?: number;
            amountMinor?: number;
          }[];
        }
      | {
          type: "free_shipping";
          rateIds?: string[];
          maxShippingMinor?: number;
        }
    )[];
    startsAt?: string | null;
    endsAt?: string | null;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    maxDiscountMinor?: number | null;
    codes?: string[];
  };
};
export type GetV1AdminPromotionsIdApiResponse = unknown;
export type GetV1AdminPromotionsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminPromotionsIdApiResponse = unknown;
export type PatchV1AdminPromotionsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name?: string;
    description?: string | null;
    type?: "AUTOMATIC" | "CODE";
    priority?: number;
    stopFurther?: boolean;
    exclusivityGroup?: string | null;
    combinesWithSalePrices?: boolean;
    conditions?: {} | Recursive2;
    actions?: (
      | {
          type: "percent_off";
          percent: number;
          target: "order" | "items" | "cheapest" | "most_expensive";
          filter?: {
            productIds?: string[];
            variantIds?: string[];
            collectionIds?: string[];
            categoryIds?: string[];
            tags?: string[];
            vendors?: string[];
          };
        }
      | {
          type: "fixed_off";
          amountMinor: number;
          target: "order" | "items" | "cheapest" | "most_expensive";
          filter?: {
            productIds?: string[];
            variantIds?: string[];
            collectionIds?: string[];
            categoryIds?: string[];
            tags?: string[];
            vendors?: string[];
          };
          perItem?: boolean;
        }
      | {
          type: "bogo";
          buy: {
            quantity: number;
            filter?: {
              productIds?: string[];
              variantIds?: string[];
              collectionIds?: string[];
              categoryIds?: string[];
              tags?: string[];
              vendors?: string[];
            };
          };
          get: {
            quantity: number;
            filter?: {
              productIds?: string[];
              variantIds?: string[];
              collectionIds?: string[];
              categoryIds?: string[];
              tags?: string[];
              vendors?: string[];
            };
            percent?: number;
          };
          maxApplications?: number;
        }
      | {
          type: "tiered";
          basis: "subtotal" | "quantity";
          filter?: {
            productIds?: string[];
            variantIds?: string[];
            collectionIds?: string[];
            categoryIds?: string[];
            tags?: string[];
            vendors?: string[];
          };
          tiers: {
            threshold: number;
            percent?: number;
            amountMinor?: number;
          }[];
        }
      | {
          type: "free_shipping";
          rateIds?: string[];
          maxShippingMinor?: number;
        }
    )[];
    startsAt?: string | null;
    endsAt?: string | null;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    maxDiscountMinor?: number | null;
    version: number;
  };
};
export type PostV1AdminPromotionsIdStatusApiResponse = unknown;
export type PostV1AdminPromotionsIdStatusApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
};
export type GetV1AdminPromotionsIdCodesApiResponse = unknown;
export type GetV1AdminPromotionsIdCodesApiArg = {
  id: string;
  cursor?: string;
  limit?: number;
  q?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminPromotionsIdCodesApiResponse = unknown;
export type PostV1AdminPromotionsIdCodesApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    codes?: string[];
    generate?: {
      count: number;
      prefix?: string;
      length?: number;
    };
    usageLimit?: number | null;
  };
};
export type PatchV1AdminPromotionsCodesIdApiResponse = unknown;
export type PatchV1AdminPromotionsCodesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    isActive: boolean;
  };
};
export type PostV1AdminPromotionsSimulateApiResponse = unknown;
export type PostV1AdminPromotionsSimulateApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    currency?: string;
    lines: {
      variantId: string;
      quantity: number;
      unitPriceMinor: number;
      compareAtMinor?: number | null;
    }[];
    codes?: string[];
    customerId?: string | null;
    country?: string | null;
    shippingRateId?: string | null;
    shippingMinor?: number;
    referral?: any;
    promotionIds?: string[];
  };
};
export type GetV1AdminPromotionsIdPerformanceApiResponse = unknown;
export type GetV1AdminPromotionsIdPerformanceApiArg = {
  id: string;
  from?: string;
  to?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportsSalesApiResponse = unknown;
export type GetV1AdminReportsSalesApiArg = {
  from?: string;
  to?: string;
  currency?: string;
  interval?: "day" | "week" | "month";
  limit?: number;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportsProductsApiResponse = unknown;
export type GetV1AdminReportsProductsApiArg = {
  from?: string;
  to?: string;
  currency?: string;
  interval?: "day" | "week" | "month";
  limit?: number;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportsCustomersApiResponse = unknown;
export type GetV1AdminReportsCustomersApiArg = {
  from?: string;
  to?: string;
  currency?: string;
  interval?: "day" | "week" | "month";
  limit?: number;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportsPromotionsApiResponse = unknown;
export type GetV1AdminReportsPromotionsApiArg = {
  from?: string;
  to?: string;
  currency?: string;
  interval?: "day" | "week" | "month";
  limit?: number;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportsSearchApiResponse = unknown;
export type GetV1AdminReportsSearchApiArg = {
  from?: string;
  to?: string;
  currency?: string;
  interval?: "day" | "week" | "month";
  limit?: number;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReportsAffiliatesApiResponse = unknown;
export type GetV1AdminReportsAffiliatesApiArg = {
  from?: string;
  to?: string;
  currency?: string;
  interval?: "day" | "week" | "month";
  limit?: number;
  format?: "json" | "csv";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReturnsApiResponse = unknown;
export type GetV1AdminReturnsApiArg = {
  cursor?: string;
  limit?: number;
  status?:
    | "REQUESTED"
    | "APPROVED"
    | "REJECTED"
    | "LABEL_ISSUED"
    | "IN_TRANSIT"
    | "RECEIVED"
    | "INSPECTED"
    | "COMPLETED"
    | "PARTIALLY_ACCEPTED";
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminReturnsIdApiResponse = unknown;
export type GetV1AdminReturnsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminReturnsIdDecisionApiResponse = unknown;
export type PostV1AdminReturnsIdDecisionApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "APPROVED" | "REJECTED";
    note?: string;
  };
};
export type PostV1AdminReturnsIdShippingApiResponse = unknown;
export type PostV1AdminReturnsIdShippingApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "LABEL_ISSUED" | "IN_TRANSIT" | "RECEIVED";
    carrier?: string;
    trackingNumber?: string;
    labelUrl?: string;
  };
};
export type PostV1AdminReturnsIdInspectionApiResponse = unknown;
export type PostV1AdminReturnsIdInspectionApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    lines: {
      lineId: string;
      result: "RESTOCK" | "WRITE_OFF" | "REJECT";
      acceptedQuantity: number;
    }[];
  };
};
export type PostV1AdminReturnsIdCompleteApiResponse = unknown;
export type PostV1AdminReturnsIdCompleteApiArg = {
  id: string;
  "Idempotency-Key": string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    reference?: string;
  };
};
export type GetV1AdminModerationApiResponse = unknown;
export type GetV1AdminModerationApiArg = {
  cursor?: string;
  limit?: number;
  kind?: "reviews" | "questions";
  status?: "PENDING" | "APPROVED" | "REJECTED";
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminModerationReviewsIdApiResponse = unknown;
export type PatchV1AdminModerationReviewsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status?: "APPROVED" | "REJECTED";
    reply?: string | null;
  };
};
export type PatchV1AdminModerationQuestionsIdApiResponse = unknown;
export type PatchV1AdminModerationQuestionsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status?: "APPROVED" | "REJECTED";
    answer?: string;
  };
};
export type GetV1AdminSegmentsApiResponse = unknown;
export type GetV1AdminSegmentsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminSegmentsApiResponse = unknown;
export type PostV1AdminSegmentsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    rules: {
      match?: "all" | "any";
      conditions: (
        | {
            field:
              | "total_spent"
              | "order_count"
              | "last_order_days"
              | "created_days";
            op: "gt" | "gte" | "lt" | "lte" | "eq";
            value: number;
          }
        | {
            field: "tag";
            op: "has" | "not_has";
            value: string;
          }
        | {
            field: "group";
            op: "eq" | "neq";
            value: string;
          }
        | {
            field: "accepts_marketing";
            op: "eq";
            value: boolean;
          }
        | {
            field: "has_account";
            op: "eq";
            value: boolean;
          }
        | {
            field: "country";
            op: "in" | "not_in";
            value: string[];
          }
        | {
            field: "custom_field";
            key: string;
            op: "eq" | "neq";
            value: string | number | boolean;
          }
      )[];
    };
  };
};
export type PostV1AdminSegmentsPreviewApiResponse = unknown;
export type PostV1AdminSegmentsPreviewApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    rules: {
      match?: "all" | "any";
      conditions: (
        | {
            field:
              | "total_spent"
              | "order_count"
              | "last_order_days"
              | "created_days";
            op: "gt" | "gte" | "lt" | "lte" | "eq";
            value: number;
          }
        | {
            field: "tag";
            op: "has" | "not_has";
            value: string;
          }
        | {
            field: "group";
            op: "eq" | "neq";
            value: string;
          }
        | {
            field: "accepts_marketing";
            op: "eq";
            value: boolean;
          }
        | {
            field: "has_account";
            op: "eq";
            value: boolean;
          }
        | {
            field: "country";
            op: "in" | "not_in";
            value: string[];
          }
        | {
            field: "custom_field";
            key: string;
            op: "eq" | "neq";
            value: string | number | boolean;
          }
      )[];
    };
  };
};
export type PutV1AdminSegmentsIdApiResponse = unknown;
export type PutV1AdminSegmentsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    rules: {
      match?: "all" | "any";
      conditions: (
        | {
            field:
              | "total_spent"
              | "order_count"
              | "last_order_days"
              | "created_days";
            op: "gt" | "gte" | "lt" | "lte" | "eq";
            value: number;
          }
        | {
            field: "tag";
            op: "has" | "not_has";
            value: string;
          }
        | {
            field: "group";
            op: "eq" | "neq";
            value: string;
          }
        | {
            field: "accepts_marketing";
            op: "eq";
            value: boolean;
          }
        | {
            field: "has_account";
            op: "eq";
            value: boolean;
          }
        | {
            field: "country";
            op: "in" | "not_in";
            value: string[];
          }
        | {
            field: "custom_field";
            key: string;
            op: "eq" | "neq";
            value: string | number | boolean;
          }
      )[];
    };
    version: number;
  };
};
export type DeleteV1AdminSegmentsIdApiResponse = unknown;
export type DeleteV1AdminSegmentsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminSegmentsIdRefreshApiResponse = unknown;
export type PostV1AdminSegmentsIdRefreshApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminThemesApiResponse = unknown;
export type GetV1AdminThemesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminThemesApiResponse = unknown;
export type PostV1AdminThemesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    tokens: {
      colors: {
        background: string;
        foreground: string;
        primary: string;
        primaryForeground: string;
        secondary: string;
        secondaryForeground: string;
        muted: string;
        mutedForeground: string;
        accent: string;
        accentForeground: string;
        border: string;
        destructive: string;
      };
      dark?: {
        colors: {
          background?: string;
          foreground?: string;
          primary?: string;
          primaryForeground?: string;
          secondary?: string;
          secondaryForeground?: string;
          muted?: string;
          mutedForeground?: string;
          accent?: string;
          accentForeground?: string;
          border?: string;
          destructive?: string;
        };
      };
      typography: {
        fontBody: string;
        fontHeading: string;
        baseSizePx?: number;
        scale?: number;
      };
      radius: {
        sm: number;
        md: number;
        lg: number;
      };
      spacing: {
        unitPx?: number;
      };
      shadows?: {
        [key: string]: string;
      };
      buttons?: {
        radius?: "none" | "sm" | "md" | "lg" | "full";
        uppercase?: boolean;
      };
    };
    customCss?: string | null;
    logoMediaId?: string | null;
    faviconMediaId?: string | null;
    socialImageMediaId?: string | null;
  };
};
export type GetV1AdminThemesIdApiResponse = unknown;
export type GetV1AdminThemesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminThemesIdApiResponse = unknown;
export type PutV1AdminThemesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    tokens: {
      colors: {
        background: string;
        foreground: string;
        primary: string;
        primaryForeground: string;
        secondary: string;
        secondaryForeground: string;
        muted: string;
        mutedForeground: string;
        accent: string;
        accentForeground: string;
        border: string;
        destructive: string;
      };
      dark?: {
        colors: {
          background?: string;
          foreground?: string;
          primary?: string;
          primaryForeground?: string;
          secondary?: string;
          secondaryForeground?: string;
          muted?: string;
          mutedForeground?: string;
          accent?: string;
          accentForeground?: string;
          border?: string;
          destructive?: string;
        };
      };
      typography: {
        fontBody: string;
        fontHeading: string;
        baseSizePx?: number;
        scale?: number;
      };
      radius: {
        sm: number;
        md: number;
        lg: number;
      };
      spacing: {
        unitPx?: number;
      };
      shadows?: {
        [key: string]: string;
      };
      buttons?: {
        radius?: "none" | "sm" | "md" | "lg" | "full";
        uppercase?: boolean;
      };
    };
    customCss?: string | null;
    logoMediaId?: string | null;
    faviconMediaId?: string | null;
    socialImageMediaId?: string | null;
    version: number;
  };
};
export type PostV1AdminThemesIdActivateApiResponse = unknown;
export type PostV1AdminThemesIdActivateApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    channelId: string;
  };
};
export type PostV1AdminThemesIdPreviewLinkApiResponse = unknown;
export type PostV1AdminThemesIdPreviewLinkApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    hours?: number;
  };
};
export type GetV1AdminAuditApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    actor: {
      type: string;
      id?: string | null;
    };
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    before?: any;
    after?: any;
    reason?: string | null;
    correlationId?: string | null;
    occurredAt: string;
  }[];
  nextBefore: string | null;
};
export type GetV1AdminAuditApiArg = {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  before?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminProductsApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    handle: string;
    title: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    vendor: string | null;
    publishAt: string | null;
    createdAt: string;
    updatedAt: string;
    variantCount: number;
    image: {
      url: string;
      alt: string | null;
    } | null;
  }[];
  nextCursor: string | null;
};
export type GetV1AdminProductsApiArg = {
  cursor?: string;
  limit?: number;
  q?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId?: string;
  vendor?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminProductsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type PostV1AdminProductsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle?: string;
    title: string;
    description?: any;
    vendor?: string | null;
    tags?: string[];
    productTypeId?: string | null;
    taxClassId?: string | null;
    options?: {
      name: string;
      values: string[];
    }[];
    attributes?: {
      [key: string]: any;
    };
    customFields?: {
      [key: string]: any;
    };
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    oversellPolicy?: "DENY" | "BACKORDER" | "PREORDER";
    lowStockThreshold?: number | null;
    publishAt?: string | null;
    channelIds?: string[];
    categoryIds?: string[];
    variants?: {
      sku: string;
      title?: string;
      optionValues?: {
        [key: string]: string;
      };
      barcode?: string | null;
      costMinor?: number | null;
      weightGrams?: number | null;
      position?: number;
      customFields?: {
        [key: string]: any;
      };
      prices?: {
        priceListId: string;
        amountMinor: number;
        compareAtMinor?: number | null;
        minQty?: number;
      }[];
      initialStock?: number;
    }[];
  };
};
export type GetV1AdminProductsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type GetV1AdminProductsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminProductsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type PatchV1AdminProductsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    version: number;
    handle?: string;
    title?: string;
    description?: any;
    vendor?: string | null;
    tags?: string[];
    productTypeId?: string | null;
    taxClassId?: string | null;
    options?: {
      name: string;
      values: string[];
    }[];
    attributes?: {
      [key: string]: any;
    };
    customFields?: {
      [key: string]: any;
    };
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    oversellPolicy?: "DENY" | "BACKORDER" | "PREORDER";
    lowStockThreshold?: number | null;
    publishAt?: string | null;
    channelIds?: string[];
    categoryIds?: string[];
  };
};
export type PostV1AdminProductsIdStatusApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type PostV1AdminProductsIdStatusApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
};
export type PostV1AdminProductsIdVariantsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type PostV1AdminProductsIdVariantsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    sku: string;
    title?: string;
    optionValues?: {
      [key: string]: string;
    };
    barcode?: string | null;
    costMinor?: number | null;
    weightGrams?: number | null;
    position?: number;
    customFields?: {
      [key: string]: any;
    };
    prices?: {
      priceListId: string;
      amountMinor: number;
      compareAtMinor?: number | null;
      minQty?: number;
    }[];
    initialStock?: number;
  };
};
export type PostV1AdminProductsIdVariantsGenerateApiResponse =
  /** status 201 OK */ {
    id: string;
    handle: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    title: string;
    description: any;
    vendor: string | null;
    tags: string[];
    productTypeId: string | null;
    taxClassId: string | null;
    options: any;
    attributes: any;
    customFields: any;
    seo: any;
    oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
    lowStockThreshold: number | null;
    publishAt: string | null;
    publishedAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    variants: {
      id: string;
      sku: string;
      title: string;
      optionValues: any;
      barcode: string | null;
      costMinor: number | null;
      weightGrams: number | null;
      position: number;
      customFields: any;
      version: number;
      prices: {
        priceListId: string;
        currency: string;
        amountMinor: number;
        compareAtMinor: number | null;
        minQty: number;
      }[];
      inventory: {
        locationId: string;
        onHand: number;
        reserved: number;
        available: number;
      }[];
    }[];
    media: {
      position: number;
      variantIds: string[];
      media: {
        id: string;
        url: string;
        alt: string | null;
        width: number | null;
        height: number | null;
        mimeType: string;
      };
    }[];
    categories: {
      categoryId: string;
      position: number;
    }[];
    channels: {
      channelId: string;
    }[];
  };
export type PostV1AdminProductsIdVariantsGenerateApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    skuPrefix: string;
    prices?: {
      priceListId: string;
      amountMinor: number;
      compareAtMinor?: number | null;
      minQty?: number;
    }[];
  };
};
export type PatchV1AdminVariantsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type PatchV1AdminVariantsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    version: number;
    sku?: string;
    title?: string;
    optionValues?: {
      [key: string]: string;
    };
    barcode?: string | null;
    costMinor?: number | null;
    weightGrams?: number | null;
    position?: number;
    customFields?: {
      [key: string]: any;
    };
  };
};
export type DeleteV1AdminVariantsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type DeleteV1AdminVariantsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminProductsIdMediaApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  title: string;
  description: any;
  vendor: string | null;
  tags: string[];
  productTypeId: string | null;
  taxClassId: string | null;
  options: any;
  attributes: any;
  customFields: any;
  seo: any;
  oversellPolicy: "DENY" | "BACKORDER" | "PREORDER";
  lowStockThreshold: number | null;
  publishAt: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    sku: string;
    title: string;
    optionValues: any;
    barcode: string | null;
    costMinor: number | null;
    weightGrams: number | null;
    position: number;
    customFields: any;
    version: number;
    prices: {
      priceListId: string;
      currency: string;
      amountMinor: number;
      compareAtMinor: number | null;
      minQty: number;
    }[];
    inventory: {
      locationId: string;
      onHand: number;
      reserved: number;
      available: number;
    }[];
  }[];
  media: {
    position: number;
    variantIds: string[];
    media: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }[];
  categories: {
    categoryId: string;
    position: number;
  }[];
  channels: {
    channelId: string;
  }[];
};
export type PutV1AdminProductsIdMediaApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    items: {
      mediaId: string;
      variantIds?: string[];
    }[];
  };
};
export type GetV1AdminCategoriesApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  description: any;
  parentId: string | null;
  position: number;
  seo: any;
  customFields: any;
  version: number;
  updatedAt: string;
}[];
export type GetV1AdminCategoriesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminCategoriesApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  description: any;
  parentId: string | null;
  position: number;
  seo: any;
  customFields: any;
  version: number;
  updatedAt: string;
};
export type PostV1AdminCategoriesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    description?: any;
    parentId?: string | null;
    position?: number;
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    customFields?: {
      [key: string]: any;
    };
  };
};
export type PutV1AdminCategoriesIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  description: any;
  parentId: string | null;
  position: number;
  seo: any;
  customFields: any;
  version: number;
  updatedAt: string;
};
export type PutV1AdminCategoriesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    description?: any;
    parentId?: string | null;
    position?: number;
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    customFields?: {
      [key: string]: any;
    };
    version: number;
  };
};
export type DeleteV1AdminCategoriesIdApiResponse = unknown;
export type DeleteV1AdminCategoriesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminCategoriesIdProductsApiResponse = unknown;
export type PutV1AdminCategoriesIdProductsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    productIds: string[];
  };
};
export type GetV1AdminCollectionsApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  title: string;
  description: any;
  type: "MANUAL" | "RULE";
  rules: any;
  seo: any;
  customFields: any;
  isPublished: boolean;
  version: number;
  updatedAt: string;
  products: {
    productId: string;
    position: number;
    product: {
      title: string;
      handle: string;
      status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    };
  }[];
}[];
export type GetV1AdminCollectionsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminCollectionsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  title: string;
  description: any;
  type: "MANUAL" | "RULE";
  rules: any;
  seo: any;
  customFields: any;
  isPublished: boolean;
  version: number;
  updatedAt: string;
};
export type PostV1AdminCollectionsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    title: string;
    description?: any;
    type: "MANUAL" | "RULE";
    rules?: {
      match?: "all" | "any";
      conditions?: {
        field: "tag" | "vendor" | "product_type" | "title" | "attribute";
        op: "eq" | "neq" | "contains";
        value: string;
        attribute?: string;
      }[];
    };
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    customFields?: {
      [key: string]: any;
    };
    isPublished?: boolean;
  };
};
export type PutV1AdminCollectionsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  title: string;
  description: any;
  type: "MANUAL" | "RULE";
  rules: any;
  seo: any;
  customFields: any;
  isPublished: boolean;
  version: number;
  updatedAt: string;
};
export type PutV1AdminCollectionsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    title: string;
    description?: any;
    type: "MANUAL" | "RULE";
    rules?: {
      match?: "all" | "any";
      conditions?: {
        field: "tag" | "vendor" | "product_type" | "title" | "attribute";
        op: "eq" | "neq" | "contains";
        value: string;
        attribute?: string;
      }[];
    };
    seo?: {
      title?: string;
      description?: string;
      canonical?: string;
      noindex?: boolean;
      ogImage?: string;
    };
    customFields?: {
      [key: string]: any;
    };
    isPublished?: boolean;
    version: number;
  };
};
export type DeleteV1AdminCollectionsIdApiResponse = unknown;
export type DeleteV1AdminCollectionsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminCollectionsIdProductsApiResponse = unknown;
export type PutV1AdminCollectionsIdProductsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    productIds: string[];
  };
};
export type GetV1AdminAttributesApiResponse = /** status 200 OK */ {
  handle: string;
  label: string;
  type:
    | "TEXT"
    | "RICH_TEXT"
    | "NUMBER"
    | "BOOLEAN"
    | "SELECT"
    | "MULTI_SELECT"
    | "COLOR"
    | "DATE"
    | "FILE"
    | "REFERENCE"
    | "JSON";
  values: any;
  filterable: boolean;
  displayType: string | null;
  position: number;
  id: string;
}[];
export type GetV1AdminAttributesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAttributesApiResponse = /** status 201 OK */ {
  handle: string;
  label: string;
  type:
    | "TEXT"
    | "RICH_TEXT"
    | "NUMBER"
    | "BOOLEAN"
    | "SELECT"
    | "MULTI_SELECT"
    | "COLOR"
    | "DATE"
    | "FILE"
    | "REFERENCE"
    | "JSON";
  values: any;
  filterable: boolean;
  displayType: string | null;
  position: number;
  id: string;
};
export type PostV1AdminAttributesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    label: string;
    type:
      | "TEXT"
      | "RICH_TEXT"
      | "NUMBER"
      | "BOOLEAN"
      | "SELECT"
      | "MULTI_SELECT"
      | "COLOR"
      | "DATE"
      | "FILE"
      | "REFERENCE"
      | "JSON";
    values?: {
      value: string;
      label: string;
      swatch?: string;
    }[];
    filterable?: boolean;
    displayType?: string | null;
    position?: number;
  };
};
export type PutV1AdminAttributesIdApiResponse = /** status 200 OK */ {
  handle: string;
  label: string;
  type:
    | "TEXT"
    | "RICH_TEXT"
    | "NUMBER"
    | "BOOLEAN"
    | "SELECT"
    | "MULTI_SELECT"
    | "COLOR"
    | "DATE"
    | "FILE"
    | "REFERENCE"
    | "JSON";
  values: any;
  filterable: boolean;
  displayType: string | null;
  position: number;
  id: string;
};
export type PutV1AdminAttributesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    label: string;
    type:
      | "TEXT"
      | "RICH_TEXT"
      | "NUMBER"
      | "BOOLEAN"
      | "SELECT"
      | "MULTI_SELECT"
      | "COLOR"
      | "DATE"
      | "FILE"
      | "REFERENCE"
      | "JSON";
    values?: {
      value: string;
      label: string;
      swatch?: string;
    }[];
    filterable?: boolean;
    displayType?: string | null;
    position?: number;
  };
};
export type GetV1AdminProductTypesApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  attributes: {
    attributeId: string;
    required: boolean;
    position: number;
    attribute: {
      handle: string;
      label: string;
      type:
        | "TEXT"
        | "RICH_TEXT"
        | "NUMBER"
        | "BOOLEAN"
        | "SELECT"
        | "MULTI_SELECT"
        | "COLOR"
        | "DATE"
        | "FILE"
        | "REFERENCE"
        | "JSON";
      values: any;
      filterable: boolean;
      displayType: string | null;
      position: number;
      id: string;
    };
  }[];
}[];
export type GetV1AdminProductTypesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminProductTypesApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  attributes: {
    attributeId: string;
    required: boolean;
    position: number;
    attribute: {
      handle: string;
      label: string;
      type:
        | "TEXT"
        | "RICH_TEXT"
        | "NUMBER"
        | "BOOLEAN"
        | "SELECT"
        | "MULTI_SELECT"
        | "COLOR"
        | "DATE"
        | "FILE"
        | "REFERENCE"
        | "JSON";
      values: any;
      filterable: boolean;
      displayType: string | null;
      position: number;
      id: string;
    };
  }[];
};
export type PostV1AdminProductTypesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    attributes?: {
      attributeId: string;
      required?: boolean;
    }[];
  };
};
export type PutV1AdminProductTypesIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  attributes: {
    attributeId: string;
    required: boolean;
    position: number;
    attribute: {
      handle: string;
      label: string;
      type:
        | "TEXT"
        | "RICH_TEXT"
        | "NUMBER"
        | "BOOLEAN"
        | "SELECT"
        | "MULTI_SELECT"
        | "COLOR"
        | "DATE"
        | "FILE"
        | "REFERENCE"
        | "JSON";
      values: any;
      filterable: boolean;
      displayType: string | null;
      position: number;
      id: string;
    };
  }[];
};
export type PutV1AdminProductTypesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    attributes?: {
      attributeId: string;
      required?: boolean;
    }[];
  };
};
export type GetV1AdminRedirectsApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    fromPath: string;
    toPath: string;
    statusCode: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  nextCursor: string | null;
};
export type GetV1AdminRedirectsApiArg = {
  cursor?: string;
  limit?: number;
  q?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminRedirectsApiResponse = /** status 201 OK */ {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PostV1AdminRedirectsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    fromPath: string;
    toPath: string;
    statusCode?: 301 | 302;
    isActive?: boolean;
  };
};
export type DeleteV1AdminRedirectsIdApiResponse = unknown;
export type DeleteV1AdminRedirectsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminMenusApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  items: any;
  version: number;
  updatedAt: string;
}[];
export type GetV1AdminMenusApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminMenusHandleApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  items: any;
  version: number;
  updatedAt: string;
};
export type PutV1AdminMenusHandleApiArg = {
  handle: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    items: Recursive4[];
    version?: number;
  };
};
export type GetV1AdminCustomFieldsApiResponse = /** status 200 OK */ {
  id: string;
  entityType:
    | "PRODUCT"
    | "VARIANT"
    | "CATEGORY"
    | "COLLECTION"
    | "CUSTOMER"
    | "ORDER"
    | "PAGE";
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: any;
  storefrontVisible: boolean;
  position: number;
}[];
export type GetV1AdminCustomFieldsApiArg = {
  entityType?:
    | "PRODUCT"
    | "VARIANT"
    | "CATEGORY"
    | "COLLECTION"
    | "CUSTOMER"
    | "ORDER"
    | "PAGE";
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminCustomFieldsApiResponse = /** status 201 OK */ {
  id: string;
  entityType:
    | "PRODUCT"
    | "VARIANT"
    | "CATEGORY"
    | "COLLECTION"
    | "CUSTOMER"
    | "ORDER"
    | "PAGE";
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: any;
  storefrontVisible: boolean;
  position: number;
};
export type PostV1AdminCustomFieldsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    entityType:
      | "PRODUCT"
      | "VARIANT"
      | "CATEGORY"
      | "COLLECTION"
      | "CUSTOMER"
      | "ORDER"
      | "PAGE";
    key: string;
    label: string;
    type:
      | "text"
      | "number"
      | "boolean"
      | "select"
      | "multi_select"
      | "date"
      | "url"
      | "json";
    required?: boolean;
    options?: {
      value: string;
      label: string;
    }[];
    storefrontVisible?: boolean;
    position?: number;
  };
};
export type PutV1AdminCustomFieldsIdApiResponse = /** status 200 OK */ {
  id: string;
  entityType:
    | "PRODUCT"
    | "VARIANT"
    | "CATEGORY"
    | "COLLECTION"
    | "CUSTOMER"
    | "ORDER"
    | "PAGE";
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: any;
  storefrontVisible: boolean;
  position: number;
};
export type PutV1AdminCustomFieldsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    label: string;
    type:
      | "text"
      | "number"
      | "boolean"
      | "select"
      | "multi_select"
      | "date"
      | "url"
      | "json";
    required?: boolean;
    options?: {
      value: string;
      label: string;
    }[];
    storefrontVisible?: boolean;
    position?: number;
  };
};
export type DeleteV1AdminCustomFieldsIdApiResponse = unknown;
export type DeleteV1AdminCustomFieldsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminCustomersApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    acceptsMarketing: boolean;
    createdAt: string;
    tags: string[];
    groupId: string | null;
    customFields: any;
    archivedAt: string | null;
    hasAccount: boolean;
    version: number;
  }[];
  nextCursor: string | null;
};
export type GetV1AdminCustomersApiArg = {
  cursor?: string;
  limit?: number;
  q?: string;
  groupId?: string;
  tag?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminCustomersIdApiResponse = /** status 200 OK */ {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  acceptsMarketing: boolean;
  createdAt: string;
  tags: string[];
  groupId: string | null;
  customFields: any;
  archivedAt: string | null;
  hasAccount: boolean;
  version: number;
  updatedAt: string;
  deletionRequestedAt: string | null;
  anonymizedAt: string | null;
  addresses: {
    firstName: string;
    lastName: string;
    company: string | null;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string | null;
    country: any;
    phone: string | null;
    id: string;
    label: string | null;
    isDefaultShipping: boolean;
    isDefaultBilling: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  roles: string[];
  stats: {
    orderCount: number;
    lifetimeValueMinor: number;
    averageOrderMinor: number;
  };
};
export type GetV1AdminCustomersIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminCustomersIdApiResponse = /** status 200 OK */ {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  acceptsMarketing: boolean;
  createdAt: string;
  tags: string[];
  groupId: string | null;
  customFields: any;
  archivedAt: string | null;
  hasAccount: boolean;
  version: number;
};
export type PatchV1AdminCustomersIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    version: number;
    tags?: string[];
    groupId?: string | null;
    customFields?: {
      [key: string]: any;
    };
  };
};
export type GetV1AdminCustomerGroupsApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}[];
export type GetV1AdminCustomerGroupsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminCustomerGroupsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
export type PostV1AdminCustomerGroupsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
  };
};
export type GetV1AdminInventoryVariantsIdApiResponse = /** status 200 OK */ {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  lowStockThreshold: number | null;
  updatedAt: string;
  location: {
    id: string;
    name: string;
    handle: string;
  };
}[];
export type GetV1AdminInventoryVariantsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminInventoryVariantsIdHistoryApiResponse =
  /** status 200 OK */ {
    id: string;
    locationId: string;
    reason: string;
    onHandDelta: number;
    reservedDelta: number;
    note: string | null;
    orderId: string | null;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
export type GetV1AdminInventoryVariantsIdHistoryApiArg = {
  id: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminInventoryAdjustmentsApiResponse = /** status 201 OK */ {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  lowStockThreshold: number | null;
  updatedAt: string;
};
export type PostV1AdminInventoryAdjustmentsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    variantId: string;
    locationId?: string;
    delta?: number;
    setOnHand?: number;
    reason:
      | "RECEIVED"
      | "CORRECTION"
      | "DAMAGED"
      | "SHRINKAGE"
      | "CYCLE_COUNT"
      | "RETURN_RESTOCK";
    note?: string;
  };
};
export type PatchV1AdminInventoryLevelsIdApiResponse = /** status 200 OK */ {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  lowStockThreshold: number | null;
  updatedAt: string;
};
export type PatchV1AdminInventoryLevelsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    lowStockThreshold: number | null;
  };
};
export type GetV1AdminMarketsApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  currency: string;
  defaultLocale: string;
  locales: string[];
  countries: string[];
  taxInclusive: boolean;
  priceListId: string | null;
  isDefault: boolean;
  isActive: boolean;
  version: number;
}[];
export type GetV1AdminMarketsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminMarketsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  currency: string;
  defaultLocale: string;
  locales: string[];
  countries: string[];
  taxInclusive: boolean;
  priceListId: string | null;
  isDefault: boolean;
  isActive: boolean;
  version: number;
};
export type PostV1AdminMarketsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    currency: string;
    defaultLocale: string;
    locales: string[];
    countries: string[];
    taxInclusive?: boolean;
    priceListId?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  };
};
export type PutV1AdminMarketsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  currency: string;
  defaultLocale: string;
  locales: string[];
  countries: string[];
  taxInclusive: boolean;
  priceListId: string | null;
  isDefault: boolean;
  isActive: boolean;
  version: number;
};
export type PutV1AdminMarketsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    currency: string;
    defaultLocale: string;
    locales: string[];
    countries: string[];
    taxInclusive?: boolean;
    priceListId?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    version: number;
  };
};
export type GetV1AdminChannelsApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  isDefault: boolean;
}[];
export type GetV1AdminChannelsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminChannelsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  isDefault: boolean;
};
export type PostV1AdminChannelsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    isDefault?: boolean;
  };
};
export type PutV1AdminChannelsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  isDefault: boolean;
};
export type PutV1AdminChannelsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    isDefault?: boolean;
  };
};
export type GetV1AdminLocationsApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  address: any;
  isDefault: boolean;
  isActive: boolean;
}[];
export type GetV1AdminLocationsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminLocationsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  address: any;
  isDefault: boolean;
  isActive: boolean;
};
export type PostV1AdminLocationsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    address?: {
      [key: string]: any;
    };
    isDefault?: boolean;
    isActive?: boolean;
  };
};
export type PutV1AdminLocationsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  address: any;
  isDefault: boolean;
  isActive: boolean;
};
export type PutV1AdminLocationsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    address?: {
      [key: string]: any;
    };
    isDefault?: boolean;
    isActive?: boolean;
  };
};
export type PostV1AdminMediaUploadUrlApiResponse = /** status 200 OK */ {
  key: string;
  uploadUrl: string;
  headers: {
    [key: string]: string;
  };
};
export type PostV1AdminMediaUploadUrlApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
  };
};
export type PostV1AdminMediaApiResponse = /** status 201 OK */ {
  id: string;
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  focalPoint: any;
  tags: string[];
  createdAt: string;
};
export type PostV1AdminMediaApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    alt?: string;
    tags?: string[];
  };
};
export type GetV1AdminMediaApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    alt: string | null;
    focalPoint: any;
    tags: string[];
    createdAt: string;
  }[];
  nextCursor: string | null;
};
export type GetV1AdminMediaApiArg = {
  cursor?: string;
  limit?: number;
  tag?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminMediaIdApiResponse = /** status 200 OK */ {
  id: string;
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  focalPoint: any;
  tags: string[];
  createdAt: string;
};
export type PatchV1AdminMediaIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    alt?: string | null;
    focalPoint?: {
      x: number;
      y: number;
    } | null;
    tags?: string[];
  };
};
export type DeleteV1AdminMediaIdApiResponse = unknown;
export type DeleteV1AdminMediaIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminNotificationTemplatesApiResponse = /** status 200 OK */ {
  id: string;
  key: string;
  channel: "EMAIL" | "SMS";
  locale: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
  version: number;
  updatedAt: string;
}[];
export type GetV1AdminNotificationTemplatesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminNotificationTemplatesApiResponse = /** status 201 OK */ {
  id: string;
  key: string;
  channel: "EMAIL" | "SMS";
  locale: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
  version: number;
  updatedAt: string;
};
export type PostV1AdminNotificationTemplatesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    subject: string;
    bodyHtml: string;
    bodyText: string;
    isActive?: boolean;
    key: string;
    locale: string;
  };
};
export type PutV1AdminNotificationTemplatesIdApiResponse =
  /** status 200 OK */ {
    id: string;
    key: string;
    channel: "EMAIL" | "SMS";
    locale: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    isActive: boolean;
    version: number;
    updatedAt: string;
  };
export type PutV1AdminNotificationTemplatesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    subject: string;
    bodyHtml: string;
    bodyText: string;
    isActive?: boolean;
    version: number;
  };
};
export type PostV1AdminNotificationTemplatesPreviewApiResponse =
  /** status 200 OK */ {
    subject: string;
    html: string;
    text: string;
  };
export type PostV1AdminNotificationTemplatesPreviewApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    key: string;
    locale?: string;
    data?: {
      [key: string]: any;
    };
  };
};
export type PostV1AdminNotificationTemplatesTestSendApiResponse =
  | /** status 200 OK */ {
      sent: true;
    }
  | {
      skipped: string;
    };
export type PostV1AdminNotificationTemplatesTestSendApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    key: string;
    locale?: string;
    to: string;
  };
};
export type GetV1AdminOrdersApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    number: number;
    displayNumber: string;
    status:
      | "DRAFT"
      | "PENDING_PAYMENT"
      | "PAID"
      | "ON_HOLD"
      | "PARTIALLY_FULFILLED"
      | "FULFILLED"
      | "DELIVERED"
      | "COMPLETED"
      | "CANCELLED";
    email: string;
    currency: string;
    totalMinor: number;
    placedAt: string | null;
    createdAt: string;
    channelId: string;
    lineCount: number;
    paymentStatus:
      | (
          | "PENDING"
          | "AUTHORIZED"
          | "CAPTURED"
          | "PARTIALLY_REFUNDED"
          | "REFUNDED"
          | "FAILED"
          | "VOIDED"
        )
      | null;
    paymentProvider: string | null;
  }[];
  nextCursor: string | null;
};
export type GetV1AdminOrdersApiArg = {
  cursor?: string;
  limit?: number;
  status?:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  q?: string;
  customerId?: string;
  from?: string;
  to?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminOrdersIdApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type GetV1AdminOrdersIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminOrdersIdMarkPaidApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdMarkPaidApiArg = {
  id: string;
  "Idempotency-Key"?: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    paymentId?: string;
    reference?: string;
  };
};
export type PostV1AdminOrdersIdFulfillmentsApiResponse = /** status 201 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdFulfillmentsApiArg = {
  id: string;
  "Idempotency-Key"?: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    lines?: {
      orderLineId: string;
      quantity: number;
    }[];
    status?: "PENDING" | "SHIPPED";
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
};
export type PatchV1AdminOrdersFulfillmentsIdApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PatchV1AdminOrdersFulfillmentsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    status?:
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
};
export type PostV1AdminOrdersIdRefundsApiResponse =
  | /** status 201 OK */ {
      id: string;
      number: number;
      displayNumber: string;
      status:
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED";
      holdPreviousStatus:
        | (
            | "DRAFT"
            | "PENDING_PAYMENT"
            | "PAID"
            | "ON_HOLD"
            | "PARTIALLY_FULFILLED"
            | "FULFILLED"
            | "DELIVERED"
            | "COMPLETED"
            | "CANCELLED"
          )
        | null;
      customerId: string | null;
      customer: {
        id: string;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
      } | null;
      email: string;
      currency: string;
      taxInclusive: boolean;
      subtotalMinor: number;
      discountMinor: number;
      shippingMinor: number;
      taxMinor: number;
      totalMinor: number;
      marketId: string;
      channelId: string;
      locale: string | null;
      shippingAddress: {
        firstName: string;
        lastName: string;
        company?: string | null;
        line1: string;
        line2?: string | null;
        city: string;
        region?: string | null;
        postalCode?: string | null;
        country: string;
        phone?: string | null;
      };
      billingAddress: {
        firstName: string;
        lastName: string;
        company?: string | null;
        line1: string;
        line2?: string | null;
        city: string;
        region?: string | null;
        postalCode?: string | null;
        country: string;
        phone?: string | null;
      };
      shippingMethod: {
        rateId?: string | null;
        name: string;
        amountMinor: number;
      };
      notes: string | null;
      tags: string[];
      customFields: any;
      cancelReason: string | null;
      cancelledAt: string | null;
      placedAt: string | null;
      deliveredAt: string | null;
      affiliateId: string | null;
      promotions: any;
      version: number;
      createdAt: string;
      updatedAt: string;
      lines: {
        id: string;
        productId: string;
        variantId: string;
        titleSnapshot: string;
        variantTitle: string;
        skuSnapshot: string;
        unitPriceMinor: number;
        compareAtMinor: number | null;
        quantity: number;
        discountMinor: number;
        taxMinor: number;
        totalMinor: number;
        costMinor: number | null;
        marginMinor: number | null;
        customizations: any;
        fulfilledQuantity: number;
        refundedQuantity: number;
      }[];
      events: {
        id: string;
        type: string;
        message: string;
        data: any;
        actorType: string;
        actorId: string | null;
        createdAt: string;
      }[];
      payments: {
        id: string;
        provider: string;
        status:
          | "PENDING"
          | "AUTHORIZED"
          | "CAPTURED"
          | "PARTIALLY_REFUNDED"
          | "REFUNDED"
          | "FAILED"
          | "VOIDED";
        amountMinor: number;
        currency: string;
        capturedMinor: number;
        refundedMinor: number;
        providerRef: string | null;
        createdAt: string;
        updatedAt: string;
        transactions: {
          id: string;
          kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
          status: "SUCCESS" | "FAILED" | "PENDING";
          amountMinor: number;
          providerRef: string | null;
          createdAt: string;
        }[];
      }[];
      fulfillments: {
        id: string;
        locationId: string;
        status:
          | "PENDING"
          | "PICKING"
          | "PACKED"
          | "SHIPPED"
          | "IN_TRANSIT"
          | "DELIVERED"
          | "FAILED_DELIVERY"
          | "RETURNED_TO_SENDER";
        carrier: string | null;
        trackingNumber: string | null;
        trackingUrl: string | null;
        shippedAt: string | null;
        deliveredAt: string | null;
        version: number;
        createdAt: string;
        updatedAt: string;
        lines: {
          id: string;
          orderLineId: string;
          quantity: number;
        }[];
      }[];
      refunds: {
        id: string;
        paymentId: string | null;
        amountMinor: number;
        currency: string;
        method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
        reason: string | null;
        lines: {
          orderLineId: string;
          quantity: number;
          restock: boolean;
        }[];
        createdById: string | null;
        createdAt: string;
      }[];
    }
  | {
      approvalRequired: true;
      approval: {
        id: string;
        action: string;
        entityType: string;
        entityId: string;
        payload: any;
        reason: string | null;
        status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
        requestedBy: string;
        createdAt: string;
      };
    };
export type PostV1AdminOrdersIdRefundsApiArg = {
  id: string;
  "Idempotency-Key": string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    amountMinor?: number;
    lines?: {
      orderLineId: string;
      quantity: number;
      restock?: boolean;
    }[];
    reason?: string;
    reference?: string;
    method?: "ORIGINAL" | "MANUAL";
  };
};
export type PostV1AdminOrdersIdCancelApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdCancelApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    reason: string;
    refund?: boolean;
  };
};
export type PostV1AdminOrdersIdHoldApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdHoldApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    reason: string;
  };
};
export type PostV1AdminOrdersIdReleaseApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdReleaseApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminOrdersIdCompleteApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdCompleteApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminOrdersIdNotesApiResponse = /** status 201 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PostV1AdminOrdersIdNotesApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    note: string;
  };
};
export type PutV1AdminOrdersIdTagsApiResponse = /** status 200 OK */ {
  id: string;
  number: number;
  displayNumber: string;
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ON_HOLD"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  holdPreviousStatus:
    | (
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "ON_HOLD"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
      )
    | null;
  customerId: string | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string;
  currency: string;
  taxInclusive: boolean;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  marketId: string;
  channelId: string;
  locale: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
  };
  shippingMethod: {
    rateId?: string | null;
    name: string;
    amountMinor: number;
  };
  notes: string | null;
  tags: string[];
  customFields: any;
  cancelReason: string | null;
  cancelledAt: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  affiliateId: string | null;
  promotions: any;
  version: number;
  createdAt: string;
  updatedAt: string;
  lines: {
    id: string;
    productId: string;
    variantId: string;
    titleSnapshot: string;
    variantTitle: string;
    skuSnapshot: string;
    unitPriceMinor: number;
    compareAtMinor: number | null;
    quantity: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    costMinor: number | null;
    marginMinor: number | null;
    customizations: any;
    fulfilledQuantity: number;
    refundedQuantity: number;
  }[];
  events: {
    id: string;
    type: string;
    message: string;
    data: any;
    actorType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "CAPTURED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED"
      | "FAILED"
      | "VOIDED";
    amountMinor: number;
    currency: string;
    capturedMinor: number;
    refundedMinor: number;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    transactions: {
      id: string;
      kind: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND";
      status: "SUCCESS" | "FAILED" | "PENDING";
      amountMinor: number;
      providerRef: string | null;
      createdAt: string;
    }[];
  }[];
  fulfillments: {
    id: string;
    locationId: string;
    status:
      | "PENDING"
      | "PICKING"
      | "PACKED"
      | "SHIPPED"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "FAILED_DELIVERY"
      | "RETURNED_TO_SENDER";
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: {
      id: string;
      orderLineId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountMinor: number;
    currency: string;
    method: "ORIGINAL" | "STORE_CREDIT" | "MANUAL";
    reason: string | null;
    lines: {
      orderLineId: string;
      quantity: number;
      restock: boolean;
    }[];
    createdById: string | null;
    createdAt: string;
  }[];
};
export type PutV1AdminOrdersIdTagsApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    tags: string[];
  };
};
export type GetV1AdminPriceListsApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  priority: number;
  channelId: string | null;
  customerGroupId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
}[];
export type GetV1AdminPriceListsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminPriceListsApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  priority: number;
  channelId: string | null;
  customerGroupId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
};
export type PostV1AdminPriceListsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    currency: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    priority?: number;
    channelId?: string | null;
    customerGroupId?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  };
};
export type PutV1AdminPriceListsIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  priority: number;
  channelId: string | null;
  customerGroupId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
};
export type PutV1AdminPriceListsIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
    currency: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    priority?: number;
    channelId?: string | null;
    customerGroupId?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    version: number;
  };
};
export type PutV1AdminVariantsIdPricesApiResponse = /** status 200 OK */ {
  id: string;
  priceListId: string;
  currency: string;
  amountMinor: number;
  compareAtMinor: number | null;
  minQty: number;
}[];
export type PutV1AdminVariantsIdPricesApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    prices: {
      priceListId: string;
      amountMinor: number;
      compareAtMinor?: number | null;
      minQty?: number;
    }[];
  };
};
export type GetV1AdminSettingsApiResponse = /** status 200 OK */ {
  key: string;
  group: string;
  description: string;
  scopes: ("global" | "channel" | "market")[];
  permission: string;
  secret: boolean;
  default: any;
  schema: {
    [key: string]: any;
  };
  values: {
    scope: "global" | "channel" | "market";
    scopeId: string | null;
    value: any;
    version: number;
    updatedAt: string;
  }[];
}[];
export type GetV1AdminSettingsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminSettingsKeyApiResponse = unknown;
export type PutV1AdminSettingsKeyApiArg = {
  key: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    scope: "global" | "channel" | "market";
    scopeId?: string | null;
    value: any;
    version?: number;
  };
};
export type DeleteV1AdminSettingsKeyApiResponse = unknown;
export type DeleteV1AdminSettingsKeyApiArg = {
  key: string;
  scope: "global" | "channel" | "market";
  scopeId?: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminSettingsExportApiResponse = unknown;
export type GetV1AdminSettingsExportApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminSettingsImportApiResponse = unknown;
export type PostV1AdminSettingsImportApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    dryRun?: boolean;
    settings: {
      key: string;
      scope: "global" | "channel" | "market";
      scopeId?: string | null;
      value: any;
    }[];
  };
};
export type GetV1AdminFlagsApiResponse = /** status 200 OK */ {
  key: string;
  description: string;
  owner: string | null;
  enabled: boolean;
  killSwitch: boolean;
  targeting: any;
  version: number;
  updatedAt: string;
}[];
export type GetV1AdminFlagsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PutV1AdminFlagsKeyApiResponse = /** status 200 OK */ {
  key: string;
  description: string;
  owner: string | null;
  enabled: boolean;
  killSwitch: boolean;
  targeting: any;
  version: number;
  updatedAt: string;
};
export type PutV1AdminFlagsKeyApiArg = {
  key: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    description?: string;
    owner?: string | null;
    enabled?: boolean;
    killSwitch?: boolean;
    targeting?: {
      markets?: string[];
      channels?: string[];
      customerIds?: string[];
      groups?: string[];
      percentage?: number;
    };
    version?: number;
  };
};
export type GetV1AdminShippingZonesApiResponse = /** status 200 OK */ {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rates: {
    id: string;
    zoneId: string;
    name: string;
    type: "FLAT" | "PRICE" | "WEIGHT";
    currency: string;
    amountMinor: number;
    minSubtotalMinor: number | null;
    maxSubtotalMinor: number | null;
    minWeightGrams: number | null;
    maxWeightGrams: number | null;
    freeAboveMinor: number | null;
    minDeliveryDays: number | null;
    maxDeliveryDays: number | null;
    position: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
}[];
export type GetV1AdminShippingZonesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminShippingZonesApiResponse = /** status 201 OK */ {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PostV1AdminShippingZonesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    countries: ("*" | string)[];
    isActive?: boolean;
  };
};
export type PutV1AdminShippingZonesIdApiResponse = /** status 200 OK */ {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PutV1AdminShippingZonesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    countries: ("*" | string)[];
    isActive?: boolean;
  };
};
export type DeleteV1AdminShippingZonesIdApiResponse = unknown;
export type DeleteV1AdminShippingZonesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminShippingZonesIdRatesApiResponse = /** status 201 OK */ {
  id: string;
  zoneId: string;
  name: string;
  type: "FLAT" | "PRICE" | "WEIGHT";
  currency: string;
  amountMinor: number;
  minSubtotalMinor: number | null;
  maxSubtotalMinor: number | null;
  minWeightGrams: number | null;
  maxWeightGrams: number | null;
  freeAboveMinor: number | null;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PostV1AdminShippingZonesIdRatesApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    type: "FLAT" | "PRICE" | "WEIGHT";
    currency: string;
    amountMinor: number;
    minSubtotalMinor?: number | null;
    maxSubtotalMinor?: number | null;
    minWeightGrams?: number | null;
    maxWeightGrams?: number | null;
    freeAboveMinor?: number | null;
    minDeliveryDays?: number | null;
    maxDeliveryDays?: number | null;
    position?: number;
    isActive?: boolean;
  };
};
export type PutV1AdminShippingZonesZoneIdRatesIdApiResponse =
  /** status 200 OK */ {
    id: string;
    zoneId: string;
    name: string;
    type: "FLAT" | "PRICE" | "WEIGHT";
    currency: string;
    amountMinor: number;
    minSubtotalMinor: number | null;
    maxSubtotalMinor: number | null;
    minWeightGrams: number | null;
    maxWeightGrams: number | null;
    freeAboveMinor: number | null;
    minDeliveryDays: number | null;
    maxDeliveryDays: number | null;
    position: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
export type PutV1AdminShippingZonesZoneIdRatesIdApiArg = {
  zoneId: string;
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    type: "FLAT" | "PRICE" | "WEIGHT";
    currency: string;
    amountMinor: number;
    minSubtotalMinor?: number | null;
    maxSubtotalMinor?: number | null;
    minWeightGrams?: number | null;
    maxWeightGrams?: number | null;
    freeAboveMinor?: number | null;
    minDeliveryDays?: number | null;
    maxDeliveryDays?: number | null;
    position?: number;
    isActive?: boolean;
  };
};
export type DeleteV1AdminShippingRatesIdApiResponse = unknown;
export type DeleteV1AdminShippingRatesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminStaffApiResponse = /** status 200 OK */ {
  items: {
    id: string;
    email: string;
    name: string | null;
    status: "ACTIVE" | "DISABLED";
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    version: number;
    roles: {
      id: string;
      name: string;
    }[];
  }[];
  nextCursor: string | null;
};
export type GetV1AdminStaffApiArg = {
  cursor?: string;
  limit?: number;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminStaffApiResponse = /** status 201 OK */ {
  user: {
    id: string;
    email: string;
    name: string | null;
    status: "ACTIVE" | "DISABLED";
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    version: number;
    roles: {
      id: string;
      name: string;
    }[];
  };
  temporaryPassword: string | null;
};
export type PostV1AdminStaffApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    email: string;
    name?: string;
    roleIds: string[];
    password?: string;
  };
};
export type GetV1AdminStaffIdApiResponse = /** status 200 OK */ {
  id: string;
  email: string;
  name: string | null;
  status: "ACTIVE" | "DISABLED";
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  version: number;
  roles: {
    id: string;
    name: string;
  }[];
};
export type GetV1AdminStaffIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PatchV1AdminStaffIdApiResponse = /** status 200 OK */ {
  id: string;
  email: string;
  name: string | null;
  status: "ACTIVE" | "DISABLED";
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  version: number;
  roles: {
    id: string;
    name: string;
  }[];
};
export type PatchV1AdminStaffIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    version: number;
    name?: string | null;
    roleIds?: string[];
    status?: "ACTIVE" | "DISABLED";
  };
};
export type PostV1AdminStaffIdResetMfaApiResponse = /** status 200 OK */ {
  ok: true;
};
export type PostV1AdminStaffIdResetMfaApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminPermissionsApiResponse = /** status 200 OK */ {
  staff: string[];
  storefront: string[];
};
export type GetV1AdminPermissionsApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminRolesApiResponse = /** status 200 OK */ {
  id: string;
  name: string;
  description: string | null;
  audience: "STAFF" | "STOREFRONT";
  permissions: string[];
  isSystem: boolean;
  mfaRequired: boolean;
  sessionTtlMinutes: number | null;
  version: number;
}[];
export type GetV1AdminRolesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminRolesApiResponse = /** status 201 OK */ {
  id: string;
  name: string;
  description: string | null;
  audience: "STAFF" | "STOREFRONT";
  permissions: string[];
  isSystem: boolean;
  mfaRequired: boolean;
  sessionTtlMinutes: number | null;
  version: number;
};
export type PostV1AdminRolesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    description?: string;
    audience: "STAFF" | "STOREFRONT";
    permissions: string[];
    mfaRequired?: boolean;
    sessionTtlMinutes?: number | null;
  };
};
export type PatchV1AdminRolesIdApiResponse = /** status 200 OK */ {
  id: string;
  name: string;
  description: string | null;
  audience: "STAFF" | "STOREFRONT";
  permissions: string[];
  isSystem: boolean;
  mfaRequired: boolean;
  sessionTtlMinutes: number | null;
  version: number;
};
export type PatchV1AdminRolesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    version: number;
    name?: string;
    description?: string | null;
    permissions?: string[];
    mfaRequired?: boolean;
    sessionTtlMinutes?: number | null;
  };
};
export type DeleteV1AdminRolesIdApiResponse = unknown;
export type DeleteV1AdminRolesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminApiKeysApiResponse = /** status 200 OK */ {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}[];
export type GetV1AdminApiKeysApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminApiKeysApiResponse = /** status 201 OK */ {
  key: {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    expiresAt: string | null;
    lastUsedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
  };
  secret: string;
};
export type PostV1AdminApiKeysApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    name: string;
    scopes: string[];
    expiresAt?: string | null;
  };
};
export type PostV1AdminApiKeysIdRevokeApiResponse = /** status 200 OK */ {
  ok: true;
};
export type PostV1AdminApiKeysIdRevokeApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type GetV1AdminTaxClassesApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
}[];
export type GetV1AdminTaxClassesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminTaxClassesApiResponse = /** status 201 OK */ {
  id: string;
  handle: string;
  name: string;
};
export type PostV1AdminTaxClassesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
  };
};
export type PutV1AdminTaxClassesIdApiResponse = /** status 200 OK */ {
  id: string;
  handle: string;
  name: string;
};
export type PutV1AdminTaxClassesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    handle: string;
    name: string;
  };
};
export type GetV1AdminTaxRatesApiResponse = /** status 200 OK */ {
  id: string;
  taxClassId: string | null;
  name: string;
  country: string;
  region: string | null;
  rateBps: number;
  shipping: boolean;
  createdAt: string;
  updatedAt: string;
}[];
export type GetV1AdminTaxRatesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminTaxRatesApiResponse = /** status 201 OK */ {
  id: string;
  taxClassId: string | null;
  name: string;
  country: string;
  region: string | null;
  rateBps: number;
  shipping: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PostV1AdminTaxRatesApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    taxClassId?: string | null;
    name: string;
    country: string;
    region?: string | null;
    rateBps: number;
    shipping?: boolean;
  };
};
export type PutV1AdminTaxRatesIdApiResponse = /** status 200 OK */ {
  id: string;
  taxClassId: string | null;
  name: string;
  country: string;
  region: string | null;
  rateBps: number;
  shipping: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PutV1AdminTaxRatesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    taxClassId?: string | null;
    name: string;
    country: string;
    region?: string | null;
    rateBps: number;
    shipping?: boolean;
  };
};
export type DeleteV1AdminTaxRatesIdApiResponse = unknown;
export type DeleteV1AdminTaxRatesIdApiArg = {
  id: string;
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminAuthLoginApiResponse =
  | /** status 200 OK */ {
      status: "authenticated";
      session: {
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
        refreshTokenExpiresAt: string;
      };
    }
  | {
      status: "mfa_required" | "mfa_enrollment_required";
      mfaToken: string;
    };
export type PostV1AdminAuthLoginApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    email: string;
    password: string;
  };
};
export type PostV1AdminAuthMfaVerifyApiResponse = /** status 200 OK */ {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};
export type PostV1AdminAuthMfaVerifyApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    mfaToken: string;
    code: string;
  };
};
export type PostV1AdminAuthMfaEnrollApiResponse = /** status 200 OK */ {
  secret: string;
  otpauthUrl: string;
};
export type PostV1AdminAuthMfaEnrollApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    mfaToken?: string;
  };
};
export type PostV1AdminAuthMfaEnrollConfirmApiResponse = /** status 200 OK */ {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};
export type PostV1AdminAuthMfaEnrollConfirmApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    mfaToken?: string;
    code: string;
  };
};
export type PostV1AdminAuthRefreshApiResponse = /** status 200 OK */ {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};
export type PostV1AdminAuthRefreshApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    refreshToken: string;
  };
};
export type PostV1AdminAuthLogoutApiResponse = /** status 200 OK */ {
  ok: true;
};
export type PostV1AdminAuthLogoutApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    refreshToken: string;
  };
};
export type GetV1AdminAuthMeApiResponse = /** status 200 OK */ {
  id: string;
  email: string;
  name: string | null;
  mfaEnabled: boolean;
  roles: string[];
  permissions: string[];
};
export type GetV1AdminAuthMeApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminSessionLoginApiResponse =
  | /** status 200 OK */ {
      status: "authenticated";
      accessTokenExpiresAt: string;
    }
  | {
      status: "mfa_required" | "mfa_enrollment_required";
    };
export type PostV1AdminSessionLoginApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    email: string;
    password: string;
  };
};
export type PostV1AdminSessionMfaVerifyApiResponse = /** status 200 OK */ {
  status: "authenticated";
  accessTokenExpiresAt: string;
};
export type PostV1AdminSessionMfaVerifyApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    code: string;
  };
};
export type PostV1AdminSessionMfaEnrollApiResponse = /** status 200 OK */ {
  secret: string;
  otpauthUrl: string;
};
export type PostV1AdminSessionMfaEnrollApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {};
};
export type PostV1AdminSessionMfaEnrollConfirmApiResponse =
  /** status 200 OK */ {
    status: "authenticated";
    accessTokenExpiresAt: string;
  };
export type PostV1AdminSessionMfaEnrollConfirmApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
  body: {
    code: string;
  };
};
export type PostV1AdminSessionRefreshApiResponse = /** status 200 OK */ {
  status: "authenticated";
  accessTokenExpiresAt: string;
};
export type PostV1AdminSessionRefreshApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type PostV1AdminSessionLogoutApiResponse = /** status 200 OK */ {
  ok: true;
};
export type PostV1AdminSessionLogoutApiArg = {
  "x-market"?: string;
  "x-locale"?: string;
};
export type Error = {
  code:
    | "VALIDATION_FAILED"
    | "BAD_REQUEST"
    | "UNAUTHENTICATED"
    | "INVALID_CREDENTIALS"
    | "TOKEN_EXPIRED"
    | "MFA_REQUIRED"
    | "MFA_INVALID_CODE"
    | "FORBIDDEN"
    | "ACCOUNT_DISABLED"
    | "NOT_FOUND"
    | "FEATURE_DISABLED"
    | "CONFLICT"
    | "VERSION_CONFLICT"
    | "ALREADY_EXISTS"
    | "IDEMPOTENCY_IN_PROGRESS"
    | "IDEMPOTENCY_KEY_REUSED"
    | "IDEMPOTENCY_KEY_REQUIRED"
    | "INVALID_STATE_TRANSITION"
    | "INSUFFICIENT_STOCK"
    | "CART_NOT_ACTIVE"
    | "CART_EMPTY"
    | "CART_INVALID"
    | "PRICE_NOT_AVAILABLE"
    | "SHIPPING_UNAVAILABLE"
    | "GUEST_CHECKOUT_DISABLED"
    | "PAYMENT_PROVIDER_UNAVAILABLE"
    | "PAYMENT_FAILED"
    | "REFUND_EXCEEDS_CAPTURED"
    | "FULFILLMENT_EXCEEDS_REMAINING"
    | "ROLE_AUDIENCE_MISMATCH"
    | "LAST_OWNER"
    | "CUSTOM_FIELDS_INVALID"
    | "STORAGE_NOT_CONFIGURED"
    | "WEBHOOK_SIGNATURE_INVALID"
    | "PROMOTION_CODE_INVALID"
    | "PROMOTION_LIMIT_REACHED"
    | "TOO_MANY_CODES"
    | "AFFILIATE_NOT_ACTIVE"
    | "AFFILIATE_TERMS_OUTDATED"
    | "PAYOUT_BELOW_MINIMUM"
    | "RETURN_NOT_ELIGIBLE"
    | "REVIEW_NOT_ALLOWED"
    | "DELETION_BLOCKED"
    | "IMPORT_INVALID"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  message: string;
  details?: any;
};
export type Recursive1 = {
  id?: string;
  type: string;
  props?: {
    [key: string]: any;
  };
  settings?: {
    hideOn?: ("mobile" | "tablet" | "desktop")[];
    audience?: {
      segmentIds?: string[];
      markets?: string[];
      loggedIn?: boolean;
      newVisitors?: boolean;
    };
    schedule?: {
      startsAt?: string;
      endsAt?: string;
    };
    experiment?: {
      key: string;
      variant: string;
    };
  };
  children?: Recursive1[];
};
export type Recursive2 =
  | {
      type: "all" | "any";
      conditions: Recursive2[];
    }
  | {
      type: "subtotal" | "item_count" | "weight";
      min?: number;
      max?: number;
    }
  | {
      type: "contains";
      filter?: {
        productIds?: string[];
        variantIds?: string[];
        collectionIds?: string[];
        categoryIds?: string[];
        tags?: string[];
        vendors?: string[];
      };
      minQuantity?: number;
      minAmountMinor?: number;
    }
  | {
      type: "customer";
      loggedIn?: boolean;
      groupIds?: string[];
      segmentIds?: string[];
      firstOrder?: boolean;
    }
  | {
      type: "currency" | "country" | "channel";
      in: string[];
    }
  | {
      type: "shipping_method";
      rateIds: string[];
    }
  | {
      type: "affiliate";
      attributed: boolean;
      tierIds?: string[];
    };
export type Recursive4 = {
  label: string;
  type: "category" | "collection" | "page" | "product" | "url";
  ref?: string;
  url?: string;
  children?: Recursive4[];
};
export const {
  useGetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsQuery,
  usePostV1AdminAffiliateProgramAffiliatesIdCouponCodesMutation,
  useGetV1AdminAffiliateProgramFraudFlagsQuery,
  usePostV1AdminAffiliateProgramAffiliatesIdFraudFlagsMutation,
  usePostV1AdminAffiliateProgramFraudFlagsIdResolveMutation,
  useGetV1AdminAffiliateProgramPayoutBatchesQuery,
  usePostV1AdminAffiliateProgramPayoutBatchesMutation,
  useGetV1AdminAffiliateProgramPayoutBatchesIdQuery,
  usePostV1AdminAffiliateProgramPayoutBatchesIdApproveMutation,
  usePostV1AdminAffiliateProgramPayoutBatchesIdPaidMutation,
  usePostV1AdminAffiliateProgramPayoutBatchesIdCancelMutation,
  useGetV1AdminAffiliateProgramPayoutBatchesIdExportQuery,
  usePostV1AdminAffiliateProgramPayoutsIdSendMutation,
  useGetV1AdminAffiliateProgramAssetsQuery,
  usePostV1AdminAffiliateProgramAssetsMutation,
  usePutV1AdminAffiliateProgramAssetsIdMutation,
  useGetV1AdminAffiliateProgramAssetsAnalyticsQuery,
  useGetV1AdminApprovalsQuery,
  usePostV1AdminApprovalsIdDecisionMutation,
  useGetV1AdminDashboardQuery,
  useGetV1AdminDashboardStreamQuery,
  useGetV1AdminExperimentsQuery,
  usePostV1AdminExperimentsMutation,
  usePutV1AdminExperimentsIdMutation,
  usePostV1AdminExperimentsIdStatusMutation,
  useGetV1AdminExperimentsIdResultsQuery,
  usePutV1AdminProductsIdRelationsMutation,
  useGetV1AdminReportBuilderCatalogQuery,
  usePostV1AdminReportBuilderRunMutation,
  useGetV1AdminReportBuilderReportsQuery,
  usePostV1AdminReportBuilderReportsMutation,
  usePutV1AdminReportBuilderReportsIdMutation,
  useDeleteV1AdminReportBuilderReportsIdMutation,
  useGetV1AdminReportBuilderReportsIdRunQuery,
  useGetV1AdminReportBuilderFunnelQuery,
  useGetV1AdminSearchSynonymsQuery,
  usePostV1AdminSearchSynonymsMutation,
  useDeleteV1AdminSearchSynonymsIdMutation,
  useGetV1AdminSearchRedirectsQuery,
  usePutV1AdminSearchRedirectsMutation,
  useDeleteV1AdminSearchRedirectsIdMutation,
  useGetV1AdminSearchRulesQuery,
  usePutV1AdminSearchRulesMutation,
  useDeleteV1AdminSearchRulesIdMutation,
  useGetV1AdminWebhooksEventsQuery,
  useGetV1AdminWebhooksQuery,
  usePostV1AdminWebhooksMutation,
  usePatchV1AdminWebhooksIdMutation,
  useDeleteV1AdminWebhooksIdMutation,
  usePostV1AdminWebhooksIdRotateSecretMutation,
  usePostV1AdminWebhooksIdPingMutation,
  useGetV1AdminWebhooksIdDeliveriesQuery,
  usePostV1AdminWebhooksDeliveriesIdReplayMutation,
  useGetV1AdminWorkflowsTriggersQuery,
  useGetV1AdminWorkflowsQuery,
  usePostV1AdminWorkflowsMutation,
  usePutV1AdminWorkflowsIdMutation,
  useDeleteV1AdminWorkflowsIdMutation,
  useGetV1AdminWorkflowsIdRunsQuery,
  usePostV1AdminWorkflowsTestMutation,
  useGetV1AdminAffiliatesQuery,
  useGetV1AdminAffiliatesIdQuery,
  usePatchV1AdminAffiliatesIdMutation,
  usePostV1AdminAffiliatesIdStatusMutation,
  usePatchV1AdminAffiliatesLinksIdMutation,
  useGetV1AdminAffiliatesIdEarningsQuery,
  usePostV1AdminAffiliatesIdAdjustmentsMutation,
  useGetV1AdminAffiliatesIdPayoutsQuery,
  usePostV1AdminAffiliatesIdPayoutsMutation,
  usePostV1AdminAffiliatesPayoutsIdApproveMutation,
  usePostV1AdminAffiliatesPayoutsIdPaidMutation,
  usePostV1AdminAffiliatesPayoutsIdCancelMutation,
  useGetV1AdminAffiliatesConfigTiersQuery,
  usePostV1AdminAffiliatesConfigTiersMutation,
  usePutV1AdminAffiliatesConfigTiersIdMutation,
  useGetV1AdminAffiliatesConfigRulesQuery,
  usePostV1AdminAffiliatesConfigRulesMutation,
  usePutV1AdminAffiliatesConfigRulesIdMutation,
  usePutV1AdminOrdersIdAttributionMutation,
  useGetV1AdminBlocksQuery,
  useGetV1AdminPagesQuery,
  usePostV1AdminPagesMutation,
  useGetV1AdminPagesIdQuery,
  usePutV1AdminPagesIdMutation,
  usePostV1AdminPagesIdPublishMutation,
  usePostV1AdminPagesIdUnpublishMutation,
  useGetV1AdminPagesIdVersionsQuery,
  usePostV1AdminPagesIdRollbackMutation,
  usePostV1AdminPagesIdPreviewLinkMutation,
  useGetV1AdminCustomersIdExportQuery,
  usePostV1AdminCustomersIdAnonymizeMutation,
  useGetV1AdminCustomersIdStoreCreditQuery,
  usePostV1AdminCustomersIdStoreCreditMutation,
  useGetV1AdminImportsColumnsQuery,
  usePostV1AdminImportsMutation,
  usePostV1AdminExportsMutation,
  useGetV1AdminDataJobsQuery,
  useGetV1AdminDataJobsIdQuery,
  useGetV1AdminDataJobsIdDownloadQuery,
  useGetV1AdminPromotionsQuery,
  usePostV1AdminPromotionsMutation,
  useGetV1AdminPromotionsIdQuery,
  usePatchV1AdminPromotionsIdMutation,
  usePostV1AdminPromotionsIdStatusMutation,
  useGetV1AdminPromotionsIdCodesQuery,
  usePostV1AdminPromotionsIdCodesMutation,
  usePatchV1AdminPromotionsCodesIdMutation,
  usePostV1AdminPromotionsSimulateMutation,
  useGetV1AdminPromotionsIdPerformanceQuery,
  useGetV1AdminReportsSalesQuery,
  useGetV1AdminReportsProductsQuery,
  useGetV1AdminReportsCustomersQuery,
  useGetV1AdminReportsPromotionsQuery,
  useGetV1AdminReportsSearchQuery,
  useGetV1AdminReportsAffiliatesQuery,
  useGetV1AdminReturnsQuery,
  useGetV1AdminReturnsIdQuery,
  usePostV1AdminReturnsIdDecisionMutation,
  usePostV1AdminReturnsIdShippingMutation,
  usePostV1AdminReturnsIdInspectionMutation,
  usePostV1AdminReturnsIdCompleteMutation,
  useGetV1AdminModerationQuery,
  usePatchV1AdminModerationReviewsIdMutation,
  usePatchV1AdminModerationQuestionsIdMutation,
  useGetV1AdminSegmentsQuery,
  usePostV1AdminSegmentsMutation,
  usePostV1AdminSegmentsPreviewMutation,
  usePutV1AdminSegmentsIdMutation,
  useDeleteV1AdminSegmentsIdMutation,
  usePostV1AdminSegmentsIdRefreshMutation,
  useGetV1AdminThemesQuery,
  usePostV1AdminThemesMutation,
  useGetV1AdminThemesIdQuery,
  usePutV1AdminThemesIdMutation,
  usePostV1AdminThemesIdActivateMutation,
  usePostV1AdminThemesIdPreviewLinkMutation,
  useGetV1AdminAuditQuery,
  useGetV1AdminProductsQuery,
  usePostV1AdminProductsMutation,
  useGetV1AdminProductsIdQuery,
  usePatchV1AdminProductsIdMutation,
  usePostV1AdminProductsIdStatusMutation,
  usePostV1AdminProductsIdVariantsMutation,
  usePostV1AdminProductsIdVariantsGenerateMutation,
  usePatchV1AdminVariantsIdMutation,
  useDeleteV1AdminVariantsIdMutation,
  usePutV1AdminProductsIdMediaMutation,
  useGetV1AdminCategoriesQuery,
  usePostV1AdminCategoriesMutation,
  usePutV1AdminCategoriesIdMutation,
  useDeleteV1AdminCategoriesIdMutation,
  usePutV1AdminCategoriesIdProductsMutation,
  useGetV1AdminCollectionsQuery,
  usePostV1AdminCollectionsMutation,
  usePutV1AdminCollectionsIdMutation,
  useDeleteV1AdminCollectionsIdMutation,
  usePutV1AdminCollectionsIdProductsMutation,
  useGetV1AdminAttributesQuery,
  usePostV1AdminAttributesMutation,
  usePutV1AdminAttributesIdMutation,
  useGetV1AdminProductTypesQuery,
  usePostV1AdminProductTypesMutation,
  usePutV1AdminProductTypesIdMutation,
  useGetV1AdminRedirectsQuery,
  usePostV1AdminRedirectsMutation,
  useDeleteV1AdminRedirectsIdMutation,
  useGetV1AdminMenusQuery,
  usePutV1AdminMenusHandleMutation,
  useGetV1AdminCustomFieldsQuery,
  usePostV1AdminCustomFieldsMutation,
  usePutV1AdminCustomFieldsIdMutation,
  useDeleteV1AdminCustomFieldsIdMutation,
  useGetV1AdminCustomersQuery,
  useGetV1AdminCustomersIdQuery,
  usePatchV1AdminCustomersIdMutation,
  useGetV1AdminCustomerGroupsQuery,
  usePostV1AdminCustomerGroupsMutation,
  useGetV1AdminInventoryVariantsIdQuery,
  useGetV1AdminInventoryVariantsIdHistoryQuery,
  usePostV1AdminInventoryAdjustmentsMutation,
  usePatchV1AdminInventoryLevelsIdMutation,
  useGetV1AdminMarketsQuery,
  usePostV1AdminMarketsMutation,
  usePutV1AdminMarketsIdMutation,
  useGetV1AdminChannelsQuery,
  usePostV1AdminChannelsMutation,
  usePutV1AdminChannelsIdMutation,
  useGetV1AdminLocationsQuery,
  usePostV1AdminLocationsMutation,
  usePutV1AdminLocationsIdMutation,
  usePostV1AdminMediaUploadUrlMutation,
  usePostV1AdminMediaMutation,
  useGetV1AdminMediaQuery,
  usePatchV1AdminMediaIdMutation,
  useDeleteV1AdminMediaIdMutation,
  useGetV1AdminNotificationTemplatesQuery,
  usePostV1AdminNotificationTemplatesMutation,
  usePutV1AdminNotificationTemplatesIdMutation,
  usePostV1AdminNotificationTemplatesPreviewMutation,
  usePostV1AdminNotificationTemplatesTestSendMutation,
  useGetV1AdminOrdersQuery,
  useGetV1AdminOrdersIdQuery,
  usePostV1AdminOrdersIdMarkPaidMutation,
  usePostV1AdminOrdersIdFulfillmentsMutation,
  usePatchV1AdminOrdersFulfillmentsIdMutation,
  usePostV1AdminOrdersIdRefundsMutation,
  usePostV1AdminOrdersIdCancelMutation,
  usePostV1AdminOrdersIdHoldMutation,
  usePostV1AdminOrdersIdReleaseMutation,
  usePostV1AdminOrdersIdCompleteMutation,
  usePostV1AdminOrdersIdNotesMutation,
  usePutV1AdminOrdersIdTagsMutation,
  useGetV1AdminPriceListsQuery,
  usePostV1AdminPriceListsMutation,
  usePutV1AdminPriceListsIdMutation,
  usePutV1AdminVariantsIdPricesMutation,
  useGetV1AdminSettingsQuery,
  usePutV1AdminSettingsKeyMutation,
  useDeleteV1AdminSettingsKeyMutation,
  useGetV1AdminSettingsExportQuery,
  usePostV1AdminSettingsImportMutation,
  useGetV1AdminFlagsQuery,
  usePutV1AdminFlagsKeyMutation,
  useGetV1AdminShippingZonesQuery,
  usePostV1AdminShippingZonesMutation,
  usePutV1AdminShippingZonesIdMutation,
  useDeleteV1AdminShippingZonesIdMutation,
  usePostV1AdminShippingZonesIdRatesMutation,
  usePutV1AdminShippingZonesZoneIdRatesIdMutation,
  useDeleteV1AdminShippingRatesIdMutation,
  useGetV1AdminStaffQuery,
  usePostV1AdminStaffMutation,
  useGetV1AdminStaffIdQuery,
  usePatchV1AdminStaffIdMutation,
  usePostV1AdminStaffIdResetMfaMutation,
  useGetV1AdminPermissionsQuery,
  useGetV1AdminRolesQuery,
  usePostV1AdminRolesMutation,
  usePatchV1AdminRolesIdMutation,
  useDeleteV1AdminRolesIdMutation,
  useGetV1AdminApiKeysQuery,
  usePostV1AdminApiKeysMutation,
  usePostV1AdminApiKeysIdRevokeMutation,
  useGetV1AdminTaxClassesQuery,
  usePostV1AdminTaxClassesMutation,
  usePutV1AdminTaxClassesIdMutation,
  useGetV1AdminTaxRatesQuery,
  usePostV1AdminTaxRatesMutation,
  usePutV1AdminTaxRatesIdMutation,
  useDeleteV1AdminTaxRatesIdMutation,
  usePostV1AdminAuthLoginMutation,
  usePostV1AdminAuthMfaVerifyMutation,
  usePostV1AdminAuthMfaEnrollMutation,
  usePostV1AdminAuthMfaEnrollConfirmMutation,
  usePostV1AdminAuthRefreshMutation,
  usePostV1AdminAuthLogoutMutation,
  useGetV1AdminAuthMeQuery,
  usePostV1AdminSessionLoginMutation,
  usePostV1AdminSessionMfaVerifyMutation,
  usePostV1AdminSessionMfaEnrollMutation,
  usePostV1AdminSessionMfaEnrollConfirmMutation,
  usePostV1AdminSessionRefreshMutation,
  usePostV1AdminSessionLogoutMutation,
} = injectedRtkApi;

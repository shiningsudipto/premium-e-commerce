import type { paths } from "../../api/schema";
import { bagApi } from "../cart/cart-api";

// Recommendations fetched in the browser, on the bag's RTK Query API (its base query sends the
// market headers). Used where the input is per shopper: the bag page ("You may also like",
// from the products in the bag).

type Response = paths["/v1/store/recommendations"]["get"]["responses"]["200"]["content"]["application/json"];
export type RecommendedProduct = Response["items"][number];
export type Placement = paths["/v1/store/recommendations"]["get"]["parameters"]["query"]["placement"];

export const recommendationsApi = bagApi.injectEndpoints({
  endpoints: (build) => ({
    getRecommendations: build.query<
      RecommendedProduct[],
      { placement: Placement; productId?: string; productIds?: string[]; limit?: number }
    >({
      query: ({ placement, productId, productIds, limit }) => {
        const q = new URLSearchParams({ placement });
        if (productId) q.set("productId", productId);
        // the API takes a comma-separated list
        if (productIds?.length) q.set("productIds", productIds.slice(0, 50).join(","));
        if (limit) q.set("limit", String(limit));
        return `/v1/store/recommendations?${q}`;
      },
      transformResponse: (res: Response) => res.items,
      // shared catalog data: keep it a while after the section unmounts
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetRecommendationsQuery } = recommendationsApi;

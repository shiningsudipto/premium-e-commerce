import type { paths } from "../../api/schema";
import { bagApi } from "../cart/cart-api";

// Wishlists in the browser, on the same RTK Query API (and Redux store) as the bag, so they share
// its session handling: cookies, the one-at-a-time refresh of an expired customer session.
// Only signed-in customers have wishlists; callers check useSignedIn() before querying.

type Json<P extends keyof paths, M extends keyof paths[P], S extends number = 200> = paths[P][M] extends {
  responses: { [K in S]: { content: { "application/json": infer R } } };
}
  ? R
  : never;

export type WishlistSummary = Json<"/v1/store/wishlists", "get">[number];
export type Wishlist = Json<"/v1/store/wishlists/{id}", "get">;
export type WishlistItem = Wishlist["items"][number];
type Saved = Json<"/v1/store/wishlists/saved", "get">;

const enc = encodeURIComponent;

export const wishlistApi = bagApi.enhanceEndpoints({ addTagTypes: ["Saved", "Wishlists"] }).injectEndpoints({
  endpoints: (build) => ({
    // Product IDs saved in any list, for the heart buttons.
    getSaved: build.query<string[], void>({
      query: () => "/v1/store/wishlists/saved",
      transformResponse: (res: Saved) => res.productIds,
      providesTags: ["Saved"],
    }),

    // Heart on: save to the default list. Heart off: remove from every list. Shown at once.
    setSaved: build.mutation<string[], { productId: string; variantId?: string; saved: boolean }>({
      query: ({ productId, variantId, saved }) => ({
        url: `/v1/store/wishlists/saved/${enc(productId)}`,
        method: saved ? "PUT" : "DELETE",
        ...(saved ? { body: variantId ? { variantId } : {} } : {}),
        // the heart shows the change at once; let the request finish even if the shopper leaves
        keepalive: true,
      }),
      transformResponse: (res: Saved) => res.productIds,
      onQueryStarted: async ({ productId, saved }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          wishlistApi.util.updateQueryData("getSaved", undefined, (ids) =>
            saved ? (ids.includes(productId) ? ids : [...ids, productId]) : ids.filter((id) => id !== productId),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(wishlistApi.util.upsertQueryData("getSaved", undefined, data));
        } catch {
          patch.undo();
        }
      },
      // the lists' item counts change; the saved IDs are re-read so an older in-flight read can't
      // leave a stale heart behind
      invalidatesTags: ["Wishlists", "Saved"],
    }),

    getWishlists: build.query<WishlistSummary[], void>({
      query: () => "/v1/store/wishlists",
      providesTags: ["Wishlists"],
    }),

    getWishlist: build.query<Wishlist, string>({
      query: (id) => `/v1/store/wishlists/${enc(id)}`,
      providesTags: (_r, _e, id) => [{ type: "Wishlists", id }],
    }),

    createWishlist: build.mutation<WishlistSummary, { name: string }>({
      query: (body) => ({ url: "/v1/store/wishlists", method: "POST", body }),
      invalidatesTags: ["Wishlists"],
    }),

    // Rename, or turn the share link on/off.
    updateWishlist: build.mutation<WishlistSummary, { id: string; name?: string; shared?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/v1/store/wishlists/${enc(id)}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => ["Wishlists", { type: "Wishlists", id }],
    }),

    deleteWishlist: build.mutation<{ ok: true }, string>({
      query: (id) => ({ url: `/v1/store/wishlists/${enc(id)}`, method: "DELETE" }),
      invalidatesTags: ["Wishlists", "Saved"],
    }),

    removeWishlistItem: build.mutation<Wishlist, { id: string; itemId: string }>({
      query: ({ id, itemId }) => ({ url: `/v1/store/wishlists/${enc(id)}/items/${enc(itemId)}`, method: "DELETE" }),
      onQueryStarted: async ({ id, itemId }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          wishlistApi.util.updateQueryData("getWishlist", id, (list) => {
            list.items = list.items.filter((i) => i.id !== itemId);
            list.itemCount = list.items.length;
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(wishlistApi.util.upsertQueryData("getWishlist", id, data));
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Wishlists", "Saved"],
    }),
  }),
});

export const {
  useGetSavedQuery,
  useSetSavedMutation,
  useGetWishlistsQuery,
  useGetWishlistQuery,
  useCreateWishlistMutation,
  useUpdateWishlistMutation,
  useDeleteWishlistMutation,
  useRemoveWishlistItemMutation,
} = wishlistApi;

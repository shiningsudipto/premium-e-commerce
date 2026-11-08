"use client";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { useEffect, useState, type ReactNode } from "react";
import { Provider, useDispatch } from "react-redux";
import type { MarketRef } from "../../lib/market";
import { bagApi, type BagExtra } from "./cart-api";

// The storefront's Redux store: only the bag lives here. One per browser tab (and per request
// while rendering on the server), created inside the provider so shoppers never share state.
// The market is fixed for the store's life and passed to the API calls as the thunk's extra
// argument (it sets the x-market / x-locale headers).
//
// The reducer is combined once, here: combineReducers probes reducers with a random action type,
// and Cache Components refuses Math.random() while the shop layout is being prerendered.
const reducer = combineReducers({ [bagApi.reducerPath]: bagApi.reducer });

export const makeBagStore = (market: MarketRef) =>
  configureStore({
    reducer,
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: { market } satisfies BagExtra } }).concat(bagApi.middleware),
  });

export type BagStore = ReturnType<typeof makeBagStore>;
export const useBagDispatch = useDispatch.withTypes<BagStore["dispatch"]>();

export function BagStoreProvider({ market, children }: { market: MarketRef; children: ReactNode }) {
  const [store] = useState(() => makeBagStore(market));
  // refetch the bag when the connection comes back
  useEffect(() => setupListeners(store.dispatch), [store]);
  return <Provider store={store}>{children}</Provider>;
}

"use client";

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { adminApi } from "./api.generated";

// One store per browser tab (and per request during prerendering), created inside the provider so
// no state is shared between users on the server.
export const makeStore = () =>
  configureStore({
    reducer: { [adminApi.reducerPath]: adminApi.reducer },
    middleware: (getDefault) => getDefault().concat(adminApi.middleware),
  });

export type AdminStore = ReturnType<typeof makeStore>;
export type AdminDispatch = AdminStore["dispatch"];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  // refetch on reconnect / tab focus, as configured on the API
  useEffect(() => setupListeners(store.dispatch), [store]);
  return <Provider store={store}>{children}</Provider>;
}

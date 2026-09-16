import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "../services/baseApi";

export const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
      immutableCheck: true,
    }).concat(baseApi.middleware),

  devTools: import.meta.env.DEV,
});

setupListeners(store.dispatch);

export default store;

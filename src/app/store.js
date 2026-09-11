import { configureStore } from "@reduxjs/toolkit";

const rootReducer = (state = {}) => state;

export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
      immutableCheck: true,
    }),

  devTools: import.meta.env.DEV,
});

export default store;
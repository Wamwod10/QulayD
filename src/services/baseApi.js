import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { STORAGE_KEYS } from "../constants/storageKeys";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");
const AUTH_EVENT = "qulay:auth-change";

function getStorage(key) {
  return typeof window === "undefined" ? null : window.localStorage.getItem(key);
}

function clearSession() {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

function saveSession(payload) {
  if (typeof window === "undefined" || !payload?.accessToken) return;
  window.localStorage.setItem(STORAGE_KEYS.accessToken, payload.accessToken);
  if (payload.user?.companyId) window.localStorage.setItem(STORAGE_KEYS.selectedCompanyId, payload.user.companyId);
  if (payload.user?.branchId) window.localStorage.setItem(STORAGE_KEYS.selectedBranchId, payload.user.branchId);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

const transport = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    const accessToken = getStorage(STORAGE_KEYS.accessToken);
    const companyId = getStorage(STORAGE_KEYS.selectedCompanyId);
    const branchId = getStorage(STORAGE_KEYS.selectedBranchId);
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
    if (companyId) headers.set("x-company-id", companyId);
    if (branchId) headers.set("x-branch-id", branchId);
    headers.set("accept", "application/json");
    return headers;
  },
});

let refreshPromise = null;
const noRefresh = new Set(["/auth/login", "/auth/pin", "/auth/register-owner", "/auth/refresh"]);

async function baseQueryWithReauth(args, api, extraOptions) {
  let result = await transport(args, api, extraOptions);
  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status !== 401 || noRefresh.has(url)) return result;
  if (!refreshPromise) {
    refreshPromise = transport({ url: "/auth/refresh", method: "POST", body: {} }, api, extraOptions)
      .then((refreshResult) => {
        if (refreshResult.data?.data) saveSession(refreshResult.data.data);
        else clearSession();
        return refreshResult;
      })
      .finally(() => { refreshPromise = null; });
  }
  const refreshed = await refreshPromise;
  if (refreshed.data?.data?.accessToken) result = await transport(args, api, extraOptions);
  return result;
}

const unwrap = (response) => response?.data;
const ALL_TAGS = ["Dashboard", "Company", "Branch", "Access", "Employee", "Product", "Inventory", "Customer", "Supplier", "Order", "Agent", "Delivery", "Invoice", "Payment", "Debt", "Return", "Notification", "Settings", "Report"];

async function optionalQuery(baseQuery, url) {
  const result = await baseQuery({ url, params: { limit: 100 } });
  if (result.error) {
    if ([403, 404].includes(Number(result.error.status))) return null;
    throw result.error;
  }
  return result.data?.data ?? null;
}

const bootstrapRoutes = {
  dashboard: "/dashboard", company: "/companies/current", branches: "/branches", roles: "/access/roles",
  permissions: "/access/permissions", users: "/employees", products: "/catalog/products", categories: "/catalog/categories",
  units: "/catalog/units", warehouses: "/inventory/warehouses", balances: "/inventory/stocks", movements: "/inventory/movements",
  reservations: "/inventory/reservations", adjustments: "/inventory/adjustments", transfers: "/inventory/transfers",
  inventoryCounts: "/inventory/counts", goodsReceipts: "/inventory/goods-receipts", customers: "/customers",
  suppliers: "/suppliers", orders: "/orders", agents: "/agents", pickLists: "/fulfillment/pick-lists",
  packing: "/fulfillment/packing", deliveryTrips: "/delivery/trips", deliveries: "/delivery/deliveries",
  invoices: "/invoices", payments: "/payments", ledger: "/finance", debts: "/finance/debts",
  cashTransactions: "/finance/cash-transactions", backendCurrencyRates: "/finance/currency-rates", returns: "/returns",
  paymentMethods: "/pos/payment-methods", cashboxes: "/pos/cashboxes", heldCarts: "/pos/held-carts", shifts: "/pos/shifts",
  employeeTypes: "/workforce/employee-types", salaryKpi: "/workforce/kpis", salaryPayments: "/workforce/salary-payments",
  workflowNotifications: "/notifications", settingsRecord: "/settings", priceLists: "/pricing", territories: "/routes/territories",
  routeTemplates: "/routes/templates", routePlans: "/routes/plans", visits: "/visits", approvals: "/approvals", activityLog: "/audit",
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ALL_TAGS,
  endpoints: (builder) => ({
    login: builder.mutation({ query: (body) => ({ url: "/auth/login", method: "POST", body }), transformResponse: unwrap }),
    pinLogin: builder.mutation({ query: (body) => ({ url: "/auth/pin", method: "POST", body }), transformResponse: unwrap }),
    registerOwner: builder.mutation({ query: (body) => ({ url: "/auth/register-owner", method: "POST", body }), transformResponse: unwrap }),
    me: builder.query({ query: () => "/auth/me", transformResponse: unwrap }),
    logout: builder.mutation({ query: () => ({ url: "/auth/logout", method: "POST" }) }),
    changePassword: builder.mutation({ query: (body) => ({ url: "/auth/change-password", method: "POST", body }) }),
    forgotPassword: builder.mutation({ query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }), transformResponse: unwrap }),
    resetPassword: builder.mutation({ query: (body) => ({ url: "/auth/reset-password", method: "POST", body }), transformResponse: unwrap }),
    sessions: builder.query({ query: () => "/auth/sessions", transformResponse: unwrap }),
    revokeSession: builder.mutation({ query: (id) => ({ url: `/auth/sessions/${id}`, method: "DELETE" }) }),
    bootstrap: builder.query({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        try {
          const entries = await Promise.all(Object.entries(bootstrapRoutes).map(async ([key, url]) => [key, await optionalQuery(baseQuery, url)]));
          return { data: Object.fromEntries(entries) };
        } catch (error) { return { error }; }
      },
      providesTags: ALL_TAGS,
    }),
    request: builder.mutation({
      query: ({ url, method = "POST", body, params }) => ({ url, method, body, params }),
      transformResponse: unwrap,
      invalidatesTags: ALL_TAGS,
    }),
  }),
});

export const {
  useBootstrapQuery, useChangePasswordMutation, useForgotPasswordMutation, useLoginMutation,
  useLogoutMutation, useMeQuery, usePinLoginMutation, useRegisterOwnerMutation,
  useResetPasswordMutation, useRevokeSessionMutation, useSessionsQuery,
} = baseApi;

export { clearSession, saveSession };

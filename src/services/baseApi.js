import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { STORAGE_KEYS } from '../constants/storageKeys';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const baseUrl = rawBaseUrl.replace(/\/$/, '');

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers) => {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const companyId = localStorage.getItem(STORAGE_KEYS.selectedCompanyId);
    const branchId = localStorage.getItem(STORAGE_KEYS.selectedBranchId);

    if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
    if (companyId) headers.set('x-company-id', companyId);
    if (branchId) headers.set('x-branch-id', branchId);

    headers.set('accept', 'application/json');
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: rawBaseQuery,
  tagTypes: [
    'Dashboard',
    'Product',
    'Inventory',
    'Customer',
    'Order',
    'Agent',
    'Delivery',
    'Invoice',
    'Payment',
    'Debt',
    'Return',
    'Notification',
    'Settings',
  ],
  endpoints: () => ({}),
});

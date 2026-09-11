export const API_ENDPOINTS = Object.freeze({
  health: '/health',
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  dashboard: {
    summary: '/dashboard/summary',
  },
  products: '/products',
  inventory: '/inventory',
  customers: '/customers',
  orders: '/orders',
  agents: '/agents',
  delivery: '/deliveries',
  payments: '/payments',
  reports: '/reports',
  notifications: '/notifications',
  settings: '/settings',
});

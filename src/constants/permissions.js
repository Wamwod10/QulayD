export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: "dashboard.view",
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",
  ORDERS_VIEW: "orders.view",
  ORDERS_CREATE: "orders.create",
  ORDERS_APPROVE: "orders.approve",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_RECEIVE: "inventory.receive",
  INVENTORY_TRANSFER: "inventory.transfer",
  INVENTORY_ADJUST: "inventory.adjust",
  FULFILLMENT_VIEW: "fulfillment.view",
  FULFILLMENT_EXECUTE: "fulfillment.execute",
  DELIVERY_VIEW: "delivery.view",
  DELIVERY_PLAN: "delivery.plan",
  DELIVERY_EXECUTE: "delivery.execute",
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_COLLECT: "payments.collect",
  FINANCE_VIEW: "finance.view",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
  ACCESS_MANAGE: "access.manage",
  TASKS_ASSIGN: "tasks.assign",
  TASKS_VIEW_TEAM: "tasks.viewTeam",
});

const ALL = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = Object.freeze({
  OWNER: ALL,
  ADMIN: ALL,
  EMPLOYEE: [],
  SUPER_ADMIN: [],
});

export function permissionsForRoles(roles = []) {
  return [...new Set((roles || []).flatMap((role) => ROLE_PERMISSIONS[role] || []))];
}

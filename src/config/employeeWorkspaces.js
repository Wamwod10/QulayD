export const EMPLOYEE_WORKSPACES = Object.freeze({
  agent_workspace: {
    label: "Agent ish joyi",
    shortLabel: "Agent",
    description: "Marshrut, mijoz tashrifi, buyurtma va to‘lovlarni agent uchun soddalashtirilgan ko‘rinishda boshqarish.",
    path: "/workspaces/agent",
    icon: "agents",
    suggestedEmployeeTypes: ["SALES_AGENT", "AGENT", "MERCHANDISER"],
    modules: ["agents", "routes", "partners", "sales", "finance"],
    permissions: ["agent_workspace.read", "agents.read", "agents.create", "agents.update", "routes.read", "partners.read", "partners.create", "partners.update", "sales.read", "sales.create", "sales.update", "finance.read", "finance.create"],
  },
  warehouse_workspace: {
    label: "Omborchi ish joyi",
    shortLabel: "Omborchi",
    description: "Kirim, qoldiq, transfer va inventarizatsiya vazifalarini omborchi uchun jamlash.",
    path: "/workspaces/warehouse",
    icon: "inventory",
    suggestedEmployeeTypes: ["WAREHOUSE", "WAREHOUSEMAN", "STOREKEEPER"],
    modules: ["inventory", "fulfillment"],
    permissions: ["warehouse_workspace.read", "inventory.read", "inventory.create", "inventory.update", "fulfillment.read", "fulfillment.update"],
  },
  fulfillment_workspace: {
    label: "Yig‘uvchi / Qadoqlovchi ish joyi",
    shortLabel: "Tayyorlash",
    description: "Pick list, yig‘ish, qadoqlash va tayyor holatga o‘tkazish vazifalari.",
    path: "/workspaces/fulfillment",
    icon: "fulfillment",
    suggestedEmployeeTypes: ["PICKER", "PACKER", "FULFILLMENT"],
    modules: ["fulfillment", "inventory"],
    permissions: ["fulfillment_workspace.read", "fulfillment.read", "fulfillment.update", "inventory.read"],
  },
  driver_workspace: {
    label: "Haydovchi ish joyi",
    shortLabel: "Haydovchi",
    description: "Bugungi reys, manzillar, navigatsiya va yetkazish natijalarini haydovchi uchun ko‘rsatish.",
    path: "/workspaces/driver",
    icon: "delivery",
    suggestedEmployeeTypes: ["DELIVERY_DRIVER", "DRIVER", "COURIER"],
    modules: ["delivery", "routes"],
    permissions: ["driver_workspace.read", "delivery.read", "delivery.update", "routes.read"],
  },
  sales_operator_workspace: {
    label: "Sotuv operatori ish joyi",
    shortLabel: "Operator",
    description: "Telefon buyurtmalari, mijoz, narx va buyurtma holatini operator uchun soddalashtirish.",
    path: "/workspaces/sales-operator",
    icon: "sales",
    suggestedEmployeeTypes: ["SALES_OPERATOR", "OPERATOR"],
    modules: ["sales", "partners", "inventory"],
    permissions: ["sales_operator_workspace.read", "sales.read", "sales.create", "sales.update", "partners.read", "partners.create", "partners.update", "inventory.read"],
  },
  cashier_workspace: {
    label: "Kassir / Inkassator ish joyi",
    shortLabel: "Kassir",
    description: "To‘lov, qarzdorlik, kassa va kunlik topshirish jarayonlari uchun alohida ish joyi.",
    path: "/workspaces/cashier",
    icon: "finance",
    suggestedEmployeeTypes: ["CASHIER", "COLLECTOR", "INKASSATOR"],
    modules: ["pos", "finance", "partners"],
    permissions: ["cashier_workspace.read", "pos.read", "pos.create", "pos.update", "finance.read", "finance.create", "partners.read"],
  },
});

export const EMPLOYEE_WORKSPACE_KEYS = Object.freeze(Object.keys(EMPLOYEE_WORKSPACES));
export const EMPLOYEE_WORKSPACE_OPTIONS = Object.freeze(Object.entries(EMPLOYEE_WORKSPACES));

export function isEmployeeWorkspace(key) {
  return EMPLOYEE_WORKSPACE_KEYS.includes(key);
}

export function suggestedWorkspaceForEmployeeType(code = "", name = "") {
  const normalized = `${code} ${name}`.trim().toUpperCase();
  if (["YETKAZIB BERUVCHI", "HAYDOVCHI", "KURYER"].some((value) => normalized.includes(value))) return "driver_workspace";
  return EMPLOYEE_WORKSPACE_OPTIONS.find(([, item]) => item.suggestedEmployeeTypes.some((type) => normalized.split(/\s+/).includes(type)))?.[0] || "";
}

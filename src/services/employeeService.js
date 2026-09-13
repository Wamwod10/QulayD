import { apiRequest } from "./authService";

export async function createEmployeeIdentity(payload) {
  const name = String(payload.name || "").trim();
  const title = String(payload.title || "").trim();
  if (!name || !title) throw new Error("Xodim ismi va lavozimini kiriting.");
  if (!String(payload.login || "").trim()) throw new Error("Loginni kiriting.");
  if (String(payload.password || "").length < 8 || !/[A-Z]/.test(payload.password) || !/[a-z]/.test(payload.password) || !/\d/.test(payload.password)) throw new Error("Parol kamida 8 belgi, katta-kichik harf va raqamdan iborat bo‘lsin.");
  if (!/^\d{4,8}$/.test(String(payload.pin || ""))) throw new Error("PIN 4–8 ta raqamdan iborat bo‘lsin.");
  if (!Array.isArray(payload.moduleAccess) || !payload.moduleAccess.length) throw new Error("Kamida bitta modulni tanlang.");

  const [roles, branches, warehouses, employeeTypes] = await Promise.all([
    apiRequest({ url: "/access/roles", method: "GET" }), apiRequest({ url: "/branches", method: "GET", params: { limit: 100 } }),
    apiRequest({ url: "/inventory/warehouses", method: "GET", params: { limit: 100 } }), apiRequest({ url: "/workforce/employee-types", method: "GET", params: { limit: 100 } }),
  ]);
  const requested = payload.role || payload.roles?.[0] || "EMPLOYEE";
  const role = roles.find((item) => item.code === requested) || roles.find((item) => item.code === "EMPLOYEE") || roles.find((item) => item.code === "SALES_AGENT");
  if (!role) throw new Error("Xodim uchun backend roli topilmadi.");
  const branch = branches.find((item) => item.name === payload.branch) || branches[0];
  const warehouse = warehouses.find((item) => item.id === payload.warehouseId);
  const employeeType = employeeTypes.find((item) => item.code === requested);
  return apiRequest({ url: "/employees", body: { name, title, login: payload.login.trim(), phone: payload.phone?.trim() || undefined,
    password: payload.password, pin: payload.pin, branchId: branch?.id || null, warehouseId: warehouse?.id || null,
    employeeTypeId: employeeType?.id || null, status: "ACTIVE", roleIds: [role.id], modules: payload.moduleAccess } });
}

export async function updateEmployeeRecord(employeeId, patch) {
  const body = { ...patch };
  if (body.status === "INACTIVE") body.status = "BLOCKED";
  delete body.role; delete body.roles; delete body.image; delete body.branch; delete body.territory;
  return apiRequest({ url: `/employees/${employeeId}`, method: "PATCH", body });
}

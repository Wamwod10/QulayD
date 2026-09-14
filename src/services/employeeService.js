import { apiRequest } from "./authService";

async function loadEmployeeReferences() {
  const [roles, branches, warehouses, employeeTypes] = await Promise.all([
    apiRequest({ url: "/access/roles", method: "GET" }),
    apiRequest({ url: "/branches", method: "GET", params: { limit: 100 } }),
    apiRequest({ url: "/inventory/warehouses", method: "GET", params: { limit: 100 } }),
    apiRequest({ url: "/workforce/employee-types", method: "GET", params: { limit: 100 } }),
  ]);
  return { roles, branches, warehouses, employeeTypes };
}

function validateCommon(payload) {
  const name = String(payload.name || "").trim();
  const title = String(payload.title || "").trim();
  if (!name || !title) throw new Error("Xodim ismi va lavozimini kiriting.");
  if (!String(payload.login || "").trim() && !String(payload.phone || "").trim()) throw new Error("Login yoki telefonni kiriting.");
  if (!Array.isArray(payload.moduleAccess) || !payload.moduleAccess.length) throw new Error("Kamida bitta modul yoki xodim ish joyini tanlang.");
  if (payload.pin && !/^\d{4,8}$/.test(String(payload.pin))) throw new Error("PIN 4–8 ta raqamdan iborat bo‘lsin.");
  return { name, title };
}

function resolveAssignments(payload, refs) {
  const requested = payload.role || payload.roles?.[0] || "EMPLOYEE";
  const role = refs.roles.find((item) => item.code === requested)
    || refs.roles.find((item) => item.code === "EMPLOYEE")
    || refs.roles.find((item) => item.code === "SALES_AGENT");
  if (!role) throw new Error("Xodim uchun backend roli topilmadi.");
  const branch = refs.branches.find((item) => item.id === payload.branchId)
    || refs.branches.find((item) => item.name === payload.branch)
    || refs.branches[0];
  const warehouse = refs.warehouses.find((item) => item.id === payload.warehouseId);
  const employeeType = refs.employeeTypes.find((item) => item.id === payload.employeeTypeId)
    || refs.employeeTypes.find((item) => item.code === requested);
  return { role, branch, warehouse, employeeType };
}

export async function createEmployeeIdentity(payload) {
  const { name, title } = validateCommon(payload);
  if (String(payload.password || "").length < 8 || !/[A-Z]/.test(payload.password) || !/[a-z]/.test(payload.password) || !/\d/.test(payload.password)) {
    throw new Error("Parol kamida 8 belgi, katta-kichik harf va raqamdan iborat bo‘lsin.");
  }
  if (!/^\d{4,8}$/.test(String(payload.pin || ""))) throw new Error("PIN 4–8 ta raqamdan iborat bo‘lsin.");
  const refs = await loadEmployeeReferences();
  const { role, branch, warehouse, employeeType } = resolveAssignments(payload, refs);
  return apiRequest({ url: "/employees", body: {
    name, title, login: payload.login?.trim() || undefined, phone: payload.phone?.trim() || undefined,
    password: payload.password, pin: payload.pin, branchId: branch?.id || null, warehouseId: warehouse?.id || null,
    employeeTypeId: employeeType?.id || null, status: "ACTIVE", roleIds: [role.id], modules: payload.moduleAccess,
  } });
}

export async function updateEmployeeIdentity(employeeId, payload) {
  const { name, title } = validateCommon(payload);
  const refs = await loadEmployeeReferences();
  const { role, branch, warehouse, employeeType } = resolveAssignments(payload, refs);
  const body = {
    name, title, login: payload.login?.trim() || undefined, phone: payload.phone?.trim() || undefined,
    branchId: branch?.id || null, warehouseId: warehouse?.id || null, employeeTypeId: employeeType?.id || null,
    status: payload.status || "ACTIVE", roleIds: [role.id], modules: payload.moduleAccess,
  };
  if (payload.pin) body.pin = payload.pin;
  return apiRequest({ url: `/employees/${employeeId}`, method: "PATCH", body });
}

export async function updateEmployeeRecord(employeeId, patch) {
  const body = { ...patch };
  if (body.status === "INACTIVE") body.status = "BLOCKED";
  delete body.role; delete body.roles; delete body.image; delete body.branch; delete body.territory;
  return apiRequest({ url: `/employees/${employeeId}`, method: "PATCH", body });
}

export async function removeEmployeeRecord(employeeId) {
  return apiRequest({ url: `/employees/${employeeId}`, method: "DELETE" });
}

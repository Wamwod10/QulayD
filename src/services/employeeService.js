import { getCompanyPlanLimits } from "./authService";
import { makeId, updateLocalDb } from "./localDb";

const SYSTEM_EMPLOYEE_TYPES = new Set(["SALES_AGENT", "SALES_MANAGER", "DELIVERY_DRIVER", "WAREHOUSE_WORKER", "OTHER"]);


function resolveEmployeeType(db, requested) {
  const value = String(requested || "OTHER");
  if (SYSTEM_EMPLOYEE_TYPES.has(value)) return value;
  const custom = (db.employeeTypes || []).find((item) => item.code === value && item.status !== "INACTIVE");
  return custom?.code || "OTHER";
}

function syncAgentRecord(db, employee) {
  const role = employee.role || employee.roles?.[0] || "OTHER";
  let agent = (db.agents || []).find((item) => item.employeeId === employee.id);

  if (role !== "SALES_AGENT") {
    if (agent) agent.status = "INACTIVE";
    return;
  }

  if (!agent) {
    agent = {
      id: makeId("agt"),
      employeeId: employee.id,
      name: employee.name,
      phone: employee.phone,
      territory: employee.territory || "Biriktirilmagan",
      address: employee.address || "",
      image: employee.image || "",
      latitude: employee.latitude,
      longitude: employee.longitude,
      activityStatus: "OFFLINE",
      status: employee.status || "ACTIVE",
      visitsToday: 0,
      plannedVisitsToday: 0,
      ordersToday: 0,
      paymentsToday: 0,
      salesToday: 0,
    };
    db.agents.unshift(agent);
  } else {
    Object.assign(agent, {
      employeeId: employee.id,
      name: employee.name,
      phone: employee.phone,
      territory: employee.territory || "Biriktirilmagan",
      address: employee.address || "",
      image: employee.image || "",
      latitude: employee.latitude,
      longitude: employee.longitude,
      status: employee.status || "ACTIVE",
    });
  }
}

export function createEmployeeIdentity(payload) {
  const cleanName = String(payload.name || "").trim();
  const cleanTitle = String(payload.title || "").trim();
  const cleanPhone = String(payload.phone || "").trim();
  if (!cleanName) throw new Error("Xodim ismini kiriting.");
  if (!cleanTitle) throw new Error("Lavozimni kiriting.");
  if (!cleanPhone) throw new Error("Telefon raqamini kiriting.");

  let created = null;
  updateLocalDb((db) => {
    const requestedRole = Array.isArray(payload.roles) && payload.roles.length ? payload.roles[0] : payload.role || "OTHER";
    const role = resolveEmployeeType(db, requestedRole);
    const normalized = cleanPhone.replace(/\D/g, "");
    if ((db.users || []).some((item) => item.role !== "OWNER" && String(item.phone || "").replace(/\D/g, "") === normalized)) {
      throw new Error("Bu telefon raqami bilan xodim allaqachon mavjud.");
    }
    const limits = getCompanyPlanLimits(payload.companyId) || {};
    const limit = Number(limits.employees || 0);
    const current = (db.users || []).filter((item) => item.role !== "OWNER" && item.status !== "DELETED").length;
    if (limit && current >= limit) throw new Error(`Tarif bo‘yicha xodimlar limiti ${limit} ta.`);

    created = {
      id: makeId("emp"),
      name: cleanName,
      title: cleanTitle,
      phone: cleanPhone,
      image: String(payload.image || ""),
      roles: [role],
      role,
      branch: payload.branch || "Bosh filial",
      warehouseId: payload.warehouseId || "",
      territory: payload.territory || "",
      baseSalary: Number(payload.baseSalary || 0),
      kpiBonus: Number(payload.kpiBonus || 0),
      salesBonusPercent: Number(payload.salesBonusPercent || 0),
      latitude: Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : null,
      longitude: Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : null,
      address: payload.address || "",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(created);
    syncAgentRecord(db, created);
  });
  return created;
}

export function updateEmployeeRecord(employeeId, patch) {
  let updated = null;
  updateLocalDb((db) => {
    const employee = (db.users || []).find((item) => item.id === employeeId);
    if (!employee) throw new Error("Xodim topilmadi.");
    const nextPatch = { ...patch };
    if (nextPatch.role) {
      nextPatch.role = resolveEmployeeType(db, nextPatch.role);
      nextPatch.roles = [nextPatch.role];
    }
    Object.assign(employee, nextPatch, { updatedAt: new Date().toISOString() });
    updated = employee;
    syncAgentRecord(db, employee);
  });
  return updated;
}

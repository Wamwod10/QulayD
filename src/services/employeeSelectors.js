export function getOperationalAgents(db, { includeInactive = false } = {}) {
  return (db?.agents || []).filter((agent) => {
    if (includeInactive) return agent?.status !== "DELETED";
    return agent?.status === "ACTIVE";
  });
}


export function getOperationalEmployees(db, role = null) {
  return (db?.users || []).filter((employee) => {
    if (!employee || employee.status !== "ACTIVE") return false;
    if (["OWNER", "ADMIN"].includes(employee.role)) return false;
    if (!role) return true;
    return (employee.roles || [employee.role].filter(Boolean)).includes(role);
  });
}

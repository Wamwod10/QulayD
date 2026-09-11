export function calculateSalary(record = {}, fallback = {}) {
  const base = Number(record.baseSalary ?? fallback.baseSalary ?? 0);
  const kpiActual = Math.max(0, Number(record.kpiActual ?? 0));
  const kpiTarget = Math.max(1, Number(record.kpiTarget ?? 100));
  const configuredKpiBonus = Number(record.kpiBonus ?? fallback.kpiBonus ?? 0);
  const earnedKpiBonus = Math.round(configuredKpiBonus * Math.min(kpiActual / kpiTarget, 1));
  const salesBonus = Number(record.salesBonus ?? 0);
  const penalties = Number(record.penalties ?? 0);
  const adjustments = Number(record.adjustments ?? 0);
  const total = Math.max(0, base + earnedKpiBonus + salesBonus + adjustments - penalties);
  return { base, kpiActual, kpiTarget, configuredKpiBonus, earnedKpiBonus, salesBonus, penalties, adjustments, total };
}

export function getNextSalaryDate(payDay = 5, from = new Date()) {
  const safeDay = Math.max(1, Math.min(28, Number(payDay || 5)));
  let candidate = new Date(from.getFullYear(), from.getMonth(), safeDay, 9, 0, 0, 0);
  if (candidate.getTime() <= from.getTime()) candidate = new Date(from.getFullYear(), from.getMonth() + 1, safeDay, 9, 0, 0, 0);
  return candidate;
}

export function daysUntil(date, from = new Date()) {
  return Math.max(0, Math.ceil((date.getTime() - from.getTime()) / 86400000));
}

export function salaryHistoryFor(db, user) {
  return (db.salaryPayments || [])
    .filter((item) => item.employeeId === user?.id || item.employeeName === user?.name)
    .sort((a, b) => String(b.month || b.paidAt || "").localeCompare(String(a.month || a.paidAt || "")));
}

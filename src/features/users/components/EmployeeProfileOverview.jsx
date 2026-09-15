import { Activity, Banknote, BriefcaseBusiness, Building2, MapPin, Phone, Route, Target, UserRound, Warehouse } from "lucide-react";

import YandexMap from "../../../components/maps/YandexMap";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { calculateSalary } from "../../../services/employeeFinance";
import { formatDateTime, formatMoney } from "../../../utils/formatters";
import { getRoleLabel } from "../../../utils/labels";

function EmployeeProfileOverview({ db, employee }) {
  if (!employee) return null;
  const role = employee.employeeType?.code || employee.role || employee.roles?.find((item) => !["EMPLOYEE", "ADMIN", "OWNER"].includes(item)) || employee.roles?.[0] || "OTHER";
  const branchName = typeof employee.branch === "string" ? employee.branch : employee.branch?.name || db.branches?.find((item) => item.id === employee.branchId)?.name || "—";
  const warehouseName = typeof employee.warehouse === "string" ? employee.warehouse : employee.warehouse?.name || db.warehouses?.find((item) => item.id === employee.warehouseId)?.name || "Biriktirilmagan";
  const agent = (db.agents || []).find((item) => item.employeeId === employee.id || item.name === employee.name);
  const kpi = (db.salaryKpi || []).find((item) => item.employeeId === employee.id || item.employeeName === employee.name);
  const salary = calculateSalary(kpi || {}, employee);
  const orders = role === "SALES_AGENT" ? (db.orders || []).filter((item) => item.agentId === agent?.id) : [];
  const visits = role === "SALES_AGENT" ? (db.visits || []).filter((item) => item.agentId === agent?.id) : [];
  const trips = role === "DELIVERY_DRIVER" ? (db.deliveryTrips || []).filter((item) => item.driverEmployeeId === employee.id || item.driver === employee.name) : [];
  const activity = (db.activityLog || []).filter((item) => item.actorId === employee.id || item.entityId === employee.id || item.metadata?.employeeId === employee.id).slice(0, 10);
  const point = agent?.latitude && agent?.longitude ? [{ id: agent.id, name: agent.name, latitude: agent.latitude, longitude: agent.longitude, status: agent.activityStatus || agent.status }] : [];

  return <div className="qp-employee-profile">
    <section className="qp-employee-hero qp-card"><div className="qp-employee-avatar"><UserRound size={28}/></div><div className="qp-employee-identity"><span>Xodim profili</span><h2>{employee.name}</h2><p>{employee.title || getRoleLabel(role)}</p><div className="qp-employee-tags"><StatusPill status={employee.status || "ACTIVE"}/><b>{getRoleLabel(role)}</b></div></div><div className="qp-employee-hero-stats"><div><BriefcaseBusiness size={17}/><span>Buyurtmalar</span><strong>{orders.length}</strong></div><div><Target size={17}/><span>KPI</span><strong>{kpi?.kpiActual || 0}%</strong></div><div><Banknote size={17}/><span>Hisoblangan oylik</span><strong>{formatMoney(salary.total)}</strong></div></div></section>
    <div className="qp-employee-detail-grid"><section className="qp-card qp-employee-info-card"><div className="qp-card-head"><div><span>Profil</span><h3>Ish ma’lumotlari</h3></div><BriefcaseBusiness size={18}/></div><div className="qp-employee-info-list"><div><Phone size={16}/><span>Telefon</span><strong>{employee.phone || "—"}</strong></div><div><Building2 size={16}/><span>Filial</span><strong>{branchName}</strong></div><div><Warehouse size={16}/><span>Ombor</span><strong>{warehouseName}</strong></div><div><MapPin size={16}/><span>Hudud</span><strong>{employee.territory || "Biriktirilmagan"}</strong></div></div></section>
    <section className="qp-card qp-employee-money-card"><div className="qp-card-head"><div><span>Natija</span><h3>KPI va oylik</h3></div><Target size={18}/></div><div className="qp-employee-pay-total"><span>Joriy hisob</span><strong>{formatMoney(salary.total)}</strong><small>Owner uchun hisoblangan ko‘rsatkich</small></div><div className="qp-employee-money-breakdown"><div><span>Bazaviy</span><strong>{formatMoney(salary.base)}</strong></div><div><span>KPI bonusi</span><strong>+{formatMoney(salary.earnedKpiBonus)}</strong></div><div><span>Savdo bonusi</span><strong>+{formatMoney(salary.salesBonus)}</strong></div></div></section></div>
    <div className="qp-employee-detail-grid"><section className="qp-card"><div className="qp-card-head"><div><span>Operatsiyalar</span><h3>Bog‘liq faoliyat</h3></div><Activity size={18}/></div><div className="qp-employee-task-summary"><div><span>Buyurtmalar</span><strong>{orders.length}</strong></div><div><span>Tashriflar</span><strong>{visits.length}</strong></div><div><span>Reyslar</span><strong>{trips.length}</strong></div></div></section><section className="qp-card"><div className="qp-card-head"><div><span>Mas’uliyat</span><h3>Owner nazorati</h3></div><BriefcaseBusiness size={18}/></div><p className="qp-muted">Bu xodimga berilgan login/parol yoki PIN orqali QULAY’ga kiradi. U faqat biriktirilgan ish joylari va ruxsat etilgan biznes modullarini ko‘radi.</p></section></div>
    {role === "SALES_AGENT" && point.length ? <section className="qp-card qp-employee-map-card"><div className="qp-card-head"><div><span>Xarita</span><h3>Oxirgi ma’lum joylashuv</h3></div><Route size={18}/></div><div className="qp-employee-map-meta"><div><span>Holat</span><strong>{agent?.activityStatus || "Offline"}</strong></div><div><span>Oxirgi yangilanish</span><strong>{agent?.lastLocationAt ? formatDateTime(agent.lastLocationAt) : "Aniqlanmagan"}</strong></div><div><span>Hudud</span><strong>{agent?.territory || employee.territory || "Biriktirilmagan"}</strong></div></div><YandexMap points={point} height={340}/></section> : null}
    <section className="qp-card"><div className="qp-card-head"><div><span>Tarix</span><h3>Faoliyat timeline</h3></div><Activity size={18}/></div><div className="qp-employee-activity">{activity.length ? activity.map((entry)=><div key={entry.id}><i/><div><strong>{entry.title}</strong><span>{entry.description || entry.actorName || ""}</span><small>{formatDateTime(entry.createdAt)}</small></div></div>) : <div className="qp-role-empty">Hali faoliyat yozuvi yo‘q.</div>}</div></section>
  </div>;
}
export default EmployeeProfileOverview;

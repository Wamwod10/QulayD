import { ArrowRight, PackageCheck, Plus, Truck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { approveOrderRequest, rejectOrderRequest, sendOrderToPreparation } from "../../../services/prototypeActions";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../services/notify";
import { formatDateTime, formatMoney, formatRelativeDateTime, getName, shortDate } from "../../../utils/formatters";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import { useModuleAccess } from "../../../hooks/useModuleAccess";

function ownerStage(order) {
  if (order.approvalStatus === "PENDING") return { label: "Tasdiq kutilmoqda", status: "PENDING" };
  if (order.deliveryStatus === "FAILED") return { label: "Muammoli", status: "FAILED" };
  if (order.deliveryStatus === "DELIVERED") return { label: "Yakunlandi", status: "COMPLETED" };
  if (["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED"].includes(order.deliveryStatus)) return { label: "Yetkazilmoqda", status: "OUT_FOR_DELIVERY" };
  if (["RESERVED", "PICKING", "PICKED", "PACKING", "PACKED", "FULFILLED"].includes(order.fulfillmentStatus)) return { label: "Tayyorlanmoqda", status: order.fulfillmentStatus === "FULFILLED" ? "READY" : "PICKING" };
  return { label: "Yangi", status: "PENDING" };
}

function currentResponsibility(db, order) {
  if (order.approvalStatus === "PENDING") return { label: "Tasdiqlash", name: "Owner tasdig‘i", since: order.createdAt };
  if (["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED"].includes(order.deliveryStatus)) {
    const delivery = (db.deliveries || []).find((item) => item.orderId === order.id);
    const trip = (db.deliveryTrips || []).find((item) => item.id === delivery?.tripId);
    return { label: "Yetkazib berish", name: trip?.driverName || trip?.driver?.name || "Haydovchi tanlanmagan", since: trip?.startedAt || trip?.createdAt };
  }
  if (["RESERVED", "PICKING", "PICKED", "PACKING", "PACKED", "FULFILLED"].includes(order.fulfillmentStatus)) {
    const pick = (db.pickLists || []).find((item) => item.orderId === order.id);
    return { label: "Tayyorlash", name: pick?.picker || "Ombor jamoasi", since: pick?.startedAt || order.updatedAt || order.createdAt };
  }
  const agent = (db.agents || []).find((item) => item.id === order.agentId);
  return { label: "Buyurtma", name: agent?.name || "Biznes egasi", since: order.createdAt };
}

function OrderDetail({ row: selectedRow, db, navigate, isOwner }) {
  const { isEnabled } = useModuleAccess();
  const row = db.orders.find((item) => item.id === selectedRow.id) || selectedRow;
  const [agentId, setAgentId] = useState(row.agentId || "");
  const responsibility = currentResponsibility(db, row);
  const stage = ownerStage(row);
  const activity = (db.activityLog || []).filter((entry) => entry.entityType === "ORDER" && entry.entityId === row.id).slice(0, 12);

  const saveAgent = async () => {
    try { await apiRequest({ url: `/orders/${row.id}`, method: "PATCH", body: { agentId: agentId || null } }); notify("Mas’ul agent yangilandi"); }
    catch (error) { notify(error.message, "danger"); }
  };

  const nextAction = async () => {
    if (row.approvalStatus === "PENDING") {
      if (!isOwner) { notify("Buyurtma Owner tasdig‘ini kutmoqda", "info"); return; }
      const result = await approveOrderRequest(row.id); notify(result.message, result.ok ? "success" : "warning"); return;
    }
    if (["DRAFT", "UNFULFILLED"].includes(row.status) || row.fulfillmentStatus === "UNFULFILLED") {
      const result = await sendOrderToPreparation(row.id); notify(result.message, result.ok ? "success" : "warning"); return;
    }
    if (row.fulfillmentStatus !== "FULFILLED") {
      navigate("/fulfillment"); return;
    }
    if (!["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED", "FAILED", "DELIVERED"].includes(row.deliveryStatus)) {
      navigate("/deliveries/planning"); return;
    }
    if (row.deliveryStatus !== "DELIVERED") navigate("/deliveries");
  };

  const actionLabel = row.approvalStatus === "PENDING"
    ? (isOwner ? "Buyurtmani tasdiqlash" : "Owner tasdig‘i kutilmoqda")
    : row.fulfillmentStatus === "UNFULFILLED"
      ? "Tayyorlashga yuborish"
      : row.fulfillmentStatus !== "FULFILLED"
        ? "Tayyorlashni ochish"
        : !["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED", "FAILED", "DELIVERED"].includes(row.deliveryStatus)
          ? "Yetkazishga yuborish"
          : row.deliveryStatus !== "DELIVERED" ? "Yetkazishni ochish" : "Yakunlangan";
  const canAct = row.approvalStatus === "PENDING" ? isOwner
    : row.fulfillmentStatus === "UNFULFILLED" ? isEnabled("fulfillment")
      : row.fulfillmentStatus !== "FULFILLED" ? isEnabled("fulfillment") : isEnabled("delivery");

  return <div className="qp-order-owner-detail">
    <section className="qp-order-current-owner"><div><span>Hozirgi bosqich</span><strong>{stage.label}</strong><small>{responsibility.name} · {responsibility.label}{responsibility.since ? ` · ${formatRelativeDateTime(responsibility.since)}` : ""}</small></div>{stage.label === "Yetkazilmoqda" ? <Truck size={22}/> : <PackageCheck size={22}/>}</section>
    <OrderStatusTimeline order={row}/>
    <section className="qp-order-smart-action"><div><span>Keyingi tavsiya</span><strong>{actionLabel}</strong><small>{row.approvalStatus === "PENDING" ? "Admin yaratgan buyurtma stock band qilinishidan oldin Owner qarorini kutadi." : "Qulay ortiqcha statuslarni yashiradi va keyingi kerakli amalni ko‘rsatadi."}</small></div>{row.deliveryStatus !== "DELIVERED" && canAct ? <div className="qp-order-smart-buttons">{row.approvalStatus === "PENDING" && isOwner ? <SecondaryButton onClick={async () => { const result = await rejectOrderRequest(row.id); notify(result.message, result.ok ? "warning" : "danger"); }}>Rad etish</SecondaryButton> : null}<PrimaryButton onClick={nextAction}>{actionLabel}<ArrowRight size={15}/></PrimaryButton></div> : row.deliveryStatus === "DELIVERED" ? <StatusPill status="COMPLETED"/> : null}</section>
    <div className="qp-drawer-details"><div className="qp-drawer-detail-row"><span>Mijoz</span><strong>{getName(db.customers, row.customerId)}</strong></div><div className="qp-drawer-detail-row"><span>Summa</span><strong>{formatMoney(row.total)}</strong></div><div className="qp-drawer-detail-row"><span>Ombor</span><strong>{getName(db.warehouses, row.warehouseId)}</strong></div></div>
    <section className="qp-order-products"><h3>Mahsulotlar</h3><div>{(row.items || []).map((item) => { const product = db.products.find((entry) => entry.id === item.productId); const unit = db.units.find((entry) => entry.id === product?.unitId); return <article key={`${row.id}-${item.productId}`}><div><strong>{product?.name || "Mahsulot"}</strong><span>{item.quantity} {unit?.shortName || unit?.name || ""} × {formatMoney(item.unitPrice ?? item.price)}</span></div><strong>{formatMoney(Number(item.total ?? (Number(item.quantity || 0) * Number(item.unitPrice ?? item.price || 0))))}</strong></article>; })}</div></section>
    <section className="qp-order-owner-assignment"><div><UserRound size={16}/><span>Mas’ul agent</span></div><div className="qp-inline-actions"><Select value={agentId} onChange={(event)=>setAgentId(event.target.value)}><option value="">Agent biriktirilmagan</option>{(db.agents || []).filter((agent)=>agent.status === "ACTIVE").map((agent)=><option key={agent.id} value={agent.id}>{agent.name} · {agent.territory || "Hudud yo‘q"}</option>)}</Select><SecondaryButton onClick={saveAgent}>Saqlash</SecondaryButton></div></section>
    <section className="qp-order-activity-detail"><h3>Faoliyat tarixi</h3>{activity.length ? activity.map((entry)=><div key={entry.id}><i/><div><strong>{entry.title}</strong><span>{entry.description || entry.actorName}</span><small>{formatDateTime(entry.createdAt)}</small></div></div>) : <div className="qp-muted">Hali faoliyat yozuvi yo‘q.</div>}</section>
  </div>;
}

function OrdersPage() {
  const db = useLocalDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = (user?.primaryRole || user?.roles?.[0]) === "OWNER";
  const rows = useMemo(() => db.orders.map((item) => ({ ...item, customer: getName(db.customers, item.customerId), agent: getName(db.agents, item.agentId, "—"), ownerStage: ownerStage(item) })), [db.agents, db.customers, db.orders]);
  return <SmartTablePage title="Buyurtmalar" description="Owner uchun soddalashtirilgan jarayon: Yangi → Tayyorlanmoqda → Yetkazilmoqda → Yakunlandi." eyebrow="Savdo" rows={rows} searchFields={["number", "customer", "agent", "status"]} actions={<PrimaryButton onClick={()=>navigate("/orders/new")}><Plus size={15}/> Yangi buyurtma</PrimaryButton>} columns={[
    { key:"number", label:"Buyurtma", render:(row)=><div><strong>{row.number}</strong><div className="qp-muted">{shortDate(row.date)}</div></div> },
    { key:"customer", label:"Mijoz" },
    { key:"agent", label:"Mas’ul agent" },
    { key:"ownerStage", label:"Jarayon", render:(row)=><StatusPill status={row.ownerStage.status} label={row.ownerStage.label}/> },
    { key:"total", label:"Summa", render:(row)=><strong>{formatMoney(row.total)}</strong> },
  ]} detailRenderer={(row)=><OrderDetail row={row} db={db} navigate={navigate} isOwner={isOwner}/>}/>;
}
export default OrdersPage;

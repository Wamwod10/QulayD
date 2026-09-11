import { AlertTriangle, ArrowLeft, ArrowRight, Clock3, PackageCheck, Truck, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Metric, PageShell, PrimaryButton, SecondaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../services/notify";
import { approveOrderRequest, rejectOrderRequest } from "../../../services/prototypeActions";
import { formatMoney, getName } from "../../../utils/formatters";

const TERMINAL = new Set(["CANCELLED", "VOID"]);

function stage(order, db) {
  if (order.approvalStatus === "PENDING") return { key: "APPROVAL", label: "Tasdiq kutilmoqda", status: "PENDING", owner: "Owner tasdig‘i" };
  if (order.deliveryStatus === "FAILED") return { key: "PROBLEM", label: "Muammoli", status: "FAILED", owner: "E’tibor talab qiladi" };
  if (order.deliveryStatus === "DELIVERED") return { key: "DONE", label: "Yakunlandi", status: "COMPLETED", owner: "Yetkazilgan" };
  if (["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED"].includes(order.deliveryStatus)) {
    const delivery = (db.deliveries || []).find((item) => item.orderId === order.id);
    const trip = (db.deliveryTrips || []).find((item) => item.id === delivery?.tripId);
    return { key: "DELIVERY", label: "Yetkazilmoqda", status: "OUT_FOR_DELIVERY", owner: trip?.driver || "Haydovchi tanlanmagan" };
  }
  if (["RESERVED", "PICKING", "PICKED", "PACKING", "PACKED", "READY", "COMPLETED"].includes(order.fulfillmentStatus)) {
    const pick = (db.pickLists || []).find((item) => item.orderId === order.id);
    return { key: "PREPARING", label: "Tayyorlanmoqda", status: order.fulfillmentStatus === "READY" ? "READY" : "PICKING", owner: pick?.picker || "Ombor jamoasi" };
  }
  return { key: "NEW", label: "Yangi", status: "PENDING", owner: getName(db.agents, order.agentId, "Biznes egasi") };
}

function LiveOperationsPage() {
  const db = useLocalDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = (user?.primaryRole || user?.roles?.[0]) === "OWNER";
  const [selectedId, setSelectedId] = useState("");
  const rows = useMemo(
    () => (db.orders || [])
      .filter((order) => !TERMINAL.has(order.status))
      .map((order) => ({ order, stage: stage(order, db) }))
      .sort((a, b) => String(b.order.updatedAt || b.order.createdAt || "").localeCompare(String(a.order.updatedAt || a.order.createdAt || ""))),
    [db],
  );
  const selected = rows.find((item) => item.order.id === selectedId) || rows[0];
  const counts = {
    new: rows.filter((item) => ["NEW", "APPROVAL"].includes(item.stage.key)).length,
    preparing: rows.filter((item) => item.stage.key === "PREPARING").length,
    delivery: rows.filter((item) => item.stage.key === "DELIVERY").length,
    problem: rows.filter((item) => item.stage.key === "PROBLEM").length,
  };
  const activity = selected
    ? (db.activityLog || []).filter((entry) => entry.entityType === "ORDER" && entry.entityId === selected.order.id).slice(0, 7)
    : [];

  return (
    <PageShell
      title="Operatsiyalar"
      description="Buyurtmalar qayerda turgani va qaysi biri e’tibor talab qilishini bir qarashda ko‘ring."
      eyebrow="Owner nazorat markazi"
      actions={<SecondaryButton type="button" onClick={() => navigate("/orders")}><Workflow size={15} /> Barcha buyurtmalar</SecondaryButton>}
    >
      <SummaryGrid className="qp-operations-metrics">
        <Metric label="Yangi" value={counts.new} hint="Tayyorlashni kutmoqda" icon={<Clock3 size={16} />} />
        <Metric label="Tayyorlanmoqda" value={counts.preparing} hint="Ombor jarayonida" icon={<PackageCheck size={16} />} />
        <Metric label="Yetkazilmoqda" value={counts.delivery} hint="Yetkazib berish oqimida" icon={<Truck size={16} />} />
        <Metric label="Muammoli" value={counts.problem} hint="E’tibor talab qiladi" icon={<AlertTriangle size={16} />} />
      </SummaryGrid>

      <div className="qp-operations-split">
        <section className="qp-card qp-operations-list">
          <div className="qp-operations-section-title">
            <div><span>Jonli oqim</span><h2>Faol buyurtmalar</h2></div>
            <b>{rows.length} ta</b>
          </div>
          <div>
            {rows.length ? rows.map(({ order, stage: current }) => (
              <button type="button" key={order.id} className={selected?.order.id === order.id ? "active" : ""} onClick={() => setSelectedId(order.id)}>
                <div><strong>{order.number}</strong><span>{getName(db.customers, order.customerId)} · {formatMoney(order.total)}</span></div>
                <div className="qp-operations-row-meta"><span>{current.owner}</span><StatusPill status={current.status} label={current.label} /></div>
                <ArrowRight size={16} />
              </button>
            )) : <div className="qp-empty"><strong>Faol buyurtma yo‘q</strong><span>Yangi buyurtmalar shu yerda ko‘rinadi.</span></div>}
          </div>
        </section>

        <aside className={`qp-card qp-operations-detail ${selectedId ? "is-mobile-open" : ""}`}>
          {selected ? <>
            <button type="button" className="qp-mobile-detail-back" onClick={() => setSelectedId("")}><ArrowLeft size={18} /> Faol buyurtmalar</button>
            <div className="qp-operations-detail-head">
              <div><span>{selected.order.number}</span><h2>{getName(db.customers, selected.order.customerId)}</h2><p>{formatMoney(selected.order.total)}</p></div>
              <StatusPill status={selected.stage.status} label={selected.stage.label} />
            </div>
            <div className="qp-operations-detail-grid">
              <div><span>Hozirgi bosqich</span><strong>{selected.stage.label}</strong></div>
              <div><span>Mas’ul</span><strong>{selected.stage.owner}</strong></div>
              <div><span>Agent</span><strong>{getName(db.agents, selected.order.agentId, "Biriktirilmagan")}</strong></div>
              <div><span>Ombor</span><strong>{getName(db.warehouses, selected.order.warehouseId)}</strong></div>
            </div>
            {selected.order.approvalStatus === "PENDING" ? <div className="qp-operations-approval-actions">{isOwner ? <><SecondaryButton type="button" onClick={() => { const result = rejectOrderRequest(selected.order.id); notify(result.message, result.ok ? "warning" : "danger"); }}>Rad etish</SecondaryButton><PrimaryButton type="button" onClick={() => { const result = approveOrderRequest(selected.order.id); notify(result.message, result.ok ? "success" : "warning"); }}>Tasdiqlash <ArrowRight size={15}/></PrimaryButton></> : <span>Owner qarori kutilmoqda</span>}</div> : <button type="button" className="qp-button qp-button-primary qp-operations-open" onClick={() => navigate("/orders")}>Buyurtmani boshqarish <ArrowRight size={15} /></button>}
            <div className="qp-operations-timeline">
              <h3>So‘nggi faoliyat</h3>
              {activity.length ? activity.map((entry) => (
                <div key={entry.id}><i className={entry.action?.includes("DELIVER") ? "done" : ""} /><span><strong>{entry.title}</strong><small>{entry.description || entry.actorName || ""}</small></span></div>
              )) : <p className="qp-muted">Faoliyat yozuvi yo‘q.</p>}
            </div>
          </> : <div className="qp-empty">Buyurtma tanlang</div>}
        </aside>
      </div>
    </PageShell>
  );
}

export default LiveOperationsPage;

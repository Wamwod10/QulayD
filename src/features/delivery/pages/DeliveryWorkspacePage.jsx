import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, MapPin, Navigation, PackageCheck, Route, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import NavigationAppModal from "../../../components/maps/NavigationAppModal";
import YandexMap from "../../../components/maps/YandexMap";
import { Field, Modal, PageShell, PrimaryButton, SecondaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import ImageUploader from "../../../components/ui/ImageUploader";
import Select from "../../../components/ui/Select";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { arriveDelivery, collectDeliveryPayment, completeDelivery, completePartialDelivery, failDelivery } from "../../../services/prototypeActions";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";

const TERMINAL_STOP_STATUSES = new Set(["DELIVERED", "PARTIALLY_DELIVERED", "FAILED", "CANCELLED"]);

function DeliveryWorkspacePage() {
  const db = useLocalDb();
  const navigate = useNavigate();
  const [selectedTripId, setSelectedTripId] = useState(db.deliveryTrips[0]?.id || null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [actionMode, setActionMode] = useState("");
  const [proof, setProof] = useState({ recipientName: "", photo: "", latitude: null, longitude: null, note: "" });
  const [partialItems, setPartialItems] = useState({});
  const paymentMethods = useMemo(() => (db.paymentMethods || []).filter((item) => item.status === "ACTIVE" && item.method !== "CREDIT"), [db.paymentMethods]);
  const [payment, setPayment] = useState({ methodCode: paymentMethods[0]?.code || "CASH", amount: "", externalRef: "", note: "" });

  const trips = db.deliveryTrips || [];
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) || trips[0];
  const tripDeliveries = useMemo(() => (db.deliveries || []).filter((delivery) => delivery.tripId === selectedTrip?.id)
    .sort((a, b) => Number(a.stopOrder || 999) - Number(b.stopOrder || 999)), [db.deliveries, selectedTrip?.id]);
  const selectedDelivery = tripDeliveries.find((item) => item.id === selectedDeliveryId) || tripDeliveries[0];
  const selectedOrder = (db.orders || []).find((item) => item.id === selectedDelivery?.orderId);
  const warehouse = (db.warehouses || []).find((item) => item.id === selectedTrip?.warehouseId) || db.warehouses?.[0];

  const stops = tripDeliveries.map((delivery, index) => {
    const customer = (db.customers || []).find((item) => item.id === delivery.customerId);
    return {
      id: delivery.id,
      title: customer?.name || `Yetkazib berish ${index + 1}`,
      description: customer?.address || customer?.territory || "Mijoz manzili",
      latitude: customer?.latitude,
      longitude: customer?.longitude,
      shortLabel: String(index + 1),
      delivery,
      customer,
    };
  });
  const routePoints = [
    ...(warehouse?.latitude && warehouse?.longitude ? [{ id: warehouse.id, title: warehouse.name, latitude: warehouse.latitude, longitude: warehouse.longitude, shortLabel: "O" }] : []),
    ...stops.filter((point) => point.latitude && point.longitude),
  ];

  const remainingItems = (selectedOrder?.items || []).map((line) => ({
    ...line,
    remaining: Math.max(0, Number(line.quantity || 0) - Number(line.fulfilledQty || 0)),
    productName: line.productName || line.product?.name || (db.products || []).find((product) => product.id === line.productId)?.name || "Mahsulot",
  })).filter((line) => line.remaining > 0);
  const orderPayments = (db.payments || []).filter((item) => item.orderId === selectedOrder?.id && ["PENDING", "CONFIRMED"].includes(item.status));
  const collectedAmount = orderPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paymentRemaining = Math.max(0, Number(selectedOrder?.total || 0) - collectedAmount);

  const delivered = (db.deliveries || []).filter((delivery) => delivery.status === "DELIVERED").length;
  const onRoad = (db.deliveries || []).filter((delivery) => ["OUT_FOR_DELIVERY", "PLANNED", "ARRIVED"].includes(delivery.status)).length;
  const failed = (db.deliveries || []).filter((delivery) => ["FAILED", "PARTIALLY_DELIVERED"].includes(delivery.status)).length;
  const plannedValue = (db.deliveries || []).filter((delivery) => ["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED"].includes(delivery.status))
    .reduce((sum, delivery) => sum + Number(delivery.total || delivery.order?.total || 0), 0);
  const canCompleteTrip = selectedTrip?.status === "IN_PROGRESS" && tripDeliveries.length > 0 && tripDeliveries.every((item) => TERMINAL_STOP_STATUSES.has(item.status));

  const startSelectedDelivery = async () => {
    if (!selectedDelivery) return;
    try { await apiRequest({ url: `/delivery/trips/${selectedDelivery.tripId}/start`, body: {} }); notify("Reys yo‘lga chiqdi"); }
    catch (error) { notify(error.message, "danger"); }
  };
  const arriveSelected = async () => {
    if (!selectedDelivery) return;
    const result = await arriveDelivery(selectedDelivery.id);
    notify(result?.message || "Manzilga yetib kelindi", result?.ok === false ? "warning" : "success");
  };
  const completeTrip = async () => {
    if (!selectedTrip) return;
    try { await apiRequest({ url: `/delivery/trips/${selectedTrip.id}/complete`, body: {} }); notify("Reys yakunlandi"); }
    catch (error) { notify(error.message, "danger"); }
  };

  const openAction = (mode) => {
    setActionMode(mode);
    setProof({ recipientName: "", photo: "", latitude: null, longitude: null, note: "" });
    setPartialItems({});
    setPayment({ methodCode: paymentMethods[0]?.code || "CASH", amount: paymentRemaining > 0 ? String(paymentRemaining) : "", externalRef: "", note: "" });
  };
  const closeAction = () => { setActionMode(""); setPartialItems({}); };
  const requestGps = () => {
    if (!navigator.geolocation) { notify("Qurilmada GPS mavjud emas", "warning"); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => setProof((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude })),
      () => notify("GPS joylashuvini olib bo‘lmadi", "danger"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const submitAction = async () => {
    if (!selectedDelivery) return;
    if (actionMode === "payment") {
      if (!(Number(payment.amount) > 0) || !payment.methodCode) { notify("To‘lov summasi va usulini kiriting", "warning"); return; }
      const result = await collectDeliveryPayment(selectedDelivery.id, payment);
      notify(result?.data?.status === "PENDING" ? "To‘lov yaratildi, tasdiq kutilmoqda" : result.message, result.ok ? "success" : "danger");
      if (result.ok) closeAction();
      return;
    }
    if (actionMode === "partial") {
      const rows = remainingItems.map((line) => ({ orderItemId: line.id, quantity: Number(partialItems[line.id] || 0) })).filter((line) => line.quantity > 0);
      if (!rows.length) { notify("Yetkazilgan miqdorni kiriting", "warning"); return; }
      const result = await completePartialDelivery(selectedDelivery.id, rows, proof);
      notify(result.message, result.ok ? "success" : "danger");
      if (result.ok) closeAction();
      return;
    }
    const result = await completeDelivery(selectedDelivery.id, proof);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) closeAction();
  };

  const failSelected = async () => {
    if (!selectedDelivery || (db.settings.delivery.requireFailureReason !== false && !failureReason.trim())) { notify("Muammo sababini kiriting", "warning"); return; }
    const result = await failDelivery(selectedDelivery.id, failureReason.trim() || "Yetkazib berilmadi");
    notify(result?.message || "Muammo qayd etildi", result?.ok === false ? "warning" : "success");
    if (result?.ok !== false) { setFailureOpen(false); setFailureReason(""); }
  };

  const proofFields = actionMode && actionMode !== "payment" ? <>
    {db.settings.delivery.requireRecipientName ? <Field label="Qabul qiluvchi ismi"><input className="qp-input" value={proof.recipientName} onChange={(event) => setProof({ ...proof, recipientName: event.target.value })} placeholder="Masalan, Azizbek" /></Field> : null}
    {db.settings.delivery.requirePhoto ? <div className="qp-form-span-full"><ImageUploader purpose="delivery-proof" value={proof.photo} name={proof.recipientName || "Yetkazish"} label="Yetkazilganini tasdiqlovchi foto" compact onChange={(photo) => setProof((current) => ({ ...current, photo }))} /></div> : null}
    {db.settings.delivery.requireGps ? <div className="qp-setting-row"><div className="qp-setting-copy"><strong>GPS joylashuvi</strong><span>{proof.latitude == null ? "Joylashuv olinmagan" : `${proof.latitude.toFixed(5)}, ${proof.longitude.toFixed(5)}`}</span></div><SecondaryButton type="button" onClick={requestGps}><MapPin size={15} /> GPS olish</SecondaryButton></div> : null}
    <Field label="Izoh" hint="Ixtiyoriy"><textarea className="qp-textarea" rows="3" value={proof.note} onChange={(event) => setProof({ ...proof, note: event.target.value })} /></Field>
  </> : null;

  return <>
    <PageShell title="Yetkazib berish markazi" description="Reyslar, haydovchilar, mijoz nuqtalari va yetkazish holatini Yandex xaritada boshqaring." eyebrow="Yetkazib berish" actions={<div className="qp-inline-actions"><SecondaryButton type="button" onClick={() => navigate("/delivery-trips")}>Reyslar ro‘yxati</SecondaryButton><PrimaryButton type="button" onClick={() => navigate("/deliveries/planning")}>+ Reys rejalashtirish</PrimaryButton></div>}>
      <SummaryGrid className="qp-delivery-kpis">
        <div><span>Yo‘ldagi / rejalangan</span><strong>{onRoad}</strong><small>Faol yetkazib berishlar</small></div>
        <div><span>Yetkazilgan</span><strong>{delivered}</strong><small>Muvaffaqiyatli nuqtalar</small></div>
        <div><span>E’tibor talab qiladi</span><strong>{failed}</strong><small>Qisman yoki muvaffaqiyatsiz</small></div>
        <div><span>Yo‘ldagi qiymat</span><strong>{formatMoney(plannedValue)}</strong><small>Faol yetkazib berish summasi</small></div>
      </SummaryGrid>

      <div className="qp-route-selector qp-delivery-trip-selector">{trips.map((trip) => <button type="button" key={trip.id} className={trip.id === selectedTrip?.id ? "active" : ""} onClick={() => { setSelectedTripId(trip.id); setSelectedDeliveryId(null); }}><Truck size={15} /><span><strong>{trip.number}</strong><small>{trip.driverName || "Owner/Admin"} · {trip.vehicle || "—"}</small></span><StatusPill status={trip.status} /></button>)}</div>

      <div className="qp-map-workspace qp-delivery-map-workspace">
        <div className="qp-map-workspace-map"><YandexMap points={routePoints} routePoints={routePoints} selectedId={selectedDelivery?.id} onPointClick={(point) => { if (point.id !== warehouse?.id) setSelectedDeliveryId(point.id); }} height={610} /></div>
        <aside className={`qp-map-side-panel qp-delivery-side ${selectedDeliveryId ? "is-mobile-detail-open" : ""}`}>
          <button type="button" className="qp-mobile-detail-back" onClick={() => setSelectedDeliveryId(null)}><ArrowLeft size={18} /> Yetkazib berish</button>
          <div className="qp-map-side-head"><div><span>Reys</span><h2>{selectedTrip?.number || "Reys tanlang"}</h2></div>{selectedTrip ? <StatusPill status={selectedTrip.status} /> : null}</div>
          {selectedTrip ? <div className="qp-route-summary-card"><div><Truck size={15} /><span>Haydovchi</span><strong>{selectedTrip.driverName || "Owner/Admin"}</strong></div><div><Route size={15} /><span>Nuqtalar</span><strong>{tripDeliveries.length}</strong></div><div><MapPin size={15} /><span>Masofa</span><strong>{selectedTrip.plannedKm || "—"} km</strong></div><div><PackageCheck size={15} /><span>Transport</span><strong>{selectedTrip.vehicle || "—"}</strong></div></div> : null}
          {canCompleteTrip ? <div className="qp-form-actions"><PrimaryButton type="button" onClick={completeTrip}>Reysni yakunlash</PrimaryButton></div> : null}
          <div className="qp-route-stop-list qp-delivery-stop-list">{stops.map((stop, index) => <button key={stop.id} type="button" className={`${stop.id === selectedDelivery?.id ? "active" : ""} ${stop.delivery.status === "DELIVERED" ? "done" : ""}`} onClick={() => setSelectedDeliveryId(stop.id)}><span className="qp-route-stop-number">{stop.delivery.status === "DELIVERED" ? <CheckCircle2 size={15} /> : index + 1}</span><div><strong>{stop.title}</strong><small>{formatMoney(stop.delivery.total || stop.delivery.order?.total)} · {stop.description}</small></div><StatusPill status={stop.delivery.status} /></button>)}</div>
          {selectedDelivery ? (() => {
            const customer = (db.customers || []).find((item) => item.id === selectedDelivery.customerId);
            const canDeliver = ["ARRIVED", "PARTIALLY_DELIVERED"].includes(selectedDelivery.status);
            return <div className="qp-selected-map-card qp-delivery-current-stop">
              <div className="qp-selected-map-title"><div><strong>{customer?.name || "Mijoz"}</strong><span>{customer?.phone || customer?.address || "—"}</span></div><StatusPill status={selectedDelivery.status} /></div>
              {selectedDelivery.status === "FAILED" && selectedDelivery.failureReason ? <div className="qp-delivery-warning"><AlertTriangle size={14} /> {selectedDelivery.failureReason}</div> : null}
              {selectedOrder ? <div className="qp-delivery-warning"><PackageCheck size={14} /> Buyurtma: {formatMoney(selectedOrder.total)} · To‘lov/avans: {formatMoney(collectedAmount)}</div> : null}
              <div className="qp-inline-actions qp-selected-map-actions">
                <SecondaryButton type="button" onClick={() => setNavigationTarget({ ...customer, title: customer?.name })}><Navigation size={14} /> Navigatsiyada ochish</SecondaryButton>
                {selectedDelivery.status === "PLANNED" ? <PrimaryButton type="button" onClick={startSelectedDelivery}>Yo‘lga chiqdi</PrimaryButton> : null}
                {selectedDelivery.status === "OUT_FOR_DELIVERY" ? <PrimaryButton type="button" onClick={arriveSelected}>Yetib keldi</PrimaryButton> : null}
                {canDeliver ? <PrimaryButton type="button" onClick={() => openAction("complete")}>Yetkazildi</PrimaryButton> : null}
                {canDeliver && db.settings.delivery.allowPartialDelivery && remainingItems.length ? <SecondaryButton type="button" onClick={() => openAction("partial")}>Qisman</SecondaryButton> : null}
                {canDeliver && paymentRemaining > 0 ? <SecondaryButton type="button" onClick={() => openAction("payment")}><CreditCard size={14} /> To‘lov</SecondaryButton> : null}
                {!TERMINAL_STOP_STATUSES.has(selectedDelivery.status) ? <SecondaryButton type="button" onClick={() => { setFailureReason(""); setFailureOpen(true); }}>Muammo</SecondaryButton> : null}
                {["FAILED", "PARTIALLY_DELIVERED"].includes(selectedDelivery.status) && ["COMPLETED", "CANCELLED"].includes(selectedTrip?.status) ? <SecondaryButton type="button" onClick={() => navigate("/deliveries/planning")}>Qayta rejalash</SecondaryButton> : null}
                {customer?.phone ? <a className="qp-button qp-button-secondary" href={`tel:${customer.phone}`}>Qo‘ng‘iroq</a> : null}
              </div>
            </div>;
          })() : null}
        </aside>
      </div>
    </PageShell>

    <NavigationAppModal open={Boolean(navigationTarget)} destination={navigationTarget} origin={warehouse} onClose={() => setNavigationTarget(null)} />

    <Modal open={Boolean(actionMode)} title={actionMode === "partial" ? "Qisman yetkazish" : actionMode === "payment" ? "Mijozdan to‘lov qabul qilish" : "Yetkazib berishni yakunlash"} description={actionMode === "payment" ? "To‘lov buyurtmaga bog‘lanadi. Naqd pul haydovchi kassaga topshirguncha xodimdagi naqd sifatida yuradi." : "Haqiqatda topshirilgan mahsulot va talab qilingan tasdiqlarni kiriting."} onClose={closeAction} wide={actionMode === "partial"}>
      <div className="qp-stack">
        {actionMode === "partial" ? <div className="qp-partial-delivery-list">{remainingItems.map((line) => <div className="qp-partial-delivery-row" key={line.id}><div><strong>{[line.productName, line.variantName, line.packageName].filter(Boolean).join(" · ")}</strong><span>Qolgan: {line.remaining}</span></div><input className="qp-input" type="number" min="0" max={line.remaining} step="0.001" value={partialItems[line.id] || ""} onChange={(event) => setPartialItems({ ...partialItems, [line.id]: event.target.value })} placeholder="0" /></div>)}</div> : null}
        {actionMode === "payment" ? <div className="qp-form-grid">
          <Field label="Qolgan buyurtma summasi"><input className="qp-input" value={formatMoney(paymentRemaining)} disabled /></Field>
          <Field label="To‘lov usuli"><Select value={payment.methodCode} onChange={(event) => setPayment({ ...payment, methodCode: event.target.value })}>{paymentMethods.map((method) => <option key={method.id} value={method.code}>{method.name}</option>)}</Select></Field>
          <Field label="Summa"><input className="qp-input" type="number" min="0.01" max={paymentRemaining || undefined} value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></Field>
          <Field label="Terminal / bank reference" hint="Karta yoki bank uchun ixtiyoriy"><input className="qp-input" value={payment.externalRef} onChange={(event) => setPayment({ ...payment, externalRef: event.target.value })} /></Field>
          <Field label="Izoh"><input className="qp-input" value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} /></Field>
        </div> : proofFields}
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={closeAction}>Bekor qilish</SecondaryButton><PrimaryButton type="button" onClick={submitAction}>{actionMode === "payment" ? "To‘lovni qabul qilish" : actionMode === "partial" ? "Qisman yetkazishni tasdiqlash" : "Yetkazishni tasdiqlash"}</PrimaryButton></div>
      </div>
    </Modal>

    <Modal open={failureOpen} title="Yetkazib berishdagi muammo" description="Sabab tarixda saqlanadi va buyurtma qayta rejalashtirish uchun qoladi." onClose={() => setFailureOpen(false)}>
      <Field label="Sabab" hint={db.settings.delivery.requireFailureReason === false ? "Ixtiyoriy" : "Majburiy"}><textarea className="qp-textarea" rows="4" value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Masalan: Mijoz buyurtmani qabul qilmadi" /></Field>
      <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setFailureOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="button" onClick={failSelected}>Muammoni saqlash</PrimaryButton></div>
    </Modal>
  </>;
}

export default DeliveryWorkspacePage;

import { AlertTriangle, ArrowLeft, CheckCircle2, MapPin, Navigation, PackageCheck, Route, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import NavigationAppModal from "../../../components/maps/NavigationAppModal";
import YandexMap from "../../../components/maps/YandexMap";
import { Field, Modal, PageShell, PrimaryButton, SecondaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { arriveDelivery, completeDelivery, failDelivery } from "../../../services/prototypeActions";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";

function DeliveryWorkspacePage() {
  const db = useLocalDb();
  const navigate = useNavigate();
  const [selectedTripId, setSelectedTripId] = useState(db.deliveryTrips[0]?.id || null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const trips = db.deliveryTrips;
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) || trips[0];
  const tripDeliveries = useMemo(() => db.deliveries.filter((delivery) => delivery.tripId === selectedTrip?.id).sort((a, b) => Number(a.stopOrder || 999) - Number(b.stopOrder || 999)), [db.deliveries, selectedTrip?.id]);
  const selectedDelivery = tripDeliveries.find((item) => item.id === selectedDeliveryId) || tripDeliveries[0];
  const warehouse = db.warehouses.find((item) => item.id === selectedTrip?.warehouseId) || db.warehouses[0];

  const stops = tripDeliveries.map((delivery, index) => {
    const customer = db.customers.find((item) => item.id === delivery.customerId);
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

  const delivered = db.deliveries.filter((delivery) => delivery.status === "DELIVERED").length;
  const onRoad = db.deliveries.filter((delivery) => ["OUT_FOR_DELIVERY", "PLANNED"].includes(delivery.status)).length;
  const failed = db.deliveries.filter((delivery) => ["FAILED", "PARTIALLY_DELIVERED"].includes(delivery.status)).length;
  const plannedValue = db.deliveries.filter((delivery) => ["PLANNED", "OUT_FOR_DELIVERY"].includes(delivery.status)).reduce((sum, delivery) => sum + Number(delivery.total || 0), 0);

  const startSelectedDelivery = async () => {
    if (!selectedDelivery) return;
    try { await apiRequest({ url: `/delivery/trips/${selectedDelivery.tripId}/start`, body: {} }); notify("Yetkazib berish boshlandi"); }
    catch (error) { notify(error.message, "danger"); }
  };
  const arriveSelected = async () => { if (!selectedDelivery) return; const result = await arriveDelivery(selectedDelivery.id); notify(result?.message || "Manzilga yetib kelindi", result?.ok === false ? "warning" : "success"); };
  const completeSelected = async () => { if (!selectedDelivery) return; const result = await completeDelivery(selectedDelivery.id, { recipientName: "Owner tasdiqladi" }); notify(result?.message || "Yetkazildi", result?.ok === false ? "warning" : "success"); };
  const failSelected = async () => {
    if (!selectedDelivery || !failureReason.trim()) { notify("Muammo sababini kiriting", "warning"); return; }
    const result = await failDelivery(selectedDelivery.id, failureReason.trim());
    notify(result?.message || "Muammo qayd etildi", result?.ok === false ? "warning" : "success");
    if (result?.ok !== false) { setFailureOpen(false); setFailureReason(""); }
  };

  return <>
    <PageShell title="Yetkazib berish markazi" description="Reyslar, haydovchilar, mijoz nuqtalari va yetkazish holatini Yandex xaritada boshqaring." eyebrow="Yetkazib berish" actions={<div className="qp-inline-actions"><SecondaryButton type="button" onClick={() => navigate("/delivery-trips")}>Reyslar ro‘yxati</SecondaryButton><PrimaryButton type="button" onClick={() => navigate("/deliveries/planning")}>+ Reys rejalashtirish</PrimaryButton></div>}>
      <SummaryGrid className="qp-delivery-kpis">
        <div><span>Yo‘ldagi / rejalangan</span><strong>{onRoad}</strong><small>Faol yetkazib berishlar</small></div>
        <div><span>Yetkazilgan</span><strong>{delivered}</strong><small>Muvaffaqiyatli nuqtalar</small></div>
        <div><span>E’tibor talab qiladi</span><strong>{failed}</strong><small>Qisman yoki muvaffaqiyatsiz</small></div>
        <div><span>Yo‘ldagi qiymat</span><strong>{formatMoney(plannedValue)}</strong><small>Faol yetkazib berish summasi</small></div>
      </SummaryGrid>

      <div className="qp-route-selector qp-delivery-trip-selector">{trips.map((trip) => <button type="button" key={trip.id} className={trip.id === selectedTrip?.id ? "active" : ""} onClick={() => { setSelectedTripId(trip.id); setSelectedDeliveryId(null); }}><Truck size={15} /><span><strong>{trip.number}</strong><small>{trip.driver} · {trip.vehicle}</small></span><StatusPill status={trip.status} /></button>)}</div>

      <div className="qp-map-workspace qp-delivery-map-workspace">
        <div className="qp-map-workspace-map"><YandexMap points={routePoints} routePoints={routePoints} selectedId={selectedDelivery?.id} onPointClick={(point) => { if (point.id !== warehouse?.id) setSelectedDeliveryId(point.id); }} height={610} /></div>
        <aside className={`qp-map-side-panel qp-delivery-side ${selectedDeliveryId ? "is-mobile-detail-open" : ""}`}>
          <button type="button" className="qp-mobile-detail-back" onClick={() => setSelectedDeliveryId(null)}><ArrowLeft size={18} /> Yetkazib berish</button>
          <div className="qp-map-side-head"><div><span>Reys</span><h2>{selectedTrip?.number || "Reys tanlang"}</h2></div>{selectedTrip ? <StatusPill status={selectedTrip.status} /> : null}</div>
          {selectedTrip ? <div className="qp-route-summary-card"><div><Truck size={15} /><span>Haydovchi</span><strong>{selectedTrip.driver}</strong></div><div><Route size={15} /><span>Nuqtalar</span><strong>{tripDeliveries.length}</strong></div><div><MapPin size={15} /><span>Masofa</span><strong>{selectedTrip.plannedKm || "—"} km</strong></div><div><PackageCheck size={15} /><span>Transport</span><strong>{selectedTrip.vehicle || "—"}</strong></div></div> : null}
          <div className="qp-route-stop-list qp-delivery-stop-list">{stops.map((stop, index) => <button key={stop.id} type="button" className={`${stop.id === selectedDelivery?.id ? "active" : ""} ${stop.delivery.status === "DELIVERED" ? "done" : ""}`} onClick={() => setSelectedDeliveryId(stop.id)}><span className="qp-route-stop-number">{stop.delivery.status === "DELIVERED" ? <CheckCircle2 size={15} /> : index + 1}</span><div><strong>{stop.title}</strong><small>{formatMoney(stop.delivery.total)} · {stop.description}</small></div><StatusPill status={stop.delivery.status} /></button>)}</div>
          {selectedDelivery ? (() => {
            const customer = db.customers.find((item) => item.id === selectedDelivery.customerId);
            return <div className="qp-selected-map-card qp-delivery-current-stop"><div className="qp-selected-map-title"><div><strong>{customer?.name || "Mijoz"}</strong><span>{customer?.phone || customer?.address || "—"}</span></div><StatusPill status={selectedDelivery.status} /></div>{selectedDelivery.status === "FAILED" && selectedDelivery.failureReason ? <div className="qp-delivery-warning"><AlertTriangle size={14} /> {selectedDelivery.failureReason}</div> : null}<div className="qp-inline-actions qp-selected-map-actions"><SecondaryButton type="button" onClick={() => setNavigationTarget({ ...customer, title: customer?.name })}><Navigation size={14} /> Navigatsiyada ochish</SecondaryButton>{selectedDelivery.status === "PLANNED" ? <PrimaryButton type="button" onClick={startSelectedDelivery}>Yo‘lga chiqdi</PrimaryButton> : null}{selectedDelivery.status === "OUT_FOR_DELIVERY" ? <PrimaryButton type="button" onClick={arriveSelected}>Yetib keldi</PrimaryButton> : null}{selectedDelivery.status === "ARRIVED" ? <PrimaryButton type="button" onClick={completeSelected}>Yetkazildi</PrimaryButton> : null}{!["DELIVERED","FAILED"].includes(selectedDelivery.status) ? <SecondaryButton type="button" onClick={() => { setFailureReason(""); setFailureOpen(true); }}>Muammo</SecondaryButton> : null}{customer?.phone ? <a className="qp-button qp-button-secondary" href={`tel:${customer.phone}`}>Qo‘ng‘iroq</a> : null}</div></div>;
          })() : null}
        </aside>
      </div>
    </PageShell>
    <NavigationAppModal open={Boolean(navigationTarget)} destination={navigationTarget} origin={warehouse} onClose={() => setNavigationTarget(null)} />
    <Modal open={failureOpen} title="Yetkazib berishdagi muammo" description="Sabab tarixda saqlanadi va buyurtma Muammoli holatiga o‘tadi." onClose={() => setFailureOpen(false)}>
      <Field label="Sabab"><textarea className="qp-textarea" rows="4" value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Masalan: Mijoz buyurtmani qabul qilmadi" /></Field>
      <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setFailureOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="button" onClick={failSelected}>Muammoni saqlash</PrimaryButton></div>
    </Modal>
  </>;
}
export default DeliveryWorkspacePage;

import { ArrowLeft, CalendarDays, MapPinned, PackageCheck, Route, Truck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import YandexMap from "../../../components/maps/YandexMap";
import { Field, PageShell, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Checkbox from "../../../components/ui/Checkbox";
import Select from "../../../components/ui/Select";
import { makeId, nextNumber, updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { addActivity } from "../../../services/workflowHelpers";
import { useAuth } from "../../../hooks/useAuth";
import { formatMoney, getName } from "../../../utils/formatters";

function DeliveryPlanningPage() {
  const db = useLocalDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const availableDrivers = useMemo(() => {
    const employees = (db.users || []).filter((item) => item.status === "ACTIVE" && (item.role === "DELIVERY_DRIVER" || item.roles?.includes("DELIVERY_DRIVER")));
    if (employees.length) return employees;
    return user ? [{ id: "owner-delivery", name: user.name || "Biznes egasi", phone: user.phone || "", title: "Ega (o‘zim yetkazaman)" }] : [];
  }, [db.users, user]);
  const [warehouseId, setWarehouseId] = useState(db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "");
  const [driverUserId, setDriverUserId] = useState(availableDrivers[0]?.id || "");
  const [vehicle, setVehicle] = useState(db.deliveryTrips[0]?.vehicle || "01 A 777 AA");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: db.settings.locale?.timezone || "Asia/Tashkent" }));
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const selectedDriver = availableDrivers.find((item) => item.id === driverUserId) || availableDrivers[0] || null;

  const assignedOrderIds = useMemo(() => new Set(db.deliveries.filter((delivery) => !["CANCELLED", "FAILED"].includes(delivery.status)).map((delivery) => delivery.orderId)), [db.deliveries]);
  const readyOrders = db.orders.filter((order) => order.warehouseId === warehouseId && ["CONFIRMED", "SUBMITTED"].includes(order.status) && ["READY", "COMPLETED"].includes(order.fulfillmentStatus) && !assignedOrderIds.has(order.id));
  const selectedOrders = readyOrders.filter((order) => selectedOrderIds.includes(order.id));
  const selectedCustomers = selectedOrders.map((order) => db.customers.find((customer) => customer.id === order.customerId)).filter(Boolean);
  const warehouse = db.warehouses.find((item) => item.id === warehouseId);
  const routePoints = [
    ...(warehouse?.latitude && warehouse?.longitude ? [{ id: warehouse.id, latitude: warehouse.latitude, longitude: warehouse.longitude, title: warehouse.name, shortLabel: "O" }] : []),
    ...selectedCustomers.map((customer, index) => ({ id: customer.id, latitude: customer.latitude, longitude: customer.longitude, title: customer.name, description: customer.address, shortLabel: String(index + 1) })),
  ].filter((item) => item.latitude && item.longitude);

  const toggleOrder = (id) => setSelectedOrderIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const total = selectedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const createTrip = () => {
    if (!selectedOrders.length) { notify("Reys uchun kamida bitta buyurtma tanlang", "warning"); return; }
    if (!selectedDriver || !vehicle.trim()) { notify("Haydovchi va mashinani tanlang", "warning"); return; }
    let tripNumber = "";
    updateLocalDb((draft) => {
      const trip = {
        id: makeId("trip"), number: nextNumber("TRIP", draft.deliveryTrips), date, driver: selectedDriver.name, driverEmployeeId: selectedDriver.id, driverPhone: selectedDriver.phone || "", vehicle: vehicle.trim(), warehouseId,
        status: "PLANNED", deliveries: selectedOrders.length, plannedKm: Math.max(5, selectedOrders.length * 6), plannedMinutes: Math.max(40, selectedOrders.length * 25), createdAt: new Date().toISOString(),
      };
      tripNumber = trip.number;
      draft.deliveryTrips.unshift(trip);
      selectedOrders.forEach((order, index) => {
        draft.deliveries.unshift({ id: makeId("del"), orderId: order.id, tripId: trip.id, customerId: order.customerId, stopOrder: index + 1, status: "PLANNED", total: order.total });
        const target = draft.orders.find((item) => item.id === order.id);
        if (target) target.deliveryStatus = "PLANNED";
      });
      addActivity(draft, {
        entityType: "DELIVERY_TRIP",
        entityId: trip.id,
        action: "ASSIGNED",
        title: "Reys haydovchiga biriktirildi",
        description: `${selectedDriver.name} · ${vehicle.trim()}`,
        actorId: user?.id || "system",
        actorName: user?.name || "Tizim",
      });
    });
    notify(`${tripNumber} yaratildi`);
    navigate("/deliveries");
  };

  return <PageShell title="Reys rejalashtirish" description="Tayyor buyurtmalarni tanlang, haydovchi va mashinani biriktiring, Yandex xaritada marshrutni tekshirib reys yarating." eyebrow="Yetkazib berish" actions={<SecondaryButton type="button" onClick={() => navigate("/deliveries")}><ArrowLeft size={15} /> Yetkazib berishga qaytish</SecondaryButton>}>
    <div className="qp-delivery-planning-grid">
      <section className="qp-card qp-delivery-plan-form">
        <div className="qp-card-head"><div><h2>Reys ma’lumotlari</h2><p>Reysning mas’ul shaxsi va boshlang‘ich ombori.</p></div></div>
        <div className="qp-form-grid">
          <Field label="Sana"><div className="qp-input-with-icon"><CalendarDays size={16} /><input className="qp-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></Field>
          <Field label="Ombor"><Select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setSelectedOrderIds([]); }}>{db.warehouses.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Haydovchi"><Select value={selectedDriver?.id || ""} onChange={(event) => setDriverUserId(event.target.value)}>{availableDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.title || "Haydovchi"}</option>)}</Select></Field>
          <Field label="Haydovchi telefoni"><input className="qp-input" value={selectedDriver?.phone || ""} disabled /></Field>
          <Field label="Mashina"><input className="qp-input" value={vehicle} onChange={(event) => setVehicle(event.target.value)} placeholder="01 A 777 AA" /></Field>
        </div>
        <div className="qp-delivery-plan-summary"><div><PackageCheck size={16} /><span>Buyurtmalar</span><strong>{selectedOrders.length}</strong></div><div><Route size={16} /><span>Nuqtalar</span><strong>{selectedCustomers.length}</strong></div><div><Truck size={16} /><span>Jami qiymat</span><strong>{formatMoney(total)}</strong></div></div>
      </section>

      <section className="qp-card qp-delivery-order-picker">
        <div className="qp-card-head"><div><h2>Tayyor buyurtmalar</h2><p>Yetkazib berishga biriktirilmagan buyurtmalar.</p></div><StatusPill status="READY" label={`${readyOrders.length} ta`} /></div>
        <div className="qp-delivery-ready-list">{readyOrders.length ? readyOrders.map((order) => <button type="button" key={order.id} className={selectedOrderIds.includes(order.id) ? "active" : ""} onClick={() => toggleOrder(order.id)}><Checkbox checked={selectedOrderIds.includes(order.id)} onChange={() => toggleOrder(order.id)} onClick={(event) => event.stopPropagation()} ariaLabel="Buyurtmani tanlash" /><div><strong>{order.number}</strong><span>{getName(db.customers, order.customerId)} · {getName(db.agents, order.agentId)}</span></div><div><strong>{formatMoney(order.total)}</strong><StatusPill status={order.fulfillmentStatus} /></div></button>) : <div className="qp-empty"><strong>Tayyor buyurtma topilmadi</strong><span>Buyurtmalar Tayyorlash bo‘limidan yetkazishga tayyorlangach shu yerda chiqadi.</span></div>}</div>
      </section>
    </div>

    <section className="qp-card qp-delivery-plan-map"><div className="qp-card-head"><div><h2><MapPinned size={17} /> Marshrut ko‘rinishi</h2><p>Tanlangan nuqtalar Yandex xaritada ketma-ket ko‘rsatiladi.</p></div><div className="qp-inline-actions"><span className="qp-muted"><UserRound size={14} /> {selectedDriver?.name || "Haydovchi tanlanmagan"}</span><PrimaryButton type="button" onClick={createTrip}>Reysni yaratish</PrimaryButton></div></div><YandexMap points={routePoints} routePoints={routePoints} height={480} /></section>
  </PageShell>;
}
export default DeliveryPlanningPage;

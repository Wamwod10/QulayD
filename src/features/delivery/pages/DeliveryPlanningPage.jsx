import { ArrowLeft, CalendarDays, MapPinned, PackageCheck, Route, Truck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import YandexMap from "../../../components/maps/YandexMap";
import { Field, PageShell, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Checkbox from "../../../components/ui/Checkbox";
import Select from "../../../components/ui/Select";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { formatMoney, getName } from "../../../utils/formatters";

function DeliveryPlanningPage() {
  const db = useLocalDb();
  const navigate = useNavigate();
  const availableDrivers = useMemo(() => (db.users || []).filter((item) => {
    if (item.status !== "ACTIVE") return false;
    const modules = item.modules || item.moduleKeys || [];
    const roles = item.roles || [];
    const legacyDriverText = `${item.employeeType?.code || ""} ${item.employeeType?.name || ""} ${item.title || ""}`.toLocaleLowerCase("uz-UZ");
    return modules.includes?.("driver_workspace") || roles.includes?.("DELIVERY_DRIVER") || item.role === "DELIVERY_DRIVER"
      || ["yetkazib beruvchi", "haydovchi", "kuryer", "driver", "courier"].some((token) => legacyDriverText.includes(token));
  }), [db.users]);
  const [warehouseId, setWarehouseId] = useState(db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "");
  const [driverUserId, setDriverUserId] = useState(availableDrivers[0]?.id || "");
  const [vehicle, setVehicle] = useState(db.deliveryTrips[0]?.vehicle || "01 A 777 AA");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: db.settings.locale?.timezone || "Asia/Tashkent" }));
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const selectedDriver = availableDrivers.find((item) => item.id === driverUserId) || null;

  const assignedOrderIds = useMemo(() => {
    const tripById = new Map((db.deliveryTrips || []).map((trip) => [trip.id, trip]));
    return new Set((db.deliveries || []).filter((delivery) => {
      if (["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED"].includes(delivery.status)) return true;
      if (["PARTIALLY_DELIVERED", "FAILED"].includes(delivery.status)) {
        const trip = tripById.get(delivery.tripId);
        return trip && !["COMPLETED", "CANCELLED"].includes(trip.status);
      }
      return false;
    }).map((delivery) => delivery.orderId));
  }, [db.deliveries, db.deliveryTrips]);
  const readyOrders = db.orders.filter((order) => order.warehouseId === warehouseId && order.status === "CONFIRMED" && ["FULFILLED", "READY"].includes(order.fulfillmentStatus) && !assignedOrderIds.has(order.id));
  const selectedOrders = readyOrders.filter((order) => selectedOrderIds.includes(order.id));
  const selectedCustomers = selectedOrders.map((order) => db.customers.find((customer) => customer.id === order.customerId)).filter(Boolean);
  const warehouse = db.warehouses.find((item) => item.id === warehouseId);
  const routePoints = [
    ...(warehouse?.latitude && warehouse?.longitude ? [{ id: warehouse.id, latitude: warehouse.latitude, longitude: warehouse.longitude, title: warehouse.name, shortLabel: "O" }] : []),
    ...selectedCustomers.map((customer, index) => ({ id: customer.id, latitude: customer.latitude, longitude: customer.longitude, title: customer.name, description: customer.address, shortLabel: String(index + 1) })),
  ].filter((item) => item.latitude && item.longitude);

  const toggleOrder = (id) => setSelectedOrderIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const total = selectedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const createTrip = async () => {
    if (!selectedOrders.length) { notify("Reys uchun kamida bitta buyurtma tanlang", "warning"); return; }
    if (!vehicle.trim()) { notify("Mashina ma’lumotini kiriting", "warning"); return; }
    try { const trip = await apiRequest({ url: "/delivery/trips", body: { warehouseId, driverEmployeeId: selectedDriver?.id || null, plannedDate: date,
      vehicle: vehicle.trim(), plannedKm: Math.max(5, selectedOrders.length * 6), plannedMinutes: Math.max(40, selectedOrders.length * 25), orderIds: selectedOrderIds } }); notify(`${trip.number} yaratildi`); navigate("/deliveries"); }
    catch (error) { notify(error.message, "danger"); }
  };

  return <PageShell title="Reys rejalashtirish" description="Tayyor buyurtmalarni tanlang, haydovchi va mashinani biriktiring, Yandex xaritada marshrutni tekshirib reys yarating." eyebrow="Yetkazib berish" actions={<SecondaryButton type="button" onClick={() => navigate("/deliveries")}><ArrowLeft size={15} /> Yetkazib berishga qaytish</SecondaryButton>}>
    <div className="qp-delivery-planning-grid">
      <section className="qp-card qp-delivery-plan-form">
        <div className="qp-card-head"><div><h2>Reys ma’lumotlari</h2><p>Reysning mas’ul shaxsi va boshlang‘ich ombori.</p></div></div>
        <div className="qp-form-grid">
          <Field label="Sana"><div className="qp-input-with-icon"><CalendarDays size={16} /><input className="qp-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></Field>
          <Field label="Ombor"><Select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setSelectedOrderIds([]); }}>{db.warehouses.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Haydovchi"><Select value={selectedDriver?.id || ""} onChange={(event) => setDriverUserId(event.target.value)}><option value="">Owner/Admin o‘zi boshqaradi</option>{availableDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.title || "Haydovchi"}</option>)}</Select></Field>
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

    <section className="qp-card qp-delivery-plan-map"><div className="qp-card-head"><div><h2><MapPinned size={17} /> Marshrut ko‘rinishi</h2><p>Tanlangan nuqtalar Yandex xaritada ketma-ket ko‘rsatiladi.</p></div><div className="qp-inline-actions"><span className="qp-muted"><UserRound size={14} /> {selectedDriver?.name || "Owner/Admin"}</span><PrimaryButton type="button" onClick={createTrip}>Reysni yaratish</PrimaryButton></div></div><YandexMap points={routePoints} routePoints={routePoints} height={480} /></section>
  </PageShell>;
}
export default DeliveryPlanningPage;

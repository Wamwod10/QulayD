import Select from "../../../components/ui/Select";
import { MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import {
  Field,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
} from "../../../components/prototype/PrototypeUI";
import {
  addLocalRecord,
  makeId,
  updateLocalRecord,
  useLocalDb,
} from "../../../services/localDb";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { notify } from "../../../services/notify";
import { collectPayment } from "../../../services/prototypeActions";
import { formatMoney, formatTime, getName, shortDate } from "../../../utils/formatters";
import { getLabel } from "../../../utils/labels";


function distanceMeters(a, b) {
  if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every((value) => Number.isFinite(Number(value)))) return null;
  const toRad = (value) => Number(value) * Math.PI / 180;
  const lat1 = toRad(a.latitude); const lat2 = toRad(b.latitude);
  const dLat = lat2 - lat1; const dLng = toRad(b.longitude) - toRad(a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function validateVisitGeofence(db, customerId, gps) {
  if (!gps?.latitude || !gps?.longitude) return { ok: true };
  const customer = db.customers.find((item) => item.id === customerId);
  const distance = distanceMeters(gps, customer);
  if (distance == null) return { ok: true };
  const limit = Number(db.settings?.maps?.geofenceMeters || 250);
  return distance <= limit ? { ok: true, distance } : { ok: false, distance, limit };
}

function getGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Brauzer GPS imkoniyatini qo‘llamaydi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      () => reject(new Error("GPS joylashuvini olib bo‘lmadi")),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function VisitsPage() {
  const db = useLocalDb();
  const operationalAgents = getOperationalAgents(db);
  const [startOpen, setStartOpen] = useState(false);
  const [finishVisitId, setFinishVisitId] = useState("");
  const [startForm, setStartForm] = useState({ agentId: operationalAgents[0]?.id || "", customerId: "" });
  const [finishForm, setFinishForm] = useState({ result: "NO_ORDER", amount: "", method: "CASH", note: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);

  const allowedCustomers = useMemo(() => {
    if (db.settings.agents.allowOutsideRoute !== false || !startForm.agentId) return db.customers;
    const today = new Date().toISOString().slice(0, 10);
    const plan = db.routePlans.find((item) => item.date === today && item.agentId === startForm.agentId);
    const allowedIds = new Set((plan?.stops || []).map((stop) => stop.customerId));
    return db.customers.filter((customer) => allowedIds.has(customer.id));
  }, [db.customers, db.routePlans, db.settings.agents.allowOutsideRoute, startForm.agentId]);

  const rows = db.visits.map((item) => ({
    ...item,
    agent: getName(db.agents, item.agentId),
    customer: getName(db.customers, item.customerId),
    resultLabel: getLabel(item.result, item.status === "IN_PROGRESS" ? "Jarayonda" : "—"),
  }));

  const createQuickCustomer = () => {
    if (!customerForm.name.trim()) {
      notify("Mijoz nomini kiriting", "warning");
      return;
    }
    const customer = {
      id: makeId("cus"),
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      address: customerForm.address.trim(),
      territory: "",
      priceListId: "pl-retail",
      agentId: startForm.agentId,
      debt: 0,
      creditLimit: 0,
      status: "ACTIVE",
    };
    addLocalRecord("customers", customer);
    setStartForm((current) => ({ ...current, customerId: customer.id }));
    setCustomerForm({ name: "", phone: "", address: "" });
    setCreatingCustomer(false);
    notify("Yangi mijoz yaratildi");
  };

  const startVisit = async () => {
    if (!startForm.agentId || !startForm.customerId) {
      notify("Agent va mijozni tanlang", "warning");
      return;
    }
    setBusy(true);
    try {
      const gps = db.settings.agents.requireGpsCheckIn ? await getGps() : {};
      const geofence = validateVisitGeofence(db, startForm.customerId, gps);
      if (!geofence.ok) { notify(`Mijoz joylashuvidan ${Math.round(geofence.distance)} m uzoqdasiz. Ruxsat etilgan masofa ${geofence.limit} m.`, "danger"); return; }
      addLocalRecord("visits", {
        id: makeId("vis"),
        date: new Date().toISOString().slice(0, 10),
        agentId: startForm.agentId,
        customerId: startForm.customerId,
        status: "IN_PROGRESS",
        checkIn: formatTime(),
        checkOut: "",
        result: "",
        checkInLocation: gps,
      });
      setStartOpen(false);
      notify("Tashrif boshlandi");
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setBusy(false);
    }
  };

  const finishVisit = async () => {
    const visit = db.visits.find((item) => item.id === finishVisitId);
    if (!visit) return;
    setBusy(true);
    try {
      const gps = db.settings.agents.requireGpsCheckOut ? await getGps() : {};
      const geofence = validateVisitGeofence(db, visit.customerId, gps);
      if (!geofence.ok) { notify(`Mijoz joylashuvidan ${Math.round(geofence.distance)} m uzoqdasiz. Ruxsat etilgan masofa ${geofence.limit} m.`, "danger"); return; }
      if (finishForm.result === "PAYMENT_COLLECTED") {
        if (db.settings.agents.allowCollectPayment === false) {
          notify("Agent uchun to‘lov qabul qilish o‘chirilgan", "danger");
          return;
        }
        const result = collectPayment({
          customerId: visit.customerId,
          amount: Number(finishForm.amount),
          method: finishForm.method,
        });
        if (!result.ok) {
          notify(result.message, "danger");
          return;
        }
      }
      updateLocalRecord("visits", visit.id, {
        status: "COMPLETED",
        checkOut: formatTime(),
        result: finishForm.result,
        note: finishForm.note.trim(),
        checkOutLocation: gps,
      });
      setFinishVisitId("");
      setFinishForm({ result: "NO_ORDER", amount: "", method: "CASH", note: "" });
      notify("Tashrif yakunlandi");
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SmartTablePage
        title="Tashriflar"
        description="Agentlarning mijozga kirishi, chiqishi, GPS tasdig‘i va tashrif natijalari bir joyda."
        eyebrow="Agentlar"
        rows={rows}
        searchFields={["agent", "customer", "resultLabel", "status"]}
        actions={<PrimaryButton onClick={() => setStartOpen(true)}><Plus size={15} /> Tashrif boshlash</PrimaryButton>}
        columns={[
          { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
          { key: "agent", label: "Agent", render: (row) => <strong>{row.agent}</strong> },
          { key: "customer", label: "Mijoz" },
          { key: "checkIn", label: "Boshlangan", render: (row) => row.checkIn || "—" },
          { key: "checkOut", label: "Yakunlangan", render: (row) => row.checkOut || "—" },
          { key: "resultLabel", label: "Natija" },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          {
            key: "action",
            label: "Amal",
            sortable: false,
            render: (row) => row.status === "IN_PROGRESS" ? <PrimaryButton onClick={() => setFinishVisitId(row.id)}>Yakunlash</PrimaryButton> : <span className="qp-muted">Yakunlangan</span>,
          },
        ]}
      />

      <Modal open={startOpen} title="Tashrifni boshlash" description={db.settings.agents.allowOutsideRoute === false ? "Faqat bugungi marshrutdagi mijozlar ko‘rsatiladi." : "Agent va mijozni tanlang."} onClose={() => setStartOpen(false)}>
        <div className="qp-stack">
          <div className="qp-form-grid">
            <Field label="Agent">
              <Select value={startForm.agentId} onChange={(event) => setStartForm({ agentId: event.target.value, customerId: "" })}>
                {operationalAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </Select>
            </Field>
            <Field label="Mijoz" hint={allowedCustomers.length ? `${allowedCustomers.length} ta mavjud` : "Marshrutda mijoz topilmadi"}>
              <Select value={startForm.customerId} onChange={(event) => setStartForm({ ...startForm, customerId: event.target.value })}>
                <option value="">Tanlang</option>
                {allowedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </Select>
            </Field>
          </div>

          {db.settings.agents.allowCreateCustomer ? (
            <div className="qp-inline-panel">
              {!creatingCustomer ? <SecondaryButton onClick={() => setCreatingCustomer(true)}><Plus size={14} /> Yangi mijoz yaratish</SecondaryButton> : (
                <div className="qp-stack">
                  <strong>Tezkor mijoz yaratish</strong>
                  <div className="qp-form-grid">
                    <Field label="Nomi"><input className="qp-input" value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></Field>
                    <Field label="Telefon"><input className="qp-input" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></Field>
                    <Field label="Manzil"><input className="qp-input" value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></Field>
                  </div>
                  <div className="qp-inline-actions"><SecondaryButton onClick={() => setCreatingCustomer(false)}>Bekor qilish</SecondaryButton><PrimaryButton onClick={createQuickCustomer}>Mijozni saqlash</PrimaryButton></div>
                </div>
              )}
            </div>
          ) : null}

          {db.settings.agents.requireGpsCheckIn ? <div className="qp-inline-warning"><MapPin size={15} /> Tashrif boshlanganda GPS joylashuvi avtomatik olinadi.</div> : null}
          <div className="qp-form-actions"><SecondaryButton onClick={() => setStartOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton onClick={startVisit} disabled={busy}>{busy ? "Tekshirilmoqda..." : "Tashrifni boshlash"}</PrimaryButton></div>
        </div>
      </Modal>

      <Modal open={Boolean(finishVisitId)} title="Tashrifni yakunlash" description="Tashrif natijasini belgilang. Sozlamalarga qarab GPS yoki to‘lov tekshiriladi." onClose={() => setFinishVisitId("")}>
        <div className="qp-stack">
          <Field label="Natija">
            <Select value={finishForm.result} onChange={(event) => setFinishForm({ ...finishForm, result: event.target.value })}>
              <option value="NO_ORDER">Buyurtmasiz yakunlandi</option>
              <option value="ORDER_CREATED">Buyurtma olindi</option>
              {db.settings.agents.allowCollectPayment ? <option value="PAYMENT_COLLECTED">To‘lov olindi</option> : null}
            </Select>
          </Field>
          {finishForm.result === "PAYMENT_COLLECTED" ? (
            <div className="qp-form-grid">
              <Field label="To‘lov summasi"><input className="qp-input" type="number" min="1" value={finishForm.amount} onChange={(event) => setFinishForm({ ...finishForm, amount: event.target.value })} /></Field>
              <Field label="To‘lov usuli"><Select value={finishForm.method} onChange={(event) => setFinishForm({ ...finishForm, method: event.target.value })}>{(db.paymentMethods || []).filter((item)=>item.status === "ACTIVE").map((item)=><option key={item.id} value={item.code}>{item.name}</option>)}</Select></Field>
              <div className="qp-muted">Mijoz qarzi: {formatMoney(db.customers.find((item) => item.id === db.visits.find((visit) => visit.id === finishVisitId)?.customerId)?.debt || 0)}</div>
            </div>
          ) : null}
          <Field label="Izoh"><textarea className="qp-textarea" rows="3" value={finishForm.note} onChange={(event) => setFinishForm({ ...finishForm, note: event.target.value })} placeholder="Ixtiyoriy izoh" /></Field>
          {db.settings.agents.requireGpsCheckOut ? <div className="qp-inline-warning"><MapPin size={15} /> Yakunlashda GPS joylashuvi avtomatik olinadi.</div> : null}
          <div className="qp-form-actions"><SecondaryButton onClick={() => setFinishVisitId("")}>Bekor qilish</SecondaryButton><PrimaryButton onClick={finishVisit} disabled={busy}>{busy ? "Tekshirilmoqda..." : "Tashrifni yakunlash"}</PrimaryButton></div>
        </div>
      </Modal>
    </>
  );
}

export default VisitsPage;

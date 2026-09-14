import ImageUploader from "../components/ui/ImageUploader";
import Select from "../components/ui/Select";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../components/prototype/SmartTablePage";
import { Field, Modal, PageShell, PrimaryButton, SecondaryButton, SectionCard, StatusPill } from "../components/prototype/PrototypeUI";
import { useLocalDb } from "../services/localDb";
import { apiRequest } from "../services/authService";
import { getOperationalAgents } from "../services/employeeSelectors";
import { notify } from "../services/notify";
import { completeDelivery, completePartialDelivery, failDelivery } from "../services/prototypeActions";
import { formatMoney, getName } from "../utils/formatters";

export function ContactsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ partnerType: "CUSTOMER", partnerId: "", name: "", position: "", phone: "" });
  const partners = form.partnerType === "CUSTOMER" ? db.customers : db.suppliers;
  const rows = db.contacts.map((item) => ({
    ...item,
    partner: getName(item.partnerType === "CUSTOMER" ? db.customers : db.suppliers, item.partnerId),
    typeLabel: item.partnerType === "CUSTOMER" ? "Mijoz" : "Yetkazib beruvchi",
  }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.partnerId || !form.name.trim()) return;
    try { const root = form.partnerType === "CUSTOMER" ? "customers" : "suppliers"; await apiRequest({ url: `/${root}/${form.partnerId}/contacts`, body: { name: form.name.trim(), position: form.position.trim() || undefined, phone: form.phone.trim() || undefined } }); }
    catch (error) { notify(error.message, "danger"); return; }
    setForm({ partnerType: "CUSTOMER", partnerId: "", name: "", position: "", phone: "" });
    setOpen(false);
    notify("Kontakt saqlandi");
  };

  return <>
    <SmartTablePage title="Kontaktlar" description="Mijozlar va yetkazib beruvchilarning aloqa shaxslari." eyebrow="Hamkorlar" rows={rows} searchFields={["partner", "typeLabel", "name", "position", "phone"]} actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Yangi kontakt</PrimaryButton>} columns={[{ key: "partner", label: "Hamkor", render: (row) => <strong>{row.partner}</strong> }, { key: "typeLabel", label: "Turi" }, { key: "name", label: "Aloqa shaxsi" }, { key: "position", label: "Lavozimi" }, { key: "phone", label: "Telefon" }]} />
    <Modal open={open} title="Yangi kontakt" description="Hamkor ichidagi alohida aloqa shaxsini kiriting." onClose={() => setOpen(false)}>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <Field label="Hamkor turi"><Select value={form.partnerType} onChange={(event) => setForm({ ...form, partnerType: event.target.value, partnerId: "" })}><option value="CUSTOMER">Mijoz</option><option value="SUPPLIER">Yetkazib beruvchi</option></Select></Field>
          <Field label="Hamkor"><Select value={form.partnerId} onChange={(event) => setForm({ ...form, partnerId: event.target.value })}><option value="">Tanlang</option>{partners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Ism"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Lavozim"><input className="qp-input" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} /></Field>
          <Field label="Telefon"><input className="qp-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        </div>
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Saqlash</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}

export function TerritoriesPage() {
  const db = useLocalDb();
  const rows = db.territories.map((item) => ({ ...item, agent: getName(db.agents, item.agentId) }));
  return <SmartTablePage title="Hududlar" description="Savdo agentlariga biriktirilgan hududlar." eyebrow="Agentlar" rows={rows} searchFields={["name", "agent"]} columns={[{ key: "name", label: "Hudud", render: (row) => <strong>{row.name}</strong> }, { key: "agent", label: "Agent" }, { key: "customers", label: "Mijozlar soni" }]} />;
}

export function AgentTodayPage() {
  const db = useLocalDb();
  const showProgress = db.settings.agents.showDailyProgress !== false;
  const columns = [
    { key: "name", label: "Agent", render: (row) => <strong>{row.name}</strong> },
    { key: "territory", label: "Hudud" },
    ...(showProgress ? [
      { key: "visitsToday", label: "Tashrif" },
      { key: "ordersToday", label: "Buyurtma" },
      { key: "salesToday", label: "Savdo", render: (row) => <strong>{formatMoney(row.salesToday)}</strong> },
    ] : []),
    { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
  ];
  return <SmartTablePage title="Bugungi faoliyat" description={showProgress ? "Agentlarning bugungi tashrif, buyurtma va savdo natijalari." : "Agentlarning bugungi ish holati."} eyebrow="Agentlar" rows={getOperationalAgents(db)} searchFields={["name", "territory"]} columns={columns} />;
}

export function RoutesTodayPage() {
  const db = useLocalDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.routePlans.filter((item) => item.date === today).map((item) => ({ ...item, agent: getName(db.agents, item.agentId), totalStops: item.stops?.length || 0, completedStops: item.stops?.filter((stop) => stop.status === "DONE").length || 0 }));
  return <SmartTablePage title="Bugungi marshrutlar" description="Bugun agentlar yurayotgan yo‘nalishlarning tezkor holati." eyebrow="Marshrutlar" rows={rows} searchFields={["name", "agent", "status"]} columns={[{ key: "name", label: "Marshrut", render: (row) => <strong>{row.name}</strong> }, { key: "agent", label: "Agent" }, { key: "totalStops", label: "Jami nuqta" }, { key: "completedStops", label: "Bajarilgan" }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

function fulfillmentRows(db) {
  return db.pickLists.map((pick) => {
    const order = db.orders.find((item) => item.id === pick.orderId);
    return { ...pick, order: order?.number || "—", customer: getName(db.customers, order?.customerId), total: order?.total || 0 };
  });
}

export function FulfillmentCenterPage() {
  const db = useLocalDb();
  return <SmartTablePage title="Tayyorlash markazi" description="Tasdiqlangan buyurtmalar band qilingan qoldiqdan yig‘ish va qadoqlash jarayoniga o‘tadi." eyebrow="Tayyorlash" rows={fulfillmentRows(db)} searchFields={["number", "order", "customer", "status"]} columns={[{ key: "number", label: "Yig‘ish varaqasi", render: (row) => <strong>{row.number}</strong> }, { key: "order", label: "Buyurtma" }, { key: "customer", label: "Mijoz" }, { key: "total", label: "Summa", render: (row) => formatMoney(row.total) }, { key: "progress", label: "Bajarilish", render: (row) => <div style={{ minWidth: 130 }}><div className="qp-progress"><span style={{ width: `${row.progress}%` }} /></div><div className="qp-muted" style={{ marginTop: 4 }}>{row.progress}%</div></div> }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

export function PickingPage() {
  const db = useLocalDb();
  const rows = fulfillmentRows(db).filter((item) => ["RESERVED", "PICKING", "PICKED"].includes(item.status));
  return <SmartTablePage title="Yig‘ish" description="Bu nazorat oynasi. Real yig‘ish progressini biriktirilgan omborchi o‘z ish joyida skaner orqali boshqaradi." eyebrow="Tayyorlash" rows={rows} searchFields={["number", "order", "customer"]} columns={[{ key: "number", label: "Yig‘ish varaqasi", render: (row) => <strong>{row.number}</strong> }, { key: "order", label: "Buyurtma" }, { key: "customer", label: "Mijoz" }, { key: "progress", label: "Bajarilish", render: (row) => `${row.progress}%` }, { key: "pickerName", label: "Mas’ul", render: (row) => row.pickerName || row.assignedName || "Biriktirilmagan" }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

export function PackingPage() {
  const db = useLocalDb();
  const rows = fulfillmentRows(db).filter((item) => ["PICKED", "PACKING"].includes(item.status));
  return <SmartTablePage title="Qadoqlash" description="Qadoqlash holati omborchi actionlaridan yangilanadi. Owner va menejer bu sahifada jarayonni kuzatadi." eyebrow="Tayyorlash" rows={rows} searchFields={["number", "order", "customer"]} columns={[{ key: "number", label: "Yig‘ish varaqasi", render: (row) => <strong>{row.number}</strong> }, { key: "order", label: "Buyurtma" }, { key: "customer", label: "Mijoz" }, { key: "progress", label: "Yig‘ish", render: (row) => `${row.progress}%` }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

export function ReadyOrdersPage() {
  const db = useLocalDb();
  const rows = db.orders.filter((order) => ["READY", "COMPLETED"].includes(order.fulfillmentStatus)).map((order) => ({ ...order, customer: getName(db.customers, order.customerId) }));
  return <SmartTablePage title="Tayyor buyurtmalar" description="Yig‘ish va qadoqlash yakunlangan, delivery rejalashtirishga tayyor buyurtmalar." eyebrow="Tayyorlash" rows={rows} searchFields={["number", "customer"]} columns={[{ key: "number", label: "Buyurtma", render: (row) => <strong>{row.number}</strong> }, { key: "customer", label: "Mijoz" }, { key: "total", label: "Summa", render: (row) => formatMoney(row.total) }, { key: "fulfillmentStatus", label: "Holat", render: (row) => <StatusPill status={row.fulfillmentStatus} /> }]} />;
}

export function DeliveriesPage() {
  const db = useLocalDb();
  const [selectedDeliveryId, setSelectedDeliveryId] = useState("");
  const [mode, setMode] = useState("complete");
  const [proof, setProof] = useState({ recipientName: "", photo: "", photoName: "", latitude: null, longitude: null, paymentMethod: "CASH" });
  const [partialItems, setPartialItems] = useState({});
  const [failureReason, setFailureReason] = useState("");

  const rows = db.deliveries.map((item) => ({
    ...item,
    customer: getName(db.customers, item.customerId),
    order: db.orders.find((order) => order.id === item.orderId)?.number || "—",
    trip: db.deliveryTrips.find((trip) => trip.id === item.tripId)?.number || "—",
  }));
  const selectedDelivery = db.deliveries.find((item) => item.id === selectedDeliveryId);
  const selectedOrder = db.orders.find((item) => item.id === selectedDelivery?.orderId);
  const remainingItems = (selectedOrder?.items || []).map((line) => ({
    ...line,
    remaining: Math.max(0, Number(line.quantity || 0) - Number(line.fulfilledQty || 0)),
    product: getName(db.products, line.productId),
  })).filter((line) => line.remaining > 0);

  const openAction = (id, nextMode) => {
    setSelectedDeliveryId(id);
    setMode(nextMode);
    setProof({ recipientName: "", photo: "", photoName: "", latitude: null, longitude: null, paymentMethod: "CASH" });
    setPartialItems({});
    setFailureReason("");
  };

  const closeModal = () => {
    setSelectedDeliveryId("");
    setPartialItems({});
    setFailureReason("");
  };

  const requestGps = () => {
    if (!navigator.geolocation) { notify("Brauzer GPS imkoniyatini qo‘llamaydi", "warning"); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProof((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }));
        notify("GPS joylashuvi olindi");
      },
      () => notify("GPS joylashuvini olib bo‘lmadi", "danger"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const submitAction = async () => {
    let result;
    if (mode === "partial") {
      result = await completePartialDelivery(
        selectedDeliveryId,
        remainingItems.map((line) => ({ orderItemId: line.id, quantity: Number(partialItems[line.id] || 0) })).filter((line) => line.quantity > 0),
        proof,
      );
    } else if (mode === "failed") {
      result = await failDelivery(selectedDeliveryId, failureReason);
    } else {
      result = await completeDelivery(selectedDeliveryId, proof);
    }
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) closeModal();
  };

  const proofFields = mode !== "failed" ? (
    <>
      {db.settings.delivery.requireRecipientName ? (
        <Field label="Qabul qiluvchi ismi">
          <input className="qp-input" value={proof.recipientName} onChange={(event) => setProof({ ...proof, recipientName: event.target.value })} placeholder="Masalan, Azizbek" />
        </Field>
      ) : null}
      {db.settings.delivery.requirePhoto ? (
        <div className="qp-form-span-full">
          <ImageUploader value={proof.photo || ""} name={proof.recipientName || "Yetkazish"} label="Yetkazilganini tasdiqlovchi foto" compact onChange={(photo) => setProof((current) => ({ ...current, photo, photoName: photo ? "delivery-proof.webp" : "" }))} />
        </div>
      ) : null}
      {db.settings.delivery.requireGps ? (
        <SettingLikeRow title="GPS joylashuvi" description={proof.latitude !== null ? `${proof.latitude.toFixed(5)}, ${proof.longitude.toFixed(5)}` : "Joylashuv hali olinmagan"}>
          <SecondaryButton onClick={requestGps}><MapPin size={15} /> GPS olish</SecondaryButton>
        </SettingLikeRow>
      ) : null}
      {db.settings.finance.allowCreditSales === false ? (
        <Field label="To‘lov usuli" hint="Nasiya savdo o‘chirilgani uchun yetkazish to‘langan holda yakunlanadi.">
          <Select value={proof.paymentMethod} onChange={(event) => setProof({ ...proof, paymentMethod: event.target.value })}>
            <option value="CASH">Naqd</option><option value="CARD">Karta</option><option value="BANK">Bank o‘tkazmasi</option>
          </Select>
        </Field>
      ) : null}
    </>
  ) : null;

  return <>
    <SmartTablePage
      title="Yetkazib berishlar"
      description="To‘liq, qisman va muammoli yetkazishlar qoldiq hamda moliya bilan bir xil oqimda boshqariladi."
      eyebrow="Yetkazib berish"
      rows={rows}
      searchFields={["customer", "order", "trip", "status"]}
      columns={[
        { key: "order", label: "Buyurtma", render: (row) => <strong>{row.order}</strong> },
        { key: "customer", label: "Mijoz" },
        { key: "trip", label: "Reys" },
        { key: "total", label: "Summa", render: (row) => formatMoney(row.total) },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        {
          key: "actions",
          label: "Amallar",
          sortable: false,
          render: (row) => row.status === "DELIVERED" ? <span className="qp-muted">Yakunlangan</span> : (
            <div className="qp-inline-actions qp-table-actions">
              <PrimaryButton onClick={() => openAction(row.id, "complete")}>To‘liq yetkazildi</PrimaryButton>
              {db.settings.delivery.allowPartialDelivery ? <SecondaryButton onClick={() => openAction(row.id, "partial")}>Qisman</SecondaryButton> : null}
              <SecondaryButton onClick={() => openAction(row.id, "failed")}>Muammo</SecondaryButton>
            </div>
          ),
        },
      ]}
    />

    <Modal
      open={Boolean(selectedDeliveryId)}
      title={mode === "partial" ? "Qisman yetkazish" : mode === "failed" ? "Yetkazish muammosi" : "Yetkazib berishni yakunlash"}
      description={mode === "failed" ? "Mahsulot ombordan chiqmaydi. Sabab tarixda saqlanadi." : "Sozlamalarga ko‘ra talab qilinadigan tasdiqlarni kiriting."}
      onClose={closeModal}
      wide={mode === "partial"}
    >
      <div className="qp-stack">
        {mode === "partial" ? (
          <SectionCard title="Yetkazilgan miqdor" description="Faqat haqiqatda topshirilgan miqdorni kiriting. Qolgan qism buyurtma uchun band holatda qoladi.">
            <div className="qp-partial-delivery-list">
              {remainingItems.map((line) => (
                <div className="qp-partial-delivery-row" key={line.id}>
                  <div><strong>{[line.product, line.variantName, line.packageName].filter(Boolean).join(" · ")}</strong><span>Qolgan: {line.remaining}</span></div>
                  <input className="qp-input" type="number" min="0" max={line.remaining} step="0.001" value={partialItems[line.id] || ""} onChange={(event) => setPartialItems({ ...partialItems, [line.id]: event.target.value })} placeholder="0" />
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {mode === "failed" ? (
          <Field label="Muammo sababi" hint={db.settings.delivery.requireFailureReason ? "Majburiy" : "Ixtiyoriy"}>
            <textarea className="qp-textarea" rows="4" value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Masalan, mijoz savdo nuqtasida yo‘q edi" />
          </Field>
        ) : proofFields}

        <div className="qp-form-actions">
          <SecondaryButton onClick={closeModal}>Bekor qilish</SecondaryButton>
          <PrimaryButton onClick={submitAction}>{mode === "partial" ? "Qisman yetkazishni tasdiqlash" : mode === "failed" ? "Muammoni saqlash" : "Yetkazishni tasdiqlash"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  </>;
}

function SettingLikeRow({ title, description, children }) {
  return <div className="qp-setting-row"><div className="qp-setting-copy"><strong>{title}</strong><span>{description}</span></div><div>{children}</div></div>;
}

export function DeliveryAssignmentsPage() {
  const db = useLocalDb();
  const rows = db.deliveries.map((item) => { const trip = db.deliveryTrips.find((entry) => entry.id === item.tripId); return { ...item, customer: getName(db.customers, item.customerId), driver: trip?.driver || "—", vehicle: trip?.vehicle || "—" }; });
  return <SmartTablePage title="Haydovchi topshiriqlari" description="Qaysi yetkazib berish qaysi haydovchi va transportga biriktirilgan." eyebrow="Yetkazib berish" rows={rows} searchFields={["customer", "driver", "vehicle", "status"]} columns={[{ key: "customer", label: "Mijoz", render: (row) => <strong>{row.customer}</strong> }, { key: "driver", label: "Haydovchi" }, { key: "vehicle", label: "Transport" }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

export function GenericInfoPage({ eyebrow, title, description, items = [] }) {
  return <PageShell title={title} description={description} eyebrow={eyebrow}><SectionCard><div className="qp-alert-list">{items.length ? items.map((item) => <div key={item.title} className="qp-alert-row"><div><strong>{item.title}</strong><span>{item.description}</span></div></div>) : <div className="qp-empty"><strong>Asos tayyor</strong><span>Bu bo‘lim keyingi bosqichda kengaytiriladi.</span></div>}</div></SectionCard></PageShell>;
}

import { Check, PackageCheck, Plus, RotateCcw, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { usePermissions } from "../../../hooks/usePermissions";
import { apiRequest } from "../../../services/authService";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";

const ACTIVE_RETURN_STATUSES = new Set(["DRAFT", "REQUESTED", "INSPECTING", "APPROVED", "RECEIVED", "REFUNDED"]);
const REFUND_METHODS = new Set(["CASH", "CARD", "QR", "BANK", "OTHER"]);
const blankLine = () => ({ quantity: "", condition: "RESTOCK", serialIds: [] });

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lineLabel(line) {
  const productName = line.productName || line.product?.name || "Mahsulot";
  const variant = line.variantName || line.variant?.name;
  const pack = line.packageName || line.package?.name;
  return [productName, variant, pack].filter(Boolean).join(" · ");
}

function ReturnsPage() {
  const db = useLocalDb();
  const { user } = useAuth();
  const { can } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("Mijoz qaytarishi");
  const [draftItems, setDraftItems] = useState({});
  const [refundRow, setRefundRow] = useState(null);
  const [refundMethodCode, setRefundMethodCode] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const claims = useMemo(() => {
    const quantityByItem = new Map();
    const serialIds = new Set();
    for (const doc of db.returns || []) {
      if (!ACTIVE_RETURN_STATUSES.has(doc.status)) continue;
      for (const item of doc.items || []) {
        if (item.orderItemId) quantityByItem.set(item.orderItemId, numberValue(quantityByItem.get(item.orderItemId)) + numberValue(item.quantity));
        for (const serialId of Array.isArray(item.serialIds) ? item.serialIds : []) serialIds.add(serialId);
      }
    }
    return { quantityByItem, serialIds };
  }, [db.returns]);

  const completedOrders = useMemo(() => (db.orders || []).filter((order) => order.status === "COMPLETED" && (order.items || []).some((line) => {
    const remaining = numberValue(line.quantity) - numberValue(claims.quantityByItem.get(line.id));
    return remaining > 1e-9;
  })), [db.orders, claims]);
  const selectedOrder = completedOrders.find((order) => order.id === orderId);
  const selectedLines = selectedOrder?.items || [];

  const refundOptions = useMemo(() => {
    const configured = (db.paymentMethods || []).filter((item) => item.status === "ACTIVE" && REFUND_METHODS.has(item.method || item.code));
    if (configured.length) return configured.map((item) => ({ code: item.code, method: item.method || item.code, name: item.name }));
    return [
      { code: "CASH", method: "CASH", name: "Naqd" },
      { code: "CARD", method: "CARD", name: "Karta" },
      { code: "QR", method: "QR", name: "QR" },
      { code: "BANK", method: "BANK", name: "Bank" },
      { code: "OTHER", method: "OTHER", name: "Boshqa" },
    ];
  }, [db.paymentMethods]);
  const selectedRefundOption = refundOptions.find((item) => item.code === refundMethodCode) || refundOptions[0];
  const refundSettlement = useMemo(() => {
    if (!refundRow) return { creditOffset: 0, payoutAmount: 0 };
    const invoiceIds = new Set((db.invoices || []).filter((invoice) => invoice.orderId === refundRow.orderId).map((invoice) => invoice.id));
    const outstandingDebt = (db.debts || []).filter((debt) => invoiceIds.has(debt.invoiceId)).reduce((sum, debt) => sum + Math.max(0, numberValue(debt.outstanding)), 0);
    const creditOffset = Math.min(numberValue(refundRow.total), outstandingDebt);
    return { creditOffset, payoutAmount: Math.max(0, numberValue(refundRow.total) - creditOffset) };
  }, [db.debts, db.invoices, refundRow]);
  const employeeId = user?.employeeId || user?.id;
  const currentShift = (db.shifts || []).find((shift) => shift.status === "OPEN" && (!employeeId || shift.employeeId === employeeId));

  const rows = (db.returns || []).map((item) => ({
    ...item,
    date: item.createdAt || item.date,
    customer: item.customer?.name || getName(db.customers, item.customerId),
    orderNumber: item.order?.number || db.orders.find((order) => order.id === item.orderId)?.number || "—",
    total: numberValue(item.total),
  }));

  const openCreate = () => {
    setOrderId("");
    setReason("Mijoz qaytarishi");
    setDraftItems({});
    setCreateOpen(true);
  };

  const chooseOrder = (nextOrderId) => {
    setOrderId(nextOrderId);
    const order = completedOrders.find((item) => item.id === nextOrderId);
    setDraftItems(Object.fromEntries((order?.items || []).map((line) => [line.id, blankLine()])));
  };

  const updateDraftLine = (lineId, patch) => setDraftItems((current) => ({
    ...current,
    [lineId]: { ...(current[lineId] || blankLine()), ...patch },
  }));

  const toggleSerial = (lineId, serialId, required) => {
    setDraftItems((current) => {
      const line = current[lineId] || blankLine();
      const exists = line.serialIds.includes(serialId);
      const serialIds = exists ? line.serialIds.filter((id) => id !== serialId) : [...line.serialIds, serialId].slice(0, Math.max(0, required));
      return { ...current, [lineId]: { ...line, serialIds } };
    });
  };

  const submitReturn = async (event) => {
    event.preventDefault();
    if (!selectedOrder) return notify("Yakunlangan buyurtmani tanlang", "warning");
    if (reason.trim().length < 3) return notify("Qaytarish sababini kiriting", "warning");
    const items = [];
    for (const line of selectedLines) {
      const draft = draftItems[line.id] || blankLine();
      const quantity = numberValue(draft.quantity);
      if (quantity <= 0) continue;
      const remaining = numberValue(line.quantity) - numberValue(claims.quantityByItem.get(line.id));
      if (quantity > remaining + 1e-9) return notify(`${lineLabel(line)} uchun qaytarish miqdori qoldiqdan katta`, "warning");
      const product = line.product || db.products.find((item) => item.id === line.productId);
      const baseQuantity = Math.round(quantity * numberValue(line.conversionToBase || 1) * 1000) / 1000;
      if (product?.trackSerial) {
        if (!Number.isInteger(baseQuantity)) return notify(`${lineLabel(line)} uchun qaytarish miqdori butun base birlik bo‘lishi kerak`, "warning");
        if ((draft.serialIds || []).length !== baseQuantity) return notify(`${lineLabel(line)} uchun ${baseQuantity} ta serial/IMEI tanlang`, "warning");
      }
      if ((product?.trackLot || product?.trackExpiry) && draft.condition === "RESTOCK" && !(Array.isArray(line.batchAllocations) && line.batchAllocations.length)) {
        return notify(`${lineLabel(line)} eski sotuvda lot identifikatori saqlanmagan. RESTOCK o‘rniga shikastlangan/utilizatsiya holatini tanlang yoki tracked qoldiq tuzatishdan foydalaning.`, "warning");
      }
      items.push({ orderItemId: line.id, quantity, condition: draft.condition, ...(draft.serialIds?.length ? { serialIds: draft.serialIds } : {}) });
    }
    if (!items.length) return notify("Kamida bitta mahsulot uchun qaytarish miqdorini kiriting", "warning");
    try {
      const created = await apiRequest({ url: "/returns", body: { orderId: selectedOrder.id, reason: reason.trim(), items } });
      notify(`${created.number} qaytarish so‘rovi yaratildi`);
      setCreateOpen(false);
      setOrderId("");
      setDraftItems({});
    } catch (error) { notify(error.message, "danger"); }
  };

  const runAction = async (row, action) => {
    const messages = { approve: "Qaytarish tasdiqlandi", receive: "Qaytarilgan mahsulot qabul qilindi" };
    try {
      await apiRequest({ url: `/returns/${row.id}/${action}` });
      notify(messages[action] || "Amal bajarildi");
    } catch (error) { notify(error.message, "danger"); }
  };

  const openRefund = (row) => {
    setRefundRow(row);
    setRefundMethodCode(refundOptions[0]?.code || "CASH");
    setRefundNote("");
  };

  const submitRefund = async (event) => {
    event.preventDefault();
    if (!refundRow || !selectedRefundOption) return;
    if (selectedRefundOption.method === "CASH" && refundSettlement.payoutAmount > 0) {
      if (!currentShift) return notify("Naqd qaytarish uchun sizning ochiq kassa smenangiz kerak", "warning");
      if (numberValue(currentShift.expectedCash) + 1e-9 < refundSettlement.payoutAmount) return notify("Kassada qaytarish uchun yetarli naqd mablag‘ yo‘q", "warning");
    }
    try {
      await apiRequest({ url: `/returns/${refundRow.id}/refund`, body: {
        method: selectedRefundOption.method,
        ...(selectedRefundOption.method === "CASH" && refundSettlement.payoutAmount > 0 ? { shiftId: currentShift.id } : {}),
        ...(refundNote.trim() ? { note: refundNote.trim() } : {}),
      } });
      notify(refundSettlement.creditOffset > 0 ? `Qaytarish yopildi: ${formatMoney(refundSettlement.creditOffset)} qarzdan kamaytirildi${refundSettlement.payoutAmount > 0 ? `, ${formatMoney(refundSettlement.payoutAmount)} qaytarildi` : ""}` : "Pul qaytarildi va moliya yozuvlari yaratildi");
      setRefundRow(null);
    } catch (error) { notify(error.message, "danger"); }
  };

  return <>
    <SmartTablePage
      title="Qaytarishlar"
      description="Sotuvdan qaytgan mahsulotlar order, serial/IMEI, lot va moliya bilan bog‘liq holda boshqariladi."
      eyebrow="Savdo"
      rows={rows}
      searchFields={["number", "orderNumber", "customer", "status"]}
      actions={can("sales.create") ? <PrimaryButton onClick={openCreate}><Plus size={15} /> Yangi qaytarish</PrimaryButton> : null}
      columns={[
        { key: "number", label: "Qaytarish", render: (row) => <strong>{row.number}</strong> },
        { key: "orderNumber", label: "Sotuv" },
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "customer", label: "Mijoz" },
        { key: "total", label: "Summa", render: (row) => formatMoney(row.total) },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        { key: "actions", label: "Amal", sortable: false, render: (row) => <div className="qp-inline-actions">
          {row.status === "REQUESTED" && can("sales.approve") ? <SecondaryButton type="button" onClick={() => runAction(row, "approve")}><Check size={14} /> Tasdiqlash</SecondaryButton> : null}
          {row.status === "APPROVED" && can("inventory.update") ? <SecondaryButton type="button" onClick={() => runAction(row, "receive")}><PackageCheck size={14} /> Qabul qilish</SecondaryButton> : null}
          {row.status === "RECEIVED" && can("finance.approve") ? <SecondaryButton type="button" onClick={() => openRefund(row)}><WalletCards size={14} /> Pul qaytarish</SecondaryButton> : null}
        </div> },
      ]}
      detailTitle={(row) => row.number}
      detailDescription={(row) => `${row.orderNumber} · ${row.customer}`}
      detailRenderer={(row) => <div className="qp-stack">
        <div className="qp-detail-kpis"><div><span>Summa</span><strong>{formatMoney(row.total)}</strong></div><div><span>Sotuv</span><strong>{row.orderNumber}</strong></div><div><span>Holat</span><StatusPill status={row.status} /></div></div>
        <div className="qp-drawer-detail-row"><span>Sabab</span><strong>{row.reason || "—"}</strong></div>
        {(row.items || []).map((item) => <div className="qp-drawer-detail-row" key={item.id}><span>{lineLabel(item.orderItem || item)}</span><strong>{Number(item.quantity)} · {item.condition || "RESTOCK"}</strong></div>)}
      </div>}
    />

    <Modal open={createOpen} title="Yangi qaytarish" description="Yakunlangan sotuvni tanlang, qaytgan birliklarni va holatini aniq belgilang." onClose={() => setCreateOpen(false)} wide>
      <form onSubmit={submitReturn}>
        <div className="qp-form-grid">
          <Field label="Yakunlangan sotuv"><Select searchable value={orderId} onChange={(event) => chooseOrder(event.target.value)}><option value="">Sotuvni tanlang</option>{completedOrders.map((order) => <option key={order.id} value={order.id}>{order.number} · {order.customer?.name || getName(db.customers, order.customerId)} · {formatMoney(order.total)}</option>)}</Select></Field>
          <Field label="Sabab"><input className="qp-input" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></Field>
        </div>
        {selectedOrder ? <div className="qp-stack qp-form-grid-spaced">
          {selectedLines.map((line) => {
            const remaining = Math.max(0, numberValue(line.quantity) - numberValue(claims.quantityByItem.get(line.id)));
            const draft = draftItems[line.id] || blankLine();
            const product = line.product || db.products.find((item) => item.id === line.productId);
            const baseQuantity = Math.round(numberValue(draft.quantity) * numberValue(line.conversionToBase || 1) * 1000) / 1000;
            const requiredSerials = Number.isInteger(baseQuantity) && baseQuantity > 0 ? baseQuantity : 0;
            const availableSerials = (line.serials || []).filter((serial) => serial.status === "SOLD" && !claims.serialIds.has(serial.id));
            if (remaining <= 1e-9) return null;
            return <section className="qp-card" key={line.id}>
              <div className="qp-card-head"><div><h2>{lineLabel(line)}</h2><p>Sotilgan: {Number(line.quantity)} · Qaytarish mumkin: {remaining}{line.packageName ? ` ${line.packageName}` : ""}</p></div><strong>{formatMoney(numberValue(line.unitPrice) * numberValue(draft.quantity))}</strong></div>
              <div className="qp-form-grid">
                <Field label="Qaytarish miqdori" hint={line.packageName ? `1 ${line.packageName} = ${Number(line.conversionToBase || 1)} base unit` : ""}><input className="qp-input" type="number" min="0" max={remaining} step="0.001" value={draft.quantity} onChange={(event) => updateDraftLine(line.id, { quantity: event.target.value, serialIds: [] })} /></Field>
                <Field label="Mahsulot holati"><Select value={draft.condition} onChange={(event) => updateDraftLine(line.id, { condition: event.target.value })}><option value="RESTOCK">Sotuvga qaytarish</option><option value="DAMAGED">Shikastlangan</option><option value="DISPOSE">Utilizatsiya</option></Select></Field>
                {product?.trackSerial && numberValue(draft.quantity) > 0 ? <div className="qp-form-grid-span"><Field label={`Serial / IMEI (${draft.serialIds.length}/${requiredSerials})`} hint={availableSerials.length ? "Mijoz qaytargan aynan o‘sha qurilma serialini tanlang." : "Bu eski sotuvda serial identifikatori topilmadi."}><div className="qp-selector-serials">{availableSerials.map((serial) => <label key={serial.id}><input type="checkbox" checked={draft.serialIds.includes(serial.id)} onChange={() => toggleSerial(line.id, serial.id, requiredSerials)} /><span>{serial.imei || serial.serial}{serial.batch?.lotNumber ? ` · lot ${serial.batch.lotNumber}` : ""}</span></label>)}</div></Field></div> : null}
              </div>
            </section>;
          })}
        </div> : null}
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setCreateOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit"><RotateCcw size={15} /> Qaytarish so‘rovi</PrimaryButton></div>
      </form>
    </Modal>

    <Modal open={Boolean(refundRow)} title="Pulni qaytarish" description={refundRow ? `${refundRow.number} · ${formatMoney(refundRow.total)}` : ""} onClose={() => setRefundRow(null)}>
      <form onSubmit={submitRefund}>
        <div className="qp-form-grid">
          <Field label="Qaytarish usuli"><Select value={refundMethodCode || refundOptions[0]?.code || ""} onChange={(event) => setRefundMethodCode(event.target.value)}>{refundOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field>
          <Field label="Izoh"><input className="qp-input" value={refundNote} onChange={(event) => setRefundNote(event.target.value)} maxLength={500} placeholder="Ixtiyoriy" /></Field>
        </div>
        {refundSettlement.creditOffset > 0 ? <div className="qp-empty"><strong>{formatMoney(refundSettlement.creditOffset)} mijoz qarzidan kamayadi</strong><span>{refundSettlement.payoutAmount > 0 ? `${formatMoney(refundSettlement.payoutAmount)} real refund qilinadi.` : "Real pul chiqimi yo‘q; qaytarish to‘liq qarzdorlikni kamaytiradi."}</span></div> : null}
        {selectedRefundOption?.method === "CASH" && refundSettlement.payoutAmount > 0 ? <div className="qp-empty"><strong>{currentShift ? `Ochiq smena: ${formatMoney(currentShift.expectedCash)}` : "Ochiq kassa smenasi topilmadi"}</strong><span>Naqd refund faqat joriy xodimning ochiq smenasidan amalga oshiriladi.</span></div> : null}
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setRefundRow(null)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit"><WalletCards size={15} /> {refundSettlement.payoutAmount > 0 ? `${formatMoney(refundSettlement.payoutAmount)} qaytarish` : "Qarzni kamaytirish"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}

export default ReturnsPage;

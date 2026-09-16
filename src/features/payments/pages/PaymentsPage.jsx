import { CheckCircle2, Plus, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { usePermissions } from "../../../hooks/usePermissions";
import { getCustomerAdvance, getCustomerDebt, getCustomerOpenInvoices, getFinanceSummary } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { approvePayment, collectPayment, settlePaymentCash } from "../../../services/prototypeActions";
import { dateKeyForTimeZone } from "../../../utils/date";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";
import { getPaymentMethodLabel } from "../../../utils/labels";

const emptyForm = () => ({ targetType: "CUSTOMER", customerId: "", supplierId: "", amount: "", method: "CASH" });

function PaymentsPage() {
  const db = useLocalDb();
  const { user } = useAuth();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const selectedCustomer = db.customers.find((item) => item.id === form.customerId);
  const selectedSupplier = db.suppliers.find((item) => item.id === form.supplierId);
  const currentShift = (db.shifts || []).find((shift) => shift.status === "OPEN" && shift.employeeId === user?.id);
  const isFieldCollector = (user?.modules || []).some((module) => ["agent_workspace", "driver_workspace"].includes(module));
  const paymentMethods = (db.paymentMethods || []).filter((item) => item.status === "ACTIVE" && item.method !== "CREDIT");
  const selectedMethod = paymentMethods.find((item) => item.code === form.method);

  const openInvoices = useMemo(() => getCustomerOpenInvoices(db, form.customerId), [db, form.customerId]);
  const previewAllocations = useMemo(() => {
    let remaining = Number(form.amount) || 0;
    return openInvoices.map((invoice) => {
      const due = Math.max(0, Number(invoice.total || 0) - Number(invoice.credited || 0) - Number(invoice.paid || 0));
      const allocated = Math.max(0, Math.min(due, remaining));
      remaining -= allocated;
      return { invoice, due, allocated };
    });
  }, [form.amount, openInvoices]);
  const supplierDebts = useMemo(() => (db.debts || [])
    .filter((debt) => debt.supplierId === form.supplierId && Number(debt.outstanding || 0) > 0)
    .sort((a, b) => String(a.dueAt || a.createdAt || "").localeCompare(String(b.dueAt || b.createdAt || ""))), [db.debts, form.supplierId]);
  const supplierPreview = useMemo(() => {
    let remaining = Number(form.amount) || 0;
    return supplierDebts.map((debt) => {
      const due = Number(debt.outstanding || 0);
      const allocated = Math.max(0, Math.min(due, remaining));
      remaining -= allocated;
      return { debt, due, allocated };
    });
  }, [form.amount, supplierDebts]);

  const rows = db.payments.map((item) => ({
    ...item,
    partner: item.customerId ? getName(db.customers, item.customerId) : item.supplierId ? getName(db.suppliers, item.supplierId) : "Hamkorsiz",
    partnerType: item.supplierId ? "Yetkazib beruvchi" : item.customerId ? "Mijoz" : "—",
    invoice: item.allocations?.length ? `${item.allocations.length} ta faktura` : item.debtAllocations?.length ? `${item.debtAllocations.length} ta qarz` : "Avans / taqsimlanmagan",
    methodLabel: (db.paymentMethods || []).find((method) => method.code === item.methodCode)?.name || getPaymentMethodLabel(item.method, db.paymentMethods),
  }));
  const timezone = db.settings?.company?.timezone || "Asia/Tashkent";
  const today = dateKeyForTimeZone(new Date(), timezone);
  const todayTotal = db.payments.filter((item) => dateKeyForTimeZone(item.paidAt || item.createdAt, timezone) === today && item.status === "CONFIRMED" && !item.supplierId)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = db.payments.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const finance = getFinanceSummary(db);
  const totalDebt = finance.totalDebt;
  const selectedDebt = selectedCustomer ? getCustomerDebt(db, selectedCustomer.id) : 0;
  const selectedAdvance = selectedCustomer ? getCustomerAdvance(db, selectedCustomer.id) : 0;

  const openCreate = () => {
    setMessage("");
    const firstMethod = paymentMethods[0]?.code || "CASH";
    setForm({ ...emptyForm(), method: firstMethod });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.targetType === "CUSTOMER" && !form.customerId) return notify("Mijozni tanlang", "warning");
    if (form.targetType === "SUPPLIER" && !form.supplierId) return notify("Yetkazib beruvchini tanlang", "warning");
    if (!selectedMethod) return notify("Faol to‘lov usulini tanlang", "warning");
    if (selectedMethod.method === "CASH" && form.targetType === "SUPPLIER" && !currentShift) return notify("Yetkazib beruvchiga naqd to‘lov uchun ochiq kassa smenasi kerak", "warning");
    if (selectedMethod.method === "CASH" && form.targetType === "CUSTOMER" && !currentShift && !isFieldCollector) return notify("Naqd to‘lov qabul qilish uchun ochiq kassa smenasi kerak", "warning");
    const result = await collectPayment({
      customerId: form.targetType === "CUSTOMER" ? form.customerId : null,
      supplierId: form.targetType === "SUPPLIER" ? form.supplierId : null,
      amount: form.amount,
      methodCode: form.method,
      shiftId: selectedMethod.method === "CASH" ? currentShift?.id : null,
    });
    setMessage(result.message);
    notify(result.message || (result.ok ? "To‘lov qabul qilindi" : "To‘lovni qabul qilib bo‘lmadi"), result.ok ? "success" : "danger");
    if (result.ok) { setOpen(false); setForm(emptyForm()); }
  };

  const approve = async (id) => { const result = await approvePayment(id); notify(result.message, result.ok ? "success" : "danger"); };
  const settleCash = async (id) => {
    if (!currentShift) return notify("Kassaga qabul qilish uchun ochiq kassa smenasi kerak", "warning");
    const result = await settlePaymentCash(id, currentShift.id);
    notify(result.message, result.ok ? "success" : "danger");
  };

  return <>
    <SmartTablePage
      title="To‘lovlar"
      description="Mijoz tushumi va yetkazib beruvchi to‘lovlarini bitta joyda boshqaring. Tasdiqlangan summa eng eski ochiq hujjatlardan boshlab avtomatik taqsimlanadi."
      eyebrow="Moliya"
      rows={rows}
      searchFields={["number", "partner", "partnerType", "methodLabel", "invoice", "status"]}
      extraSummary={[
        { label: "Bugungi tushum", value: formatMoney(todayTotal), hint: "Tasdiqlangan mijoz to‘lovlari" },
        { label: "Tasdiqda", value: formatMoney(pending), hint: "Kutilayotgan to‘lovlar" },
        { label: "Jami qarzdorlik", value: formatMoney(totalDebt), hint: "Mijozlar bo‘yicha" },
        { label: "To‘lovlar soni", value: rows.length, hint: "Jami operatsiyalar" },
      ]}
      actions={can("finance.create") ? <PrimaryButton onClick={openCreate}><Plus size={15} /> To‘lov qabul qilish</PrimaryButton> : null}
      detailRenderer={(row) => <div className="qp-drawer-details"><div className="qp-detail-kpis"><div><span>Summa</span><strong>{formatMoney(row.amount)}</strong></div><div><span>Usul</span><strong>{row.methodLabel}</strong></div><div><span>Holat</span><StatusPill status={row.status} /></div></div>{(row.allocations || []).map((allocation) => <div className="qp-drawer-detail-row" key={allocation.invoiceId}><span>{db.invoices.find((invoice) => invoice.id === allocation.invoiceId)?.number || "Faktura"}</span><strong>{formatMoney(allocation.amount)}</strong></div>)}{(row.debtAllocations || []).map((allocation) => <div className="qp-drawer-detail-row" key={allocation.debtId}><span>Qarz</span><strong>{formatMoney(allocation.amount)}</strong></div>)}</div>}
      columns={[
        { key: "number", label: "To‘lov", render: (row) => <strong>{row.number}</strong> },
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "partner", label: "Hamkor" },
        { key: "partnerType", label: "Turi" },
        { key: "methodLabel", label: "Usul" },
        { key: "invoice", label: "Taqsimot" },
        { key: "amount", label: "Summa", render: (row) => <strong>{formatMoney(row.amount)}</strong> },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        { key: "actions", label: "Amal", sortable: false, render: (row) => row.status === "PENDING"
          ? (can("finance.approve") ? <PrimaryButton onClick={() => approve(row.id)}><CheckCircle2 size={14} /> Tasdiqlash</PrimaryButton> : <span className="qp-muted">Tasdiq kutilmoqda</span>)
          : row.status === "CONFIRMED" && row.method === "CASH" && !row.shiftId && row.customerId
            ? (can("finance.approve") ? <SecondaryButton onClick={() => settleCash(row.id)}><WalletCards size={14} /> Kassaga qabul qilish</SecondaryButton> : <span className="qp-muted">Xodimdagi naqd</span>)
            : <span className="qp-muted">Yakunlangan</span> },
      ]}
    />

    <Modal open={open} title="To‘lov" description="Tizim summani eng eski ochiq hujjatlardan boshlab avtomatik taqsimlaydi; ortiqcha summa avans bo‘lib qoladi." onClose={() => setOpen(false)} wide>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <Field label="Hamkor turi"><Select value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value, customerId: "", supplierId: "" })}><option value="CUSTOMER">Mijozdan tushum</option><option value="SUPPLIER">Yetkazib beruvchiga to‘lov</option></Select></Field>
          {form.targetType === "CUSTOMER" ? <Field label="Mijoz"><Select searchable value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">Tanlang</option>{db.customers.map((item) => <option key={item.id} value={item.id}>{item.name} — qarz {formatMoney(getCustomerDebt(db, item.id))}</option>)}</Select></Field> : <Field label="Yetkazib beruvchi"><Select searchable value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}><option value="">Tanlang</option>{db.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name} — qarz {formatMoney(item.balance || 0)}</option>)}</Select></Field>}
          <Field label="Summa"><input className="qp-input" type="number" min="1" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
          <Field label="To‘lov usuli"><Select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>{paymentMethods.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</Select></Field>
        </div>

        {selectedCustomer ? <div className="qp-payment-customer-summary"><div><span>Joriy qarz</span><strong>{formatMoney(selectedDebt)}</strong></div><div><span>Avans</span><strong>{formatMoney(selectedAdvance)}</strong></div><div><span>Kredit limiti</span><strong>{formatMoney(selectedCustomer.creditLimit || 0)}</strong></div><div><span>Ochiq faktura</span><strong>{openInvoices.length} ta</strong></div></div> : null}
        {selectedSupplier ? <div className="qp-payment-customer-summary"><div><span>Joriy qarz</span><strong>{formatMoney(selectedSupplier.balance || 0)}</strong></div><div><span>Avans</span><strong>{formatMoney(selectedSupplier.advance || 0)}</strong></div><div><span>Ochiq qarz</span><strong>{supplierDebts.length} ta</strong></div><div><span>To‘lov</span><strong>{formatMoney(form.amount || 0)}</strong></div></div> : null}

        {selectedCustomer ? <div className="qp-payment-allocation"><div className="qp-card-head"><div><h2><WalletCards size={16} /> To‘lov taqsimoti</h2><p>Tasdiqlanganda quyidagi fakturalar yangilanadi.</p></div></div>{openInvoices.length ? previewAllocations.map(({ invoice, due, allocated }) => <div className="qp-allocation-row" key={invoice.id}><div><strong>{invoice.number}</strong><span>{shortDate(invoice.date)} · qoldiq {formatMoney(due)}</span></div><strong className={allocated ? "active" : ""}>{allocated ? `+ ${formatMoney(allocated)}` : "—"}</strong></div>) : <div className="qp-empty"><strong>Ochiq faktura yo‘q</strong><span>Kiritilgan summa mijoz avansi sifatida saqlanadi.</span></div>}</div> : null}
        {selectedSupplier ? <div className="qp-payment-allocation"><div className="qp-card-head"><div><h2><WalletCards size={16} /> Qarz taqsimoti</h2><p>To‘lov eng eski yetkazib beruvchi qarzidan boshlanadi.</p></div></div>{supplierDebts.length ? supplierPreview.map(({ debt, due, allocated }) => <div className="qp-allocation-row" key={debt.id}><div><strong>{debt.referenceType === "GoodsReceipt" ? "Mahsulot kirimi" : "Qarz"}</strong><span>{shortDate(debt.createdAt)} · qoldiq {formatMoney(due)}</span></div><strong className={allocated ? "active" : ""}>{allocated ? `+ ${formatMoney(allocated)}` : "—"}</strong></div>) : <div className="qp-empty"><strong>Ochiq qarz yo‘q</strong><span>Kiritilgan summa yetkazib beruvchi avansi sifatida saqlanadi.</span></div>}</div> : null}
        {selectedMethod?.method === "CASH" && !currentShift ? <div className="qp-form-message">{form.targetType === "CUSTOMER" && isFieldCollector ? "Naqd pul xodimdagi naqd sifatida qayd etiladi va keyin kassaga topshiriladi." : "Naqd operatsiya uchun ochiq kassa smenasi kerak."}</div> : null}
        {message ? <div className="qp-form-message">{message}</div> : null}
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{db.settings.finance.requirePaymentConfirmation ? "Tasdiqqa yuborish" : "To‘lovni tasdiqlash"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}
export default PaymentsPage;

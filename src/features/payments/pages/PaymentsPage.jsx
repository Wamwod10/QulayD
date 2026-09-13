import { CheckCircle2, Plus, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { getCustomerAdvance, getCustomerDebt, getCustomerOpenInvoices, getFinanceSummary } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { approvePayment, collectPayment } from "../../../services/prototypeActions";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";
import { getPaymentMethodLabel } from "../../../utils/labels";

function PaymentsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ customerId: "", amount: "", method: "CASH" });
  const selectedCustomer = db.customers.find((item) => item.id === form.customerId);
  const openInvoices = useMemo(() => getCustomerOpenInvoices(db, form.customerId), [db, form.customerId]);
  const previewAllocations = useMemo(() => {
    let remaining = Number(form.amount) || 0;
    return openInvoices.map((invoice) => {
      const due = Number(invoice.total || 0) - Number(invoice.paid || 0);
      const allocated = Math.max(0, Math.min(due, remaining));
      remaining -= allocated;
      return { invoice, due, allocated };
    });
  }, [form.amount, openInvoices]);

  const rows = db.payments.map((item) => ({
    ...item,
    customer: item.customerId ? getName(db.customers, item.customerId) : "Anonim mijoz",
    invoice: item.allocations?.length ? `${item.allocations.length} ta faktura` : db.invoices.find((invoice) => invoice.id === item.invoiceId)?.number || "—",
    methodLabel: getPaymentMethodLabel(item.method, db.paymentMethods),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = db.payments.filter((item) => item.date === today && item.status === "CONFIRMED").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = db.payments.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const finance = getFinanceSummary(db);
  const totalDebt = finance.totalDebt;
  const selectedDebt = selectedCustomer ? getCustomerDebt(db, selectedCustomer.id) : 0;
  const selectedAdvance = selectedCustomer ? getCustomerAdvance(db, selectedCustomer.id) : 0;

  const submit = async (event) => {
    event.preventDefault();
    const result = await collectPayment(form);
    setMessage(result.message);
    notify(result.message || (result.ok ? "To‘lov qabul qilindi" : "To‘lovni qabul qilib bo‘lmadi"), result.ok ? "success" : "danger");
    if (result.ok) { setOpen(false); setForm({ customerId: "", amount: "", method: "CASH" }); }
  };

  const approve = async (id) => { const result = await approvePayment(id); notify(result.message, result.ok ? "success" : "danger"); };

  return <>
    <SmartTablePage
      title="To‘lovlar"
      description="Mijozni tanlang, joriy qarz va ochiq fakturalarni ko‘ring; to‘lov tasdiqlanganda summa fakturalarga avtomatik taqsimlanadi."
      eyebrow="Moliya"
      rows={rows}
      searchFields={["number", "customer", "methodLabel", "invoice", "status"]}
      extraSummary={[
        { label: "Bugungi tushum", value: formatMoney(todayTotal), hint: "Tasdiqlangan to‘lovlar" },
        { label: "Tasdiqda", value: formatMoney(pending), hint: "Kutilayotgan to‘lovlar" },
        { label: "Jami qarzdorlik", value: formatMoney(totalDebt), hint: "Mijozlar bo‘yicha" },
        { label: "To‘lovlar soni", value: rows.length, hint: "Jami operatsiyalar" },
      ]}
      actions={<PrimaryButton onClick={() => { setMessage(""); setOpen(true); }}><Plus size={15} /> To‘lov qabul qilish</PrimaryButton>}
      detailRenderer={(row) => <div className="qp-drawer-details"><div className="qp-detail-kpis"><div><span>Summa</span><strong>{formatMoney(row.amount)}</strong></div><div><span>Usul</span><strong>{row.methodLabel}</strong></div><div><span>Holat</span><StatusPill status={row.status} /></div></div>{(row.allocations || []).map((allocation) => <div className="qp-drawer-detail-row" key={allocation.invoiceId}><span>{db.invoices.find((invoice) => invoice.id === allocation.invoiceId)?.number || "Faktura"}</span><strong>{formatMoney(allocation.amount)}</strong></div>)}</div>}
      columns={[
        { key: "number", label: "To‘lov", render: (row) => <strong>{row.number}</strong> },
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "customer", label: "Mijoz" },
        { key: "methodLabel", label: "Usul" },
        { key: "invoice", label: "Taqsimot" },
        { key: "amount", label: "Summa", render: (row) => <strong>{formatMoney(row.amount)}</strong> },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        { key: "actions", label: "Amal", sortable: false, render: (row) => row.status === "PENDING" ? <PrimaryButton onClick={() => approve(row.id)}><CheckCircle2 size={14} /> Tasdiqlash</PrimaryButton> : <span className="qp-muted">Yakunlangan</span> },
      ]}
    />

    <Modal open={open} title="To‘lov qabul qilish" description="Mijoz qarzi va ochiq fakturalar bir joyda. Qulay summani eng eski ochiq fakturadan boshlab taqsimlaydi." onClose={() => setOpen(false)} wide>
      <form onSubmit={submit}>
        <div className="qp-form-grid"><Field label="Mijoz"><Select searchable value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">Tanlang</option>{db.customers.map((item) => <option key={item.id} value={item.id}>{item.name} — qarz {formatMoney(getCustomerDebt(db, item.id))}</option>)}</Select></Field><Field label="Summa"><input className="qp-input" type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field><Field label="To‘lov usuli"><Select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>{(db.paymentMethods || []).filter((item)=>item.status === "ACTIVE").map((item)=><option key={item.id} value={item.code}>{item.name}</option>)}</Select></Field></div>

        {selectedCustomer ? <div className="qp-payment-customer-summary"><div><span>Joriy qarz</span><strong>{formatMoney(selectedDebt)}</strong></div><div><span>Avans</span><strong>{formatMoney(selectedAdvance)}</strong></div><div><span>Kredit limiti</span><strong>{formatMoney(selectedCustomer.creditLimit || 0)}</strong></div><div><span>Ochiq faktura</span><strong>{openInvoices.length} ta</strong></div></div> : null}

        {selectedCustomer ? <div className="qp-payment-allocation"><div className="qp-card-head"><div><h2><WalletCards size={16} /> To‘lov taqsimoti</h2><p>Tasdiqlanganda quyidagi fakturalar yangilanadi.</p></div></div>{openInvoices.length ? previewAllocations.map(({ invoice, due, allocated }) => <div className="qp-allocation-row" key={invoice.id}><div><strong>{invoice.number}</strong><span>{shortDate(invoice.date)} · qoldiq {formatMoney(due)}</span></div><strong className={allocated ? "active" : ""}>{allocated ? `+ ${formatMoney(allocated)}` : "—"}</strong></div>) : <div className="qp-empty"><strong>Ochiq faktura yo‘q</strong><span>Kiritilgan summa mijoz avansi sifatida saqlanishi mumkin.</span></div>}</div> : null}
        {message ? <div className="qp-form-message">{message}</div> : null}
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{db.settings.finance.requirePaymentConfirmation ? "Tasdiqqa yuborish" : "To‘lovni tasdiqlash"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}
export default PaymentsPage;

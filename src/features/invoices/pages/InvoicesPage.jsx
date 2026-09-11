import { FilePlus2, Printer } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { getCustomerDebt } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { createManualInvoice } from "../../../services/prototypeActions";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";

function InvoicesPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ customerId: "", total: "", date: today, dueDate: today, note: "" });
  const rows = db.invoices.map((item) => ({ ...item, customer: item.customerId ? getName(db.customers, item.customerId) : "Anonim mijoz", balance: Number(item.total || 0) - Number(item.paid || 0) }));
  const outstanding = rows.reduce((sum, invoice) => sum + Math.max(0, invoice.balance), 0);
  const paidTotal = rows.reduce((sum, invoice) => sum + Number(invoice.paid || 0), 0);
  const overdue = rows.filter((invoice) => invoice.status !== "PAID" && invoice.dueDate && invoice.dueDate < today).reduce((sum, invoice) => sum + Math.max(0, invoice.balance), 0);

  const submit = (event) => {
    event.preventDefault();
    const result = createManualInvoice(form);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) { setOpen(false); setForm({ customerId: "", total: "", date: today, dueDate: today, note: "" }); }
  };

  const printInvoice = (row) => {
    const customer = getName(db.customers, row.customerId);
    const printTab = window.open("", "_blank", "noopener,noreferrer,width=760,height=700");
    if (!printTab) { notify("Chop etish oynasini brauzer blokladi", "warning"); return; }
    const brandColor = getComputedStyle(document.documentElement).getPropertyValue("--qp-primary").trim() || "#0a2a43";
    printTab.document.write(`<html><head><meta charset="utf-8"><title>${row.number}</title><style>body{font-family:Arial;padding:36px;color:#172019}header{display:flex;justify-content:space-between;border-bottom:2px solid ${brandColor};padding-bottom:16px}h1{margin:0}.box{margin-top:26px;border:1px solid #ddd;border-radius:12px;padding:20px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.total{font-size:24px;font-weight:800;margin-top:20px}</style></head><body><header><div><h1>Qulay</h1><p>Hisob-faktura</p></div><strong>${row.number}</strong></header><div class="box"><div class="row"><span>Mijoz</span><strong>${customer}</strong></div><div class="row"><span>Sana</span><strong>${shortDate(row.date)}</strong></div><div class="row"><span>To‘langan</span><strong>${formatMoney(row.paid)}</strong></div><div class="row"><span>Qoldiq</span><strong>${formatMoney(row.balance)}</strong></div><div class="total">Jami: ${formatMoney(row.total)}</div></div></body></html>`);
    printTab.document.close(); window.setTimeout(() => printTab.print(), 200);
  };

  return <>
    <SmartTablePage
      title="Hisob-fakturalar"
      description="Yetkazib berish va savdodan avtomatik yaratilgan yoki vakolat bilan qo‘lda kiritilgan moliyaviy hujjatlar."
      eyebrow="Moliya"
      rows={rows}
      searchFields={["number", "customer", "status"]}
      extraSummary={[
        { label: "Ochiq qarz", value: formatMoney(outstanding), hint: "Fakturalar bo‘yicha qoldiq" },
        { label: "To‘langan", value: formatMoney(paidTotal), hint: "Barcha fakturalar bo‘yicha" },
        { label: "Muddati o‘tgan", value: formatMoney(overdue), hint: "E’tibor talab qiladi" },
        { label: "Jami faktura", value: rows.length, hint: "Moliyaviy hujjatlar" },
      ]}
      actions={<PrimaryButton type="button" onClick={() => setOpen(true)}><FilePlus2 size={15} /> Yangi hisob-faktura</PrimaryButton>}
      detailRenderer={(row) => <div className="qp-drawer-details"><div className="qp-detail-kpis"><div><span>Jami</span><strong>{formatMoney(row.total)}</strong></div><div><span>To‘langan</span><strong>{formatMoney(row.paid)}</strong></div><div><span>Qoldiq</span><strong>{formatMoney(row.balance)}</strong></div></div><div className="qp-drawer-detail-row"><span>Mijoz</span><strong>{row.customer}</strong></div><div className="qp-drawer-detail-row"><span>Holat</span><StatusPill status={row.status} /></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => printInvoice(row)}><Printer size={15} /> Chop etish</SecondaryButton></div></div>}
      columns={[
        { key: "number", label: "Hisob-faktura", render: (row) => <strong>{row.number}</strong> },
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "customer", label: "Mijoz" },
        { key: "total", label: "Summa", render: (row) => formatMoney(row.total) },
        { key: "paid", label: "To‘langan", render: (row) => formatMoney(row.paid) },
        { key: "balance", label: "Qoldiq", render: (row) => <strong>{formatMoney(row.balance)}</strong> },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      ]}
    />
    <Modal open={open} title="Yangi hisob-faktura" description="Qo‘lda faktura faqat real zarurat bo‘lganda yaratiladi. Saqlanganda mijoz qarzi va ledger avtomatik yangilanadi." onClose={() => setOpen(false)} wide><form onSubmit={submit}><div className="qp-form-grid"><Field label="Mijoz"><Select searchable value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">Tanlang</option>{db.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · qarz {formatMoney(getCustomerDebt(db, customer.id))}</option>)}</Select></Field><Field label="Summa"><input className="qp-input" type="number" min="1" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} /></Field><Field label="Sana"><input className="qp-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field><Field label="To‘lov muddati"><input className="qp-input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field><Field label="Izoh"><input className="qp-input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ixtiyoriy" /></Field></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Hisob-faktura yaratish</PrimaryButton></div></form></Modal>
  </>;
}
export default InvoicesPage;

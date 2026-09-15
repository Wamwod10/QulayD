import { CheckCircle2, Copy, Plus, Star } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { priceListCustomerCount, normalizePriceList } from "../priceUtils";

const blankForm = { name: "", currency: "UZS", isDefault: false, status: "ACTIVE" };

function PriceListsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(blankForm);
  const rows = (db.priceLists || []).map((item) => ({ ...normalizePriceList(item), customers: priceListCustomerCount(db, item.id) }));

  const startCreate = () => {
    setEditingId("");
    setForm({ ...blankForm, currency: db.settings.company.currency || "UZS", isDefault: rows.length === 0 });
    setOpen(true);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name || "", currency: row.currency || db.settings.company.currency || "UZS", isDefault: Boolean(row.isDefault), status: row.status || "ACTIVE" });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim()) return notify("Narx ro‘yxati nomini kiriting", "warning");
    if (!editingId && rows.some((row) => row.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      return notify("Bu nomdagi narx ro‘yxati mavjud", "warning");
    }
    if (editingId && form.status === "INACTIVE" && form.isDefault) {
      return notify("Asosiy narx ro‘yxatini avval boshqa ro‘yxatga almashtiring", "warning");
    }

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        currency: String(form.currency || "UZS").toUpperCase(),
        isDefault: Boolean(form.isDefault),
        status: form.status,
        ...(editingId ? {} : { code: `PL-${Date.now().toString(36).toUpperCase()}` }),
      };
      await apiRequest({ url: editingId ? `/pricing/${editingId}` : "/pricing", method: editingId ? "PATCH" : "POST", body: payload });
      notify(editingId ? "Narx ro‘yxati yangilandi" : "Narx ro‘yxati yaratildi");
      setOpen(false);
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (row) => {
    try {
      await apiRequest({ url: "/pricing", body: { name: `${row.name} nusxa`, code: `PL-${Date.now().toString(36).toUpperCase()}`, currency: row.currency || db.settings.company.currency || "UZS", isDefault: false, status: "ACTIVE" } });
      notify("Narx ro‘yxati nusxalandi");
    } catch (error) { notify(error.message, "danger"); }
  };

  return <>
    <SmartTablePage
      title="Narx ro‘yxatlari"
      description="Asosiy narx va mijoz guruhlari uchun kerakli narx ro‘yxatlarini boshqaring. Narx turlarini biznesingizga mos nom va tartibda o‘zingiz yaratasiz."
      eyebrow="Sozlamalar"
      rows={rows}
      searchFields={["name", "code", "currency", "status"]}
      actions={<PrimaryButton onClick={startCreate}><Plus size={15}/> Narx ro‘yxati</PrimaryButton>}
      columns={[
        { key: "name", label: "Nomi", render: (row) => <div className="qp-price-list-name"><strong>{row.name}</strong>{row.isDefault ? <span><Star size={12}/> Asosiy</span> : null}</div> },
        { key: "code", label: "Kod" },
        { key: "currency", label: "Valyuta" },
        { key: "customers", label: "Mijozlar", render: (row) => `${row.customers} ta` },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status}/> },
        { key: "actions", label: "Amal", sortable: false, render: (row) => <div className="qp-inline-actions"><SecondaryButton onClick={() => startEdit(row)}>Tahrirlash</SecondaryButton><button type="button" className="qp-icon-button" title="Nusxalash" onClick={() => duplicate(row)}><Copy size={14}/></button></div> },
      ]}
    />
    <Modal open={open} title={editingId ? "Narx ro‘yxatini tahrirlash" : "Yangi narx ro‘yxati"} description="Masalan: Asosiy narx, Distributor, VIP, Korporativ yoki Promo. Mahsulot narxlari shu ro‘yxatga alohida biriktiriladi." onClose={() => !busy && setOpen(false)}>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <Field label="Nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Masalan: Distributor" autoFocus /></Field>
          <Field label="Valyuta"><input className="qp-input" maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) })} placeholder="UZS" /></Field>
          <Field label="Holat"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Faol</option><option value="INACTIVE">Faolsiz</option></Select></Field>
          <label className={`qp-price-list-default-card ${form.isDefault ? "active" : ""}`}>
            <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}/>
            <CheckCircle2 size={19}/>
            <span><strong>Asosiy narx sifatida ishlatish</strong><small>Mijozga boshqa narx ro‘yxati biriktirilmagan bo‘lsa shu narx ishlaydi.</small></span>
          </label>
        </div>
        <div className="qp-form-actions"><SecondaryButton type="button" disabled={busy} onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={busy}>{busy ? "Saqlanmoqda..." : "Saqlash"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}

export default PriceListsPage;

import { Edit3, Plus, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import LocationPicker from "../../../components/maps/LocationPicker";
import RowActions from "../../../components/prototype/RowActions";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { addLocalRecord, removeLocalRecord, updateLocalRecord, useLocalDb } from "../../../services/localDb";
import { getActiveCompanyId, getCompanyPlanLimits } from "../../../services/authService";
import { notify } from "../../../services/notify";

const blank = { name: "", branch: "Bosh filial", address: "", latitude: null, longitude: null };

function WarehousesPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blank);
  const warehouses = useMemo(() => db.warehouses.map((warehouse) => ({
    ...warehouse,
    productsCount: db.balances.filter((balance) => balance.warehouseId === warehouse.id && Number(balance.onHand || 0) !== 0).length,
    onHand: db.balances.filter((balance) => balance.warehouseId === warehouse.id).reduce((sum, balance) => sum + Number(balance.onHand || 0), 0),
  })), [db.balances, db.warehouses]);

  const startCreate = () => { setEditingId(""); setForm(blank); setOpen(true); };
  const startEdit = (row) => { setEditingId(row.id); setForm({ name: row.name || "", branch: row.branch || "Bosh filial", address: row.address || "", latitude: row.latitude || null, longitude: row.longitude || null }); setOpen(true); };
  const submit = (event) => {
    event.preventDefault(); if (!form.name.trim()) { notify("Ombor nomini kiriting", "warning"); return; }
    const payload = { name: form.name.trim(), branch: form.branch.trim() || "Bosh filial", address: form.address.trim(), latitude: Number(form.latitude) || null, longitude: Number(form.longitude) || null };
    if (editingId) { updateLocalRecord("warehouses", editingId, payload); notify("Ombor yangilandi"); }
    else {
      const limit = Number(getCompanyPlanLimits(getActiveCompanyId())?.warehouses || 0);
      const activeCount = db.warehouses.filter((item) => item.status !== "DELETED").length;
      if (limit && activeCount >= limit) { notify(`Tarif bo‘yicha omborlar limiti ${limit} ta. Super Admin orqali limit yoki tarifni oshiring.`, "warning"); return; }
      addLocalRecord("warehouses", { ...payload, status: "ACTIVE" }); notify("Ombor qo‘shildi");
    }
    setOpen(false);
  };
  const toggleStatus = (row) => { const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"; updateLocalRecord("warehouses", row.id, { status: next }); notify(next === "ACTIVE" ? "Ombor faollashtirildi" : "Ombor arxivlandi"); };
  const removeWarehouse = (row) => {
    const hasHistory = db.balances.some((item) => item.warehouseId === row.id) || db.movements.some((item) => item.warehouseId === row.id) || db.orders.some((item) => item.warehouseId === row.id);
    if (hasHistory) { notify("Bu omborda qoldiq yoki tarixiy hujjatlar bor. O‘chirish o‘rniga faolsizlantiring.", "warning"); return; }
    if (!window.confirm(`“${row.name}” ombori butunlay o‘chirilsinmi?`)) return;
    removeLocalRecord("warehouses", row.id); notify("Ombor o‘chirildi", "warning");
  };

  return <>
    <SmartTablePage title="Omborlar" description="Kompaniya omborlari, filial, lokatsiya va joriy mahsulot qoldiqlari." eyebrow="Ombor" rows={warehouses} searchFields={["name", "branch", "address"]} extraSummary={[{ label: "Faol omborlar", value: warehouses.filter((item) => item.status === "ACTIVE").length, hint: "Operatsiyada ishlatiladi" }, { label: "Mahsulot pozitsiyalari", value: warehouses.reduce((sum, item) => sum + item.productsCount, 0), hint: "Qoldig‘i mavjud pozitsiyalar" }, { label: "Jami birlik", value: warehouses.reduce((sum, item) => sum + item.onHand, 0), hint: "Barcha omborlar bo‘yicha" }]} actions={<PrimaryButton onClick={startCreate}><Plus size={15} /> Ombor</PrimaryButton>} columns={[
      { key: "name", label: "Nomi", render: (row) => <div><strong>{row.name}</strong><div className="qp-muted">{row.address || "Manzil kiritilmagan"}</div></div> },
      { key: "branch", label: "Filial" },
      { key: "productsCount", label: "Mahsulotlar", render: (row) => `${row.productsCount} ta` },
      { key: "onHand", label: "Jami qoldiq", render: (row) => <strong>{row.onHand}</strong> },
      { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      { key: "actions", label: "Amal", sortable: false, render: (row) => <RowActions items={[{ label: "Tahrirlash", icon: Edit3, onClick: () => startEdit(row) }, { label: row.status === "ACTIVE" ? "Faolsizlantirish" : "Faollashtirish", icon: Power, onClick: () => toggleStatus(row) }, { label: "Butunlay o‘chirish", icon: Trash2, tone: "danger", onClick: () => removeWarehouse(row) }]} /> },
    ]} />
    <Modal open={open} title={editingId ? "Omborni tahrirlash" : "Yangi ombor"} description="Joylashuv Yandex xarita va yetkazib berish marshrutlarida ishlatiladi." onClose={() => setOpen(false)} wide><form onSubmit={submit}><div className="qp-form-grid"><Field label="Nomi"><input className="qp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Filial"><input className="qp-input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></Field><div style={{ gridColumn: "1 / -1" }}><LocationPicker value={form} onChange={(location) => setForm({ ...form, ...location })} /></div></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{editingId ? "Yangilash" : "Saqlash"}</PrimaryButton></div></form></Modal>
  </>;
}
export default WarehousesPage;

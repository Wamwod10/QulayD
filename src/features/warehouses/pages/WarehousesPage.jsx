import { Edit3, Plus, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import LocationPicker from "../../../components/maps/LocationPicker";
import RowActions from "../../../components/prototype/RowActions";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { ConfirmActionModal, Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";

const blank = { name: "", branchId: "", address: "", latitude: null, longitude: null };

function WarehousesPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blank);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const warehouses = useMemo(() => db.warehouses.map((warehouse) => ({
    ...warehouse,
    branchName: warehouse.branchName || warehouse.branch?.name || "—",
    productsCount: db.balances.filter((balance) => balance.warehouseId === warehouse.id && Number(balance.onHand || 0) !== 0).length,
    onHand: db.balances.filter((balance) => balance.warehouseId === warehouse.id).reduce((sum, balance) => sum + Number(balance.onHand || 0), 0),
  })), [db.balances, db.warehouses]);

  const startCreate = () => { setEditingId(""); setForm({ ...blank, branchId: db.branches?.[0]?.id || "" }); setOpen(true); };
  const startEdit = (row) => { setEditingId(row.id); setForm({ name: row.name || "", branchId: row.branchId || row.branch?.id || "", address: row.address || "", latitude: row.latitude ?? null, longitude: row.longitude ?? null }); setOpen(true); };
  const submit = async (event) => {
    event.preventDefault(); if (!form.name.trim()) { notify("Ombor nomini kiriting", "warning"); return; }
    const payload = { name: form.name.trim(), branchId: form.branchId || null, address: form.address.trim() || undefined, latitude: form.latitude === null || form.latitude === "" ? undefined : Number(form.latitude), longitude: form.longitude === null || form.longitude === "" ? undefined : Number(form.longitude) };
    if (editingId) { await apiRequest({ url: `/inventory/warehouses/${editingId}`, method: "PATCH", body: payload }); notify("Ombor yangilandi"); }
    else {
      await apiRequest({ url: "/inventory/warehouses", body: { ...payload, code: `WH-${Date.now().toString(36).toUpperCase()}`, status: "ACTIVE" } }); notify("Ombor qo‘shildi");
    }
    setOpen(false);
  };
  const toggleStatus = async (row) => { const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"; await apiRequest({ url: `/inventory/warehouses/${row.id}`, method: "PATCH", body: { status: next } }); notify(next === "ACTIVE" ? "Ombor faollashtirildi" : "Ombor arxivlandi"); };
  const removeWarehouse = async (row) => {
    const hasHistory = db.balances.some((item) => item.warehouseId === row.id) || db.movements.some((item) => item.warehouseId === row.id) || db.orders.some((item) => item.warehouseId === row.id);
    if (hasHistory) { notify("Bu omborda qoldiq yoki tarixiy hujjatlar bor. O‘chirish o‘rniga faolsizlantiring.", "warning"); return; }
    setDeleteTarget(row);
  };
  const confirmRemoveWarehouse = async () => {
    if (!deleteTarget) return;
    try { await apiRequest({ url: `/inventory/warehouses/${deleteTarget.id}`, method: "DELETE" }); notify("Ombor butunlay o‘chirildi", "warning"); setDeleteTarget(null); }
    catch (error) { notify(error.message, "danger"); }
  };

  return <>
    <SmartTablePage title="Omborlar" description="Kompaniya omborlari, filial, lokatsiya va joriy mahsulot qoldiqlari." eyebrow="Ombor" rows={warehouses} searchFields={["name", "branchName", "address"]} extraSummary={[{ label: "Faol omborlar", value: warehouses.filter((item) => item.status === "ACTIVE").length, hint: "Operatsiyada ishlatiladi" }, { label: "Mahsulot pozitsiyalari", value: warehouses.reduce((sum, item) => sum + item.productsCount, 0), hint: "Qoldig‘i mavjud pozitsiyalar" }, { label: "Jami birlik", value: warehouses.reduce((sum, item) => sum + item.onHand, 0), hint: "Barcha omborlar bo‘yicha" }]} actions={<PrimaryButton onClick={startCreate}><Plus size={15} /> Ombor</PrimaryButton>} columns={[
      { key: "name", label: "Nomi", render: (row) => <div><strong>{row.name}</strong><div className="qp-muted">{row.address || "Manzil kiritilmagan"}</div></div> },
      { key: "branchName", label: "Filial" },
      { key: "productsCount", label: "Mahsulotlar", render: (row) => `${row.productsCount} ta` },
      { key: "onHand", label: "Jami qoldiq", render: (row) => <strong>{row.onHand}</strong> },
      { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      { key: "actions", label: "Amal", sortable: false, render: (row) => <RowActions items={[{ label: "Tahrirlash", icon: Edit3, onClick: () => startEdit(row) }, { label: row.status === "ACTIVE" ? "Faolsizlantirish" : "Faollashtirish", icon: Power, onClick: () => toggleStatus(row) }, { label: "Butunlay o‘chirish", icon: Trash2, tone: "danger", onClick: () => removeWarehouse(row) }]} /> },
    ]} />
    <Modal open={open} title={editingId ? "Omborni tahrirlash" : "Yangi ombor"} description="Joylashuv Yandex xarita va yetkazib berish marshrutlarida ishlatiladi." onClose={() => setOpen(false)} wide><form onSubmit={submit}><div className="qp-form-grid"><Field label="Nomi"><input className="qp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Filial"><select className="qp-input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">Biriktirilmagan</option>{(db.branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field><div style={{ gridColumn: "1 / -1" }}><LocationPicker value={form} onChange={(location) => setForm({ ...form, ...location })} /></div></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{editingId ? "Yangilash" : "Saqlash"}</PrimaryButton></div></form></Modal>
    <ConfirmActionModal open={Boolean(deleteTarget)} title="Omborni butunlay o‘chirish" description={deleteTarget ? `“${deleteTarget.name}” omborini o‘chirishni tasdiqlang.` : ""} consequence="Bu amalni ortga qaytarib bo‘lmaydi. Faqat qoldiq va tarixiy hujjati bo‘lmagan ombor o‘chiriladi." confirmLabel="Butunlay o‘chirish" onClose={() => setDeleteTarget(null)} onConfirm={confirmRemoveWarehouse} />
  </>;
}
export default WarehousesPage;

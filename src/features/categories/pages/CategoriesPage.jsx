import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import RowActions from "../../../components/prototype/RowActions";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { ConfirmActionModal, Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";

function CategoriesPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(() => db.categories.map((category) => ({
    ...category,
    productsCount: db.products.filter((product) => product.categoryId === category.id).length,
  })), [db.categories, db.products]);

  const startCreate = () => {
    setEditingId("");
    setName("");
    setOpen(true);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setName(row.name);
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      notify("Kategoriya nomini kiriting", "warning");
      return;
    }
    const duplicate = db.categories.some((category) => category.id !== editingId && category.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      notify("Bu nomdagi kategoriya allaqachon mavjud", "warning");
      return;
    }
    if (editingId) {
      await apiRequest({ url: `/catalog/categories/${editingId}`, method: "PATCH", body: { name: cleanName } });
      notify("Kategoriya yangilandi");
    } else {
      await apiRequest({ url: "/catalog/categories", body: { name: cleanName, status: "ACTIVE" } });
      notify("Kategoriya qo‘shildi");
    }
    setOpen(false);
  };

  const toggleStatus = async (row) => {
    const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await apiRequest({ url: `/catalog/categories/${row.id}`, method: "PATCH", body: { status: next } });
    notify(next === "ACTIVE" ? "Kategoriya faollashtirildi" : "Kategoriya faolsizlantirildi");
  };

  const removeCategory = async () => {
    if (!deleteTarget) return;
    try { await apiRequest({ url: `/catalog/categories/${deleteTarget.id}`, method: "DELETE" }); notify("Kategoriya butunlay o‘chirildi", "warning"); setDeleteTarget(null); }
    catch (error) { notify(error.message, "danger"); }
  };

  return (
    <>
      <SmartTablePage
        title="Kategoriyalar"
        description="Mahsulot guruhlari, ularga bog‘langan mahsulotlar va katalog tartibini bir joydan boshqaring."
        eyebrow="Ombor"
        rows={rows}
        searchFields={["name", "status"]}
        actions={<PrimaryButton onClick={startCreate}><Plus size={15} /> Kategoriya</PrimaryButton>}
        detailTitle={(row) => row.name}
        detailDescription={(row) => `${row.productsCount} ta mahsulot ushbu kategoriyaga bog‘langan`}
        columns={[
          { key: "name", label: "Nomi", render: (row) => <strong>{row.name}</strong> },
          { key: "productsCount", label: "Mahsulotlar", render: (row) => <strong>{row.productsCount} ta</strong> },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          {
            key: "actions",
            label: "Amallar",
            sortable: false,
            render: (row) => <RowActions items={[
              { label: "Tahrirlash", icon: Pencil, onClick: () => startEdit(row) },
              { label: row.status === "ACTIVE" ? "Faolsizlantirish" : "Faollashtirish", icon: Power, onClick: () => toggleStatus(row) },
              { label: "Butunlay o‘chirish", icon: Trash2, tone: "danger", onClick: () => {
                if (row.productsCount > 0) { notify("Bu kategoriyada mahsulotlar bor. O‘chirish o‘rniga faolsizlantiring.", "warning"); return; }
                setDeleteTarget(row);
              } },
            ]} />,
          },
        ]}
      />

      <Modal open={open} title={editingId ? "Kategoriyani tahrirlash" : "Yangi kategoriya"} description="Kategoriya Ombor va mahsulot formalarida darhol ko‘rinadi." onClose={() => setOpen(false)}>
        <form onSubmit={submit}>
          <Field label="Nomi"><input className="qp-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></Field>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{editingId ? "Yangilash" : "Saqlash"}</PrimaryButton></div>
        </form>
      </Modal>
      <ConfirmActionModal open={Boolean(deleteTarget)} title="Kategoriyani butunlay o‘chirish" description={deleteTarget ? `“${deleteTarget.name}” kategoriyasini o‘chirishni tasdiqlang.` : ""} consequence="Bu amalni ortga qaytarib bo‘lmaydi. Mahsulot bog‘langan kategoriya o‘chirilmaydi; uni faolsizlantirish mumkin." confirmLabel="Butunlay o‘chirish" onClose={() => setDeleteTarget(null)} onConfirm={removeCategory} />
    </>
  );
}

export default CategoriesPage;

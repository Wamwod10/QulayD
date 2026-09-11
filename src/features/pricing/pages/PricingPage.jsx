import { Pencil } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import { updateLocalRecord, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";

function PricingPage() {
  const products = useLocalDb((db) => db.products);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ price: 0, wholesalePrice: 0 });

  const openEdit = (product) => {
    setEditing(product);
    setForm({ price: Number(product.price || 0), wholesalePrice: Number(product.wholesalePrice || 0) });
  };

  const save = (event) => {
    event.preventDefault();
    if (!editing) return;
    const price = Math.max(0, Number(form.price) || 0);
    const wholesalePrice = Math.max(0, Number(form.wholesalePrice) || 0);
    if (wholesalePrice > price && price > 0) {
      notify("Tannarx sotuv narxidan yuqori kiritildi. Qiymatni tekshiring.", "warning");
      return;
    }
    updateLocalRecord("products", editing.id, { price, wholesalePrice });
    notify(`${editing.name} narxlari yangilandi`);
    setEditing(null);
  };

  return (
    <>
      <SmartTablePage
        title="Narxlar"
        description="Mahsulot narxlarini bir joyda ko‘ring va tezkor yangilang. O‘zgarishlar kassa hamda buyurtmalarga darhol ta’sir qiladi."
        eyebrow="Ombor"
        rows={products}
        searchFields={["name", "sku"]}
        columns={[
          { key: "name", label: "Mahsulot", render: (row) => <div><strong>{row.name}</strong><div className="qp-muted">SKU {row.sku}</div></div> },
          { key: "price", label: "Sotuv narxi", render: (row) => <strong>{formatMoney(row.price)}</strong> },
          { key: "wholesalePrice", label: "Tannarx", render: (row) => formatMoney(row.wholesalePrice) },
          { key: "actions", label: "Amal", sortable: false, render: (row) => <SecondaryButton onClick={() => openEdit(row)}><Pencil size={14} /> Tahrirlash</SecondaryButton> },
        ]}
      />
      <Modal open={Boolean(editing)} title="Narxlarni yangilash" description={editing?.name || ""} onClose={() => setEditing(null)}>
        <form onSubmit={save} className="qp-stack">
          <div className="qp-form-grid">
            <Field label="Sotuv narxi"><input className="qp-input" type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
            <Field label="Tannarx"><input className="qp-input" type="number" min="0" value={form.wholesalePrice} onChange={(event) => setForm({ ...form, wholesalePrice: event.target.value })} /></Field>
          </div>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setEditing(null)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Narxlarni saqlash</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default PricingPage;

import { Pencil, Tags } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";

function PricingPage() {
  const db = useLocalDb();
  const products = db.products;
  const priceLists = useMemo(() => (db.priceLists || [])
    .filter((list) => list.status !== "INACTIVE" && list.status !== "ARCHIVED")
    .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))), [db.priceLists]);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});

  const openEdit = (product) => {
    setEditing(product);
    const current = Object.fromEntries((product.prices || []).map((entry) => [entry.priceListId || entry.priceList?.id, Number(entry.price || 0)]));
    const defaultList = priceLists[0];
    if (defaultList && current[defaultList.id] == null) current[defaultList.id] = Number(product.price || 0);
    setValues(current);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editing || !priceLists.length) return;
    const defaultList = priceLists.find((list) => list.isDefault) || priceLists[0];
    if (defaultList && (values[defaultList.id] === "" || values[defaultList.id] == null)) {
      notify("Asosiy sotuv narxini kiriting", "warning");
      return;
    }
    const prices = priceLists.flatMap((list) => {
      const raw = values[list.id];
      if (raw === "" || raw == null) return [];
      return [{ priceListId: list.id, price: Math.max(0, Number(raw) || 0) }];
    });
    try {
      await apiRequest({
        url: `/catalog/products/${editing.id}`,
        method: "PATCH",
        body: { prices },
      });
      notify(`${editing.name} narxlari yangilandi`);
      setEditing(null);
    } catch (error) { notify(error.message, "danger"); }
  };

  return (
    <>
      <SmartTablePage
        title="Narxlar"
        description="Mahsulot narxlarini kompaniyangiz yaratgan narx ro‘yxatlari bo‘yicha boshqaring. Hech bir narx turi QULAY tomonidan majburan belgilanmaydi."
        eyebrow="Katalog"
        rows={products}
        searchFields={["name", "sku"]}
        columns={[
          { key: "name", label: "Mahsulot", render: (row) => <div><strong>{row.name}</strong><div className="qp-muted">SKU {row.sku}</div></div> },
          { key: "costPrice", label: "Tannarx", render: (row) => formatMoney(row.costPrice || 0) },
          { key: "price", label: priceLists[0]?.name || "Asosiy narx", render: (row) => <strong>{formatMoney(row.price)}</strong> },
          { key: "prices", label: "Narx turlari", render: (row) => <span className="qp-muted">{(row.prices || []).length || 1} ta</span> },
          { key: "actions", label: "Amal", sortable: false, render: (row) => <SecondaryButton onClick={() => openEdit(row)}><Pencil size={14} /> Tahrirlash</SecondaryButton> },
        ]}
      />
      <Modal open={Boolean(editing)} title="Narxlarni yangilash" description={editing?.name || ""} onClose={() => setEditing(null)}>
        <form onSubmit={save} className="qp-stack">
          {!priceLists.length ? <div className="qp-empty"><Tags size={20}/><strong>Faol narx ro‘yxati yo‘q</strong><span>Sozlamalar → Narx ro‘yxatlari bo‘limidan kamida bitta narx turini yarating.</span></div> : <div className="qp-form-grid">{priceLists.map((list) => <Field key={list.id} label={list.name} hint={list.isDefault ? "Asosiy narx" : list.code || "Qo‘shimcha narx"}><input className="qp-input" type="number" min="0" step="0.01" value={values[list.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [list.id]: event.target.value }))} /></Field>)}</div>}
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setEditing(null)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={!priceLists.length}>Narxlarni saqlash</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default PricingPage;

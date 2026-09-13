import { Archive, Barcode, Edit3, Plus, Power, Printer, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import BarcodeQrModal from "../../../components/prototype/BarcodeQrModal";
import { printProductLabels } from "../../../components/prototype/barcodeQrUtils";
import RowActions from "../../../components/prototype/RowActions";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import ImageUploader from "../../../components/ui/ImageUploader";
import Select from "../../../components/ui/Select";
import { adjustProductStock, createProduct } from "../../../services/prototypeActions";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { PERMISSIONS } from "../../../constants/permissions";
import { usePermissions } from "../../../hooks/usePermissions";
import { formatMoney, getName } from "../../../utils/formatters";
import { collectProductBarcodes, createProductIdentity, generateUniqueSku, getProductBarcodes } from "../../../utils/productCodes";

const blankForm = {
  name: "",
  image: "",
  sku: "",
  barcodes: [],
  categoryId: "",
  unitId: "",
  costPrice: "",
  price: "",
  wholesalePrice: "",
  minStock: "",
  warehouseId: "",
  initialStock: "",
  newStock: "",
};

function ProductsPage() {
  const db = useLocalDb();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [codeProduct, setCodeProduct] = useState(null);
  const [form, setForm] = useState(blankForm);

  const stockMap = useMemo(() => db.balances.reduce((accumulator, balance) => {
    const current = accumulator[balance.productId] || { onHand: 0, reserved: 0 };
    current.onHand += Number(balance.onHand || 0);
    current.reserved += Number(balance.reserved || 0);
    accumulator[balance.productId] = current;
    return accumulator;
  }, {}), [db.balances]);

  const rows = db.products.map((product) => {
    const stock = stockMap[product.id] || { onHand: 0, reserved: 0 };
    const barcodes = getProductBarcodes(product);
    return {
      ...product,
      barcodes,
      barcode: barcodes[0] || "",
      barcodeSearch: barcodes.join(" "),
      category: getName(db.categories, product.categoryId),
      unit: getName(db.units, product.unitId),
      availableStock: stock.onHand - stock.reserved,
      onHand: stock.onHand,
      reserved: stock.reserved,
    };
  });

  const activeCount = rows.filter((item) => item.status === "ACTIVE").length;
  const lowStockCount = rows.filter((item) => item.status === "ACTIVE" && Number(item.availableStock) <= Number(item.minStock || 0)).length;
  const outOfStock = rows.filter((item) => item.status === "ACTIVE" && Number(item.availableStock) <= 0).length;
  const activeWarehouses = db.warehouses.filter((item) => item.status === "ACTIVE");

  const selectedWarehouseBalance = editing && form.warehouseId
    ? db.balances.find((item) => item.productId === editing.id && item.warehouseId === form.warehouseId)
    : null;
  const currentOnHand = Number(selectedWarehouseBalance?.onHand || 0);
  const currentReserved = Number(selectedWarehouseBalance?.reserved || 0);
  const currentAvailable = currentOnHand - currentReserved;

  const openCreate = () => {
    const identity = createProductIdentity(db.products);
    setEditing(null);
    setForm({
      ...blankForm,
      ...identity,
      warehouseId: db.settings.company?.defaultWarehouseId || activeWarehouses[0]?.id || "",
    });
    setOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
    // openCreate intentionally reads the latest product/warehouse state when the quick action is used.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const openEdit = (product) => {
    const warehouseId = db.settings.company?.defaultWarehouseId || activeWarehouses[0]?.id || db.warehouses[0]?.id || "";
    const balance = db.balances.find((item) => item.productId === product.id && item.warehouseId === warehouseId);
    setEditing(product);
    setForm({
      ...blankForm,
      name: product.name || "",
      image: product.image || "",
      sku: product.sku || "",
      barcodes: getProductBarcodes(product).length ? getProductBarcodes(product) : [""],
      categoryId: product.categoryId || "",
      unitId: product.unitId || "",
      costPrice: String(product.costPrice ?? ""),
      price: String(product.price ?? ""),
      wholesalePrice: String(product.wholesalePrice ?? ""),
      minStock: String(product.minStock ?? ""),
      warehouseId,
      newStock: String(balance?.onHand ?? 0),
    });
    setOpen(true);
  };

  const changeWarehouse = (warehouseId) => {
    if (!editing) {
      setForm((current) => ({ ...current, warehouseId }));
      return;
    }
    const balance = db.balances.find((item) => item.productId === editing.id && item.warehouseId === warehouseId);
    setForm((current) => ({ ...current, warehouseId, newStock: String(balance?.onHand ?? 0) }));
  };

  const regenerateSku = () => {
    setForm((current) => ({ ...current, sku: generateUniqueSku(db.products, editing?.id || "") }));
  };

  const addBarcode = () => setForm((current) => ({ ...current, barcodes: [...current.barcodes, ""] }));
  const updateBarcode = (index, value) => setForm((current) => ({ ...current, barcodes: current.barcodes.map((item, itemIndex) => itemIndex === index ? value : item) }));
  const removeBarcode = (index) => setForm((current) => ({ ...current, barcodes: current.barcodes.filter((_, itemIndex) => itemIndex !== index) }));

  const validateIdentity = () => {
    const sku = form.sku.trim();
    const enteredBarcodes = form.barcodes.map((value) => String(value || "").trim()).filter(Boolean);
    const barcodes = Array.from(new Set(enteredBarcodes));
    if (!sku) return { ok: false, message: "SKU kiriting yoki avtomatik yarating" };
    if ((!editing || sku !== String(editing.sku || "")) && !/^\d{5}$/.test(sku)) return { ok: false, message: "SKU faqat 5 ta raqamdan iborat bo'lishi kerak" };
    if (enteredBarcodes.length && enteredBarcodes.length !== barcodes.length) return { ok: false, message: "Bir mahsulotda bir xil shtrix-kod takrorlanmasin" };
    const duplicateSku = db.products.some((product) => product.id !== editing?.id && String(product.sku || "").trim().toLowerCase() === sku.toLowerCase());
    if (duplicateSku) return { ok: false, message: "Bu SKU boshqa mahsulotda mavjud" };
    const existingBarcodes = collectProductBarcodes(db.products, editing?.id || "");
    const duplicateBarcode = barcodes.find((barcode) => existingBarcodes.has(barcode));
    if (duplicateBarcode) return { ok: false, message: `${duplicateBarcode} shtrix-kodi boshqa mahsulotda mavjud` };
    return { ok: true, sku, barcodes };
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.categoryId || !form.unitId) {
      notify("Majburiy maydonlarni to‘ldiring", "warning");
      return;
    }
    const identity = validateIdentity();
    if (!identity.ok) {
      notify(identity.message, "warning");
      return;
    }
    if (!editing && Number(form.initialStock || 0) > 0 && !form.warehouseId) {
      notify("Boshlang‘ich qoldiq uchun omborni tanlang", "warning");
      return;
    }

    try {
      if (editing) {
        await apiRequest({ url: `/catalog/products/${editing.id}`, method: "PATCH", body: {
          name: form.name.trim(), sku: identity.sku, categoryId: form.categoryId, unitId: form.unitId,
          costPrice: Math.max(0, Number(form.costPrice) || 0), minStock: Math.max(0, Number(form.minStock) || 0),
          barcodes: identity.barcodes.map((barcode, index) => ({ barcode, isPrimary: index === 0 })),
          prices: db.priceLists.slice(0, 2).map((list, index) => ({ priceListId: list.id, price: Math.max(0, Number(index ? form.wholesalePrice : form.price) || 0) })),
          ...(form.image && (/^https:\/\//.test(form.image) || /^\/uploads\//.test(form.image)) ? { imageUrl: form.image } : {}),
        } });
        if (form.warehouseId && form.newStock !== "") {
          const currentOnHand = db.balances.find((item) => item.productId === editing.id && item.warehouseId === form.warehouseId)?.onHand || 0;
          const stockResult = await adjustProductStock({ productId: editing.id, warehouseId: form.warehouseId, newOnHand: form.newStock, currentOnHand });
          if (!stockResult.ok) {
            notify(stockResult.message, "warning");
            return;
          }
        }
        notify("Mahsulot va qoldiq yangilandi");
      } else {
        const result = await createProduct({ ...form, priceListId: db.priceLists[0]?.id, wholesalePriceListId: db.priceLists[1]?.id, sku: identity.sku, barcodes: identity.barcodes, barcode: identity.barcodes[0] || "" });
        notify(result.message, result.ok ? "success" : "danger");
        if (!result.ok) return;
      }

      setOpen(false);
      setEditing(null);
      setForm(blankForm);
    } catch (error) {
      notify(error.message || "Mahsulotni saqlab bo‘lmadi", "warning");
    }
  };

  const toggleStatus = async (product) => {
    const next = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try { await apiRequest({ url: `/catalog/products/${product.id}`, method: "PATCH", body: { status: next } }); notify(next === "ACTIVE" ? "Mahsulot faollashtirildi" : "Mahsulot faolsizlantirildi"); }
    catch (error) { notify(error.message, "danger"); }
  };

  const archiveSelected = (selectedRows, clear) => (
    <>
      <SecondaryButton type="button" onClick={() => printProductLabels(selectedRows)}><Printer size={15} /> Shtrix/QR chop etish</SecondaryButton>
       <SecondaryButton type="button" onClick={async () => {
         const ids = selectedRows.map((item) => item.id);
         await Promise.all(ids.map((id) => apiRequest({ url: `/catalog/products/${id}`, method: "PATCH", body: { status: "INACTIVE" } })));
        clear();
        notify(`${ids.length} ta mahsulot faolsizlantirildi`);
      }}><Archive size={15} /> Faolsizlantirish</SecondaryButton>
    </>
  );

  return (
    <>
      <SmartTablePage
        title="Mahsulotlar"
        description="Savdo, tezkor kassa va ombor foydalanadigan yagona katalog. Rasm, narx, SKU, bir nechta shtrix-kod va real qoldiq shu yerda bog‘langan."
        eyebrow="Ombor"
        rows={rows}
        searchFields={["name", "sku", "barcodeSearch", "category"]}
        extraSummary={[
          { label: "Faol mahsulot", value: activeCount, hint: "Savdoda foydalanish mumkin" },
          { label: "Kam qoldiq", value: lowStockCount, hint: "Minimal qoldiqqa yetgan" },
          { label: "Qoldiq tugagan", value: outOfStock, hint: "Sotish uchun mavjud emas" },
          { label: "Kategoriyalar", value: db.categories.length, hint: "Mahsulot guruhlari" },
        ]}
        bulkActions={can(PERMISSIONS.PRODUCTS_MANAGE) ? archiveSelected : undefined}
        actions={can(PERMISSIONS.PRODUCTS_MANAGE) ? <PrimaryButton onClick={openCreate}><Plus size={15} /> Yangi mahsulot</PrimaryButton> : null}
        detailTitle={(row) => row.name}
        detailDescription={(row) => `SKU ${row.sku} · ${row.category}`}
        detailRenderer={(row) => (
          <div className="qp-drawer-details">
            {row.image ? <img className="qp-product-detail-image" src={row.image} alt={row.name} /> : null}
            <div className="qp-detail-kpis">
              <div><span>Sotish mumkin</span><strong>{row.availableStock} {row.unit}</strong></div>
              <div><span>Tannarx</span><strong>{formatMoney(row.costPrice || 0)}</strong></div>
              <div><span>Sotuv narxi</span><strong>{formatMoney(row.price)}</strong></div>
              <div><span>Band qilingan</span><strong>{row.reserved} {row.unit}</strong></div>
              <div><span>Sotuv foydasi</span><strong>{formatMoney(Math.max(0, Number(row.price || 0) - Number(row.costPrice || 0)))}</strong></div>
              <div><span>Marja</span><strong>{Number(row.price || 0) > 0 ? `${(((Number(row.price || 0) - Number(row.costPrice || 0)) / Number(row.price || 0)) * 100).toFixed(1)}%` : "0%"}</strong></div>
            </div>
            <div className="qp-drawer-detail-row"><span>Shtrix-kodlar</span><strong>{row.barcodes.join(" · ")}</strong></div>
            <div className="qp-drawer-detail-row"><span>Kategoriya</span><strong>{row.category}</strong></div>
            <div className="qp-drawer-detail-row"><span>Holat</span><StatusPill status={row.status} /></div>
            <div className="qp-form-actions">
              <SecondaryButton type="button" onClick={() => setCodeProduct(row)}><Barcode size={15} /> Shtrix / QR</SecondaryButton>
              {can(PERMISSIONS.PRODUCTS_MANAGE) ? <PrimaryButton type="button" onClick={() => openEdit(row)}><Edit3 size={15} /> Tahrirlash</PrimaryButton> : null}
            </div>
          </div>
        )}
        columns={[
          { key: "name", label: "Mahsulot", render: (row) => <div className="qp-product-name-cell">{row.image ? <img src={row.image} alt="" /> : <span>{row.name.slice(0, 1).toUpperCase()}</span>}<div><strong>{row.name}</strong><div className="qp-muted">SKU {row.sku}</div></div></div> },
          { key: "category", label: "Kategoriya" },
          { key: "unit", label: "Birlik" },
          { key: "barcode", label: "Shtrix-kod", render: (row) => row.barcode ? <button type="button" className="qp-code-link" onClick={() => setCodeProduct(row)}><Barcode size={14} /> {row.barcode}{row.barcodes.length > 1 ? ` +${row.barcodes.length - 1}` : ""}</button> : <span className="qp-muted">—</span> },
          { key: "availableStock", label: "Sotish mumkin", render: (row) => <div className={`qp-stock-cell ${row.availableStock <= 0 ? "danger" : row.availableStock <= Number(row.minStock || 0) ? "warning" : ""}`}><strong>{row.availableStock}</strong><span>{row.unit}</span></div> },
          { key: "costPrice", label: "Tannarx", render: (row) => formatMoney(row.costPrice || 0) },
          { key: "price", label: "Sotuv narxi", render: (row) => <strong>{formatMoney(row.price)}</strong> },
          { key: "wholesalePrice", label: "Tannarx", render: (row) => formatMoney(row.wholesalePrice) },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          ...(can(PERMISSIONS.PRODUCTS_MANAGE) ? [{ key: "actions", label: "Amal", sortable: false, render: (row) => <RowActions items={[
            { label: "Tahrirlash", icon: Edit3, onClick: () => openEdit(row) },
            { label: "Shtrix / QR", icon: Barcode, onClick: () => setCodeProduct(row) },
            { label: row.status === "ACTIVE" ? "Faolsizlantirish" : "Faollashtirish", icon: Power, onClick: () => toggleStatus(row) },
          ]} /> }] : []),
        ]}
      />

      <Modal open={open} title={editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"} description="5 xonali SKU avtomatik yaratiladi. Shtrix-kodlarni foydalanuvchi o‘zi kiritadi." onClose={() => setOpen(false)} wide>
        <form onSubmit={submit}>
          <div className="qp-form-grid">
            <div className="qp-form-span-full"><ImageUploader value={form.image} name={form.name} label="Mahsulot rasmini yuklash" onChange={(image) => setForm((current) => ({ ...current, image }))} /></div>
            <Field label="Mahsulot nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Kategoriya"><Select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Tanlang</option>{db.categories.filter((item) => item.status !== "INACTIVE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="SKU" hint="5 ta raqam; avtomatik yaratiladi, lekin tahrirlash mumkin"><div className="qp-code-edit-row"><input className="qp-input" inputMode="numeric" maxLength={5} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value.replace(/\D/g, "").slice(0, 5) })} /><button type="button" className="qp-icon-button" title="Yangi SKU yaratish" onClick={regenerateSku}><RefreshCw size={15} /></button></div></Field>
            <Field label="O‘lchov birligi"><Select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })}><option value="">Tanlang</option>{db.units.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <div className="qp-form-span-full qp-barcode-editor">
              <div className="qp-barcode-editor-head"><div><strong>Shtrix-kodlar</strong><span>Birinchi kod asosiy hisoblanadi. Har bir kod POS va qidiruvda ishlaydi.</span></div><SecondaryButton type="button" onClick={addBarcode}><Plus size={14} /> Shtrix-kod qo‘shish</SecondaryButton></div>
              <div className="qp-barcode-list">
                {form.barcodes.map((barcode, index) => <div className="qp-barcode-row" key={`barcode-${index}`}><span>{index === 0 ? "Asosiy" : `${index + 1}-kod`}</span><input className="qp-input" value={barcode} onChange={(event) => updateBarcode(index, event.target.value)} placeholder="Shtrix-kodni kiriting" /><button type="button" className="qp-icon-button" title="Olib tashlash" disabled={form.barcodes.length === 1} onClick={() => removeBarcode(index)}><Trash2 size={15} /></button></div>)}
              </div>
            </div>
            <Field label="Minimal qoldiq"><input className="qp-input" type="number" min="0" value={form.minStock} onChange={(event) => setForm({ ...form, minStock: event.target.value })} /></Field>
            <Field label="Tannarx"><input className="qp-input" type="number" min="0" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} placeholder="Mahsulotning boshlang‘ich tannarxi" /></Field>
            <Field label="Sotuv narxi"><input className="qp-input" type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
            <Field label="Tannarx"><input className="qp-input" type="number" min="0" value={form.wholesalePrice} onChange={(event) => setForm({ ...form, wholesalePrice: event.target.value })} /></Field>

            {!editing ? (
              <>
                <Field label="Boshlang‘ich ombor"><Select value={form.warehouseId} onChange={(event) => changeWarehouse(event.target.value)}><option value="">Omborni tanlang</option>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
                <Field label="Boshlang‘ich qoldiq"><input className="qp-input" type="number" min="0" value={form.initialStock} onChange={(event) => setForm({ ...form, initialStock: event.target.value })} placeholder="Masalan 100" /></Field>
              </>
            ) : (
              <>
                <Field label="Qoldiqni tahrirlash ombori"><Select value={form.warehouseId} onChange={(event) => changeWarehouse(event.target.value)}>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
                <div className="qp-stock-edit-summary">
                  <div><span>Haqiqiy qoldiq</span><strong>{currentOnHand}</strong></div>
                  <div><span>Band qilingan</span><strong>{currentReserved}</strong></div>
                  <div><span>Sotish mumkin</span><strong>{currentAvailable}</strong></div>
                </div>
                <Field label="Yangi haqiqiy qoldiq" hint="Farq Ombor harakatlarida ADJUSTMENT sifatida yoziladi"><input className="qp-input" type="number" min="0" value={form.newStock} onChange={(event) => setForm({ ...form, newStock: event.target.value })} /></Field>
              </>
            )}
          </div>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{editing ? "Yangilash" : "Saqlash"}</PrimaryButton></div>
        </form>
      </Modal>

      <BarcodeQrModal open={Boolean(codeProduct)} product={codeProduct} onClose={() => setCodeProduct(null)} />
    </>
  );
}

export default ProductsPage;

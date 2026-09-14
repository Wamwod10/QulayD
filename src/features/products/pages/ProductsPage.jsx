import { Barcode, Boxes, Edit3, LoaderCircle, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import BarcodeQrModal from "../../../components/prototype/BarcodeQrModal";
import { printProductLabels } from "../../../components/prototype/barcodeQrUtils";
import RowActions from "../../../components/prototype/RowActions";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import ImageUploader from "../../../components/ui/ImageUploader";
import Select from "../../../components/ui/Select";
import { adjustProductStock } from "../../../services/prototypeActions";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { PERMISSIONS } from "../../../constants/permissions";
import { usePermissions } from "../../../hooks/usePermissions";
import { formatMoney, getName } from "../../../utils/formatters";
import { collectProductBarcodes, collectProductSkus, createProductIdentity, generateUniqueSku, getProductBarcodes } from "../../../utils/productCodes";

const featureDefaults = { packaging: false, variants: false, expiry: false, lot: false, serial: false, marked: false, supplier: false, location: false };
const blankForm = { name: "", images: [], sku: "", barcodes: [""], categoryId: "", unitId: "", costPrice: "", price: "", wholesalePrice: "",
  minStock: "", warehouseId: "", initialStock: "", newStock: "", description: "", note: "", manufacturer: "", model: "", supplierId: "",
  warehouseLocation: "", features: featureDefaults, packages: [], axes: [], variants: [] };

const cleanNumber = (value) => Math.max(0, Number(value) || 0);
const attributesLabel = (attributes) => Object.entries(attributes || {}).map(([key, value]) => `${key}: ${value}`).join(" · ");

function cartesian(axes) {
  return axes.reduce((rows, axis) => rows.flatMap((row) => axis.values.split(",").map((value) => value.trim()).filter(Boolean)
    .map((value) => ({ ...row, [axis.name.trim()]: value }))), [{}]);
}

function FeatureToggle({ active, label, onClick }) {
  return <button type="button" className={`qp-product-feature-toggle ${active ? "active" : ""}`} onClick={onClick}><span className={`qp-switch ${active ? "on" : ""}`}><i /></span>{label}</button>;
}

function ProductsPage() {
  const db = useLocalDb(); const { can } = usePermissions(); const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null); const [codeProduct, setCodeProduct] = useState(null);
  const [form, setForm] = useState(blankForm); const [busy, setBusy] = useState(false); const [detailTab, setDetailTab] = useState("general");
  const activeWarehouses = (db.warehouses || []).filter((item) => item.status === "ACTIVE");
  const stockMap = useMemo(() => (db.balances || []).reduce((map, balance) => { const stock = map[balance.productId] || { onHand: 0, reserved: 0 };
    stock.onHand += Number(balance.onHand || 0); stock.reserved += Number(balance.reserved || 0); map[balance.productId] = stock; return map; }, {}), [db.balances]);
  const rows = (db.products || []).map((product) => { const stock = stockMap[product.id] || { onHand: 0, reserved: 0 }; const barcodes = getProductBarcodes(product);
    return { ...product, barcodes, barcode: barcodes[0] || "", barcodeSearch: barcodes.join(" "), category: getName(db.categories, product.categoryId),
      unit: getName(db.units, product.unitId), supplierName: product.supplier?.name || getName(db.suppliers, product.supplierId), availableStock: stock.onHand - stock.reserved,
      onHand: stock.onHand, reserved: stock.reserved, packageSummary: (product.packages || []).map((item) => `${item.name} × ${Number(item.conversionToBase)}`).join(", "),
      variantSummary: (product.variants || []).map((item) => item.name).join(", "), expirySummary: (product.batches || []).map((item) => item.expiresAt).filter(Boolean).sort()[0] || "" }; });

  const preferredWarehouse = () => db.settings.company?.defaultWarehouseId || activeWarehouses[0]?.id || "";
  const openCreate = () => { setEditing(null); setForm({ ...blankForm, features: { ...featureDefaults }, ...createProductIdentity(db.products), images: [], packages: [], axes: [], variants: [], warehouseId: preferredWarehouse() }); setOpen(true); };
  useEffect(() => { if (searchParams.get("create") === "1") { openCreate(); const next = new URLSearchParams(searchParams); next.delete("create"); setSearchParams(next, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const openEdit = (product) => {
    const warehouseId = preferredWarehouse(); const balance = db.balances.find((item) => item.productId === product.id && item.warehouseId === warehouseId);
    const axesMap = new Map(); (product.variants || []).forEach((variant) => Object.entries(variant.attributes || {}).forEach(([name, value]) => {
      const values = axesMap.get(name) || new Set(); values.add(String(value)); axesMap.set(name, values);
    }));
    setEditing(product); setForm({ ...blankForm, name: product.name || "", images: (product.images || []).map((item) => item.url).length ? product.images.map((item) => item.url) : product.image ? [product.image] : [],
      sku: product.sku || "", barcodes: getProductBarcodes(product).length ? getProductBarcodes(product) : [""], categoryId: product.categoryId || "", unitId: product.unitId || "",
      costPrice: String(product.costPrice ?? ""), price: String(product.price ?? ""), wholesalePrice: String(product.wholesalePrice ?? ""), minStock: String(product.minStock ?? ""), warehouseId,
      newStock: String(balance?.onHand ?? 0), description: product.description || "", note: product.note || "", manufacturer: product.manufacturer || "", model: product.model || "",
      supplierId: product.supplierId || "", warehouseLocation: product.warehouseLocation || "", features: { packaging: Boolean(product.packages?.length), variants: Boolean(product.variants?.length),
        expiry: Boolean(product.trackExpiry), lot: Boolean(product.trackLot), serial: Boolean(product.trackSerial), marked: Boolean(product.isMarked), supplier: Boolean(product.supplierId), location: Boolean(product.warehouseLocation) },
      packages: (product.packages || []).map((item) => ({ ...item, variantSku: product.variants?.find((variant) => variant.id === item.variantId)?.sku || "", conversion: String(item.conversionToBase), barcode: item.barcodes?.[0]?.barcode || "", price: String(item.price ?? ""), costPrice: String(item.costPrice ?? "") })),
      axes: [...axesMap].map(([name, values]) => ({ name, values: [...values].join(", ") })), variants: (product.variants || []).map((item) => ({ ...item,
        barcode: item.barcodes?.[0]?.barcode || "", price: String(item.price ?? ""), costPrice: String(item.costPrice ?? "") })) }); setOpen(true);
  };

  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const toggleFeature = (key) => setForm((current) => ({ ...current, features: { ...current.features, [key]: !current.features[key] } }));
  const updateList = (key, index, patch) => setForm((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const removeList = (key, index) => setForm((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));
  const generateVariants = () => { const axes = form.axes.filter((axis) => axis.name.trim() && axis.values.trim()); if (!axes.length) return notify("Kamida bitta xususiyat va qiymat kiriting", "warning");
    const combinations = cartesian(axes); const temp = [...db.products]; const variants = combinations.map((attributes) => { const sku = generateUniqueSku(temp); temp.push({ sku });
      const existing = form.variants.find((item) => JSON.stringify(item.attributes) === JSON.stringify(attributes)); return existing || { name: Object.values(attributes).join(" / "), attributes, sku, barcode: "", price: "", costPrice: "" }; });
    patchForm({ variants }); };

  const validateIdentity = () => {
    const sku = form.sku.trim(); const own = form.barcodes.map((value) => String(value || "").trim()).filter(Boolean);
    const all = [...own, ...form.packages.map((item) => item.barcode?.trim()).filter(Boolean), ...form.variants.map((item) => item.barcode?.trim()).filter(Boolean)];
    const variantSkus = form.features.variants ? form.variants.map((item) => String(item.sku || "").trim()) : [];
    const allSkus = [sku, ...variantSkus];
    if (!/^\d{5}$/.test(sku)) return "SKU 5 ta raqamdan iborat bo‘lishi kerak";
    if (variantSkus.some((value) => !/^\d{5}$/.test(value))) return "Har bir variant SKU si 5 ta raqamdan iborat bo‘lishi kerak";
    if (new Set(allSkus).size !== allSkus.length) return "Mahsulot va variant SKU qiymatlari takrorlanmasin";
    if (new Set(all).size !== all.length) return "Barcode qiymatlari takrorlanmasin";
    const existingSkus = collectProductSkus(db.products, editing?.id || ""); const duplicateSku = allSkus.find((value) => existingSkus.has(value));
    if (duplicateSku) return `${duplicateSku} SKU boshqa mahsulot yoki variantda mavjud`;
    const existing = collectProductBarcodes(db.products, editing?.id || ""); const duplicate = all.find((barcode) => existing.has(barcode));
    if (duplicate) return `${duplicate} shtrix-kodi boshqa mahsulotda mavjud`; return "";
  };

  const advancedTracking = Boolean(form.features.serial || form.features.lot || form.features.expiry);
  const detailedInventory = Boolean(advancedTracking || form.features.variants);

  const payload = () => ({ name: form.name.trim(), sku: form.sku, categoryId: form.categoryId || null, unitId: form.unitId,
    supplierId: form.features.supplier && form.supplierId ? form.supplierId : null, description: form.description.trim() || undefined, note: form.note.trim() || undefined,
    manufacturer: form.manufacturer.trim() || undefined, model: form.model.trim() || undefined, warehouseLocation: form.features.location ? form.warehouseLocation.trim() || undefined : undefined,
    imageUrl: form.images[0] || undefined, images: form.images.map((url, index) => ({ url, isPrimary: index === 0 })), costPrice: cleanNumber(form.costPrice), minStock: cleanNumber(form.minStock),
    trackExpiry: form.features.expiry, trackLot: form.features.lot, trackSerial: form.features.serial, isMarked: form.features.marked,
    barcodes: form.barcodes.map((barcode, index) => ({ barcode: barcode.trim(), isPrimary: index === 0 })).filter((item) => item.barcode),
    prices: db.priceLists.slice(0, 2).map((list, index) => ({ priceListId: list.id, price: cleanNumber(index ? form.wholesalePrice : form.price) })),
    packages: form.features.packaging ? form.packages.filter((item) => item.name.trim()).map((item) => ({ id: item.id, name: item.name.trim(), variantSku: form.features.variants && item.variantSku ? item.variantSku : null, conversionQuantity: cleanNumber(item.conversion),
      conversionToBase: cleanNumber(item.conversion), barcode: item.barcode?.trim() || undefined, price: item.price === "" ? null : cleanNumber(item.price), costPrice: item.costPrice === "" ? null : cleanNumber(item.costPrice) })) : [],
    variants: form.features.variants ? form.variants.map((item) => ({ id: item.id, name: item.name, sku: item.sku, attributes: item.attributes,
      barcodes: item.barcode ? [item.barcode.trim()] : [], price: item.price === "" ? null : cleanNumber(item.price), costPrice: item.costPrice === "" ? null : cleanNumber(item.costPrice) })) : [],
  });

  const submit = async (event) => { event.preventDefault(); if (busy) return; if (!form.name.trim() || !form.categoryId || !form.unitId) return notify("Majburiy maydonlarni to‘ldiring", "warning");
    const identityError = validateIdentity(); if (identityError) return notify(identityError, "warning"); if (form.features.packaging && form.packages.some((item) => cleanNumber(item.conversion) <= 0)) return notify("Qadoq konversiyasi 0 dan katta bo‘lsin", "warning");
    if (!editing && detailedInventory && cleanNumber(form.initialStock) > 0) return notify("Variant/serial/lot/expiry mahsulot qoldig‘ini Ombor → Kirim yoki Qoldiq tuzatish orqali aniq variant/tracking bilan kiriting", "warning");
    setBusy(true); try { const body = payload(); if (editing) { await apiRequest({ url: `/catalog/products/${editing.id}`, method: "PATCH", body });
        if (!detailedInventory && form.warehouseId && form.newStock !== "") { const current = db.balances.find((item) => item.productId === editing.id && item.warehouseId === form.warehouseId)?.onHand || 0;
          const adjusted = await adjustProductStock({ productId: editing.id, warehouseId: form.warehouseId, newOnHand: form.newStock, currentOnHand: current }); if (!adjusted.ok) throw adjusted.error || new Error(adjusted.message); }
      } else { body.openingStock = !detailedInventory && form.warehouseId && cleanNumber(form.initialStock) > 0 ? [{ warehouseId: form.warehouseId, onHand: cleanNumber(form.initialStock) }] : [];
        await apiRequest({ url: "/catalog/products", body }); }
      notify(editing ? "Mahsulot yangilandi" : "Mahsulot yaratildi"); setOpen(false); setEditing(null); setForm(blankForm);
    } catch (error) { notify(error.message || "Mahsulotni saqlab bo‘lmadi", "danger"); } finally { setBusy(false); } };

  const changeWarehouse = (warehouseId) => { const balance = editing ? db.balances.find((item) => item.productId === editing.id && item.warehouseId === warehouseId) : null;
    patchForm({ warehouseId, ...(editing ? { newStock: String(balance?.onHand ?? 0) } : {}) }); };
  const detailTabs = (row) => [{ id: "general", label: "Umumiy", show: true }, { id: "stock", label: "Ombor", show: true }, { id: "prices", label: "Narxlar", show: true },
    { id: "barcodes", label: "Barcode", show: row.barcodes.length }, { id: "variants", label: "Variantlar", show: row.variants?.length }, { id: "packages", label: "Qadoqlash", show: row.packages?.length },
    { id: "movements", label: "Harakatlar", show: true }].filter((item) => item.show);

  const columns = [
    { key: "name", label: "Mahsulot", render: (row) => <div className="qp-product-name-cell">{row.image ? <img src={row.image} alt="" /> : <span>{row.name.slice(0, 1).toUpperCase()}</span>}<div><strong>{row.name}</strong><div className="qp-muted">SKU {row.sku}</div></div></div> },
    { key: "barcode", label: "SKU / asosiy barcode", render: (row) => <span>{row.sku}{row.barcode ? ` · ${row.barcode}` : ""}</span> }, { key: "category", label: "Kategoriya" }, { key: "unit", label: "Birlik" },
    { key: "costPrice", label: "Tannarx", render: (row) => formatMoney(row.costPrice) }, { key: "price", label: "Sotuv narxi", render: (row) => <strong>{formatMoney(row.price)}</strong> },
    { key: "availableStock", label: "Qoldiq", render: (row) => <strong>{row.availableStock} {row.unit}</strong> }, { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    { key: "packageSummary", label: "Package" }, { key: "packageQty", label: "Package qty", render: (row) => row.packages?.length || 0 }, { key: "supplierName", label: "Supplier" },
    { key: "variantSummary", label: "Variantlar" }, { key: "warehouseLocation", label: "Ombor joyi" }, { key: "expirySummary", label: "Expiry" },
    { key: "trackLot", label: "Lot tracking", render: (row) => row.trackLot ? "Ha" : "Yo‘q" }, { key: "trackSerial", label: "Serial tracking", render: (row) => row.trackSerial ? "Ha" : "Yo‘q" },
    { key: "isMarked", label: "Markirovka", render: (row) => row.isMarked ? "Ha" : "Yo‘q" }, { key: "updatedAt", label: "Yangilangan", render: (row) => row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("uz-UZ") : "—" },
    ...(can(PERMISSIONS.PRODUCTS_MANAGE) ? [{ key: "actions", label: "Amal", sortable: false, render: (row) => <RowActions items={[{ label: "Tahrirlash", icon: Edit3, onClick: () => openEdit(row) },
      { label: "Shtrix / QR", icon: Barcode, onClick: () => setCodeProduct(row) }]} /> }] : []),
  ];

  return <>
    <SmartTablePage title="Mahsulotlar" eyebrow="Ombor" description="Savdo, kassa va ombor uchun yagona universal mahsulot katalogi." rows={rows}
      searchFields={["name", "sku", "barcodeSearch", "category", "variantSummary"]} columns={columns}
      defaultVisibleColumnKeys={["name", "barcode", "category", "unit", "costPrice", "price", "availableStock", "status", ...(can(PERMISSIONS.PRODUCTS_MANAGE) ? ["actions"] : [])]}
      extraSummary={[{ label: "Faol mahsulot", value: rows.filter((row) => row.status === "ACTIVE").length, hint: "Sotuv uchun faol" },
        { label: "Kam qoldiq", value: rows.filter((row) => row.availableStock <= Number(row.minStock || 0)).length, hint: "Minimal darajada" },
        { label: "Variantli", value: rows.filter((row) => row.variants?.length).length, hint: "Variant kombinatsiyalari" }, { label: "Qadoqli", value: rows.filter((row) => row.packages?.length).length, hint: "Base-unit konversiyasi" }]}
      actions={can(PERMISSIONS.PRODUCTS_MANAGE) ? <PrimaryButton onClick={openCreate}><Plus size={15}/> Yangi mahsulot</PrimaryButton> : null}
      bulkActions={(selected) => <SecondaryButton onClick={() => printProductLabels(selected)}><Printer size={15}/> Label chop etish</SecondaryButton>}
      detailTitle={(row) => row.name} detailDescription={(row) => `SKU ${row.sku} · ${row.category}`}
      detailRenderer={(row) => <div className="qp-product-detail"><div className="qp-product-detail-tabs">{detailTabs(row).map((tab) => <button key={tab.id} type="button" className={detailTab === tab.id ? "active" : ""} onClick={() => setDetailTab(tab.id)}>{tab.label}</button>)}</div>
        {detailTab === "general" ? <div className="qp-drawer-details">{row.image ? <img className="qp-product-detail-image" src={row.image} alt={row.name}/> : null}
          <div className="qp-drawer-detail-row"><span>Kategoriya / birlik</span><strong>{row.category} · {row.unit}</strong></div><div className="qp-drawer-detail-row"><span>Ishlab chiqaruvchi / model</span><strong>{[row.manufacturer, row.model].filter(Boolean).join(" · ") || "—"}</strong></div>
          <div className="qp-drawer-detail-row"><span>Tavsif</span><strong>{row.description || "—"}</strong></div></div> : null}
        {detailTab === "stock" ? <div className="qp-detail-kpis"><div><span>Haqiqiy qoldiq</span><strong>{row.onHand} {row.unit}</strong></div><div><span>Band</span><strong>{row.reserved}</strong></div><div><span>Sotish mumkin</span><strong>{row.availableStock}</strong></div><div><span>Joylashuv</span><strong>{row.warehouseLocation || "—"}</strong></div></div> : null}
        {detailTab === "prices" ? <div className="qp-detail-kpis"><div><span>Tannarx</span><strong>{formatMoney(row.costPrice)}</strong></div><div><span>Retail</span><strong>{formatMoney(row.price)}</strong></div><div><span>Wholesale</span><strong>{formatMoney(row.wholesalePrice)}</strong></div></div> : null}
        {detailTab === "barcodes" ? <div className="qp-detail-list">{row.barcodes.map((value, index) => <div key={value}><Barcode size={15}/><strong>{value}</strong><span>{index === 0 ? "PRIMARY" : "PRODUCT"}</span></div>)}</div> : null}
        {detailTab === "variants" ? <div className="qp-detail-list">{row.variants.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{attributesLabel(item.attributes)} · SKU {item.sku}</span></div>)}</div> : null}
        {detailTab === "packages" ? <div className="qp-detail-list">{row.packages.map((item) => <div key={item.id}><Boxes size={15}/><strong>{item.name}</strong><span>1 = {Number(item.conversionToBase)} {row.unit} · {formatMoney(item.price)}</span></div>)}</div> : null}
        {detailTab === "movements" ? <div className="qp-detail-list">{(db.movements || []).filter((item) => item.productId === row.id).slice(0, 20).map((item) => <div key={item.id}><strong>{item.type}</strong><span>{Number(item.quantity)} · {item.createdAt ? new Date(item.createdAt).toLocaleString("uz-UZ") : "—"}</span></div>)}</div> : null}
        <div className="qp-form-actions"><SecondaryButton onClick={() => setCodeProduct(row)}><Barcode size={15}/> Shtrix / QR</SecondaryButton>{can(PERMISSIONS.PRODUCTS_MANAGE) ? <PrimaryButton onClick={() => openEdit(row)}><Edit3 size={15}/> Tahrirlash</PrimaryButton> : null}</div></div>} />

    <Modal open={open} title={editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"} description="Oddiy maydonlar doim ko‘rinadi, professional imkoniyatlar kerak bo‘lganda ochiladi." onClose={() => { if (!busy) setOpen(false); }} wide>
      <form className="qp-smart-product-form" onSubmit={submit} aria-busy={busy}>
        <section className="qp-product-form-section"><header><span>01</span><div><strong>Asosiy</strong><small>Mahsulot identifikatsiyasi</small></div></header><div className="qp-form-grid">
          <div className="qp-form-span-full"><ImageUploader multiple value={form.images} name={form.name} label="Mahsulot rasmlarini yuklash" onChange={(images) => patchForm({ images })}/></div>
          <Field label="Mahsulot nomi"><input className="qp-input" value={form.name} onChange={(event) => patchForm({ name: event.target.value })} required/></Field>
          <Field label="Kategoriya"><Select value={form.categoryId} onChange={(event) => patchForm({ categoryId: event.target.value })} required><option value="">Tanlang</option>{db.categories.filter((item) => item.status !== "INACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="O‘lchov birligi"><Select value={form.unitId} onChange={(event) => patchForm({ unitId: event.target.value })} required><option value="">Tanlang</option>{db.units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="SKU" hint="5 raqam · backend unique"><div className="qp-code-edit-row"><input className="qp-input" inputMode="numeric" maxLength={5} value={form.sku} onChange={(event) => patchForm({ sku: event.target.value.replace(/\D/g, "").slice(0, 5) })}/><button type="button" className="qp-icon-button" onClick={() => patchForm({ sku: generateUniqueSku(db.products, editing?.id) })}><RefreshCw size={15}/></button></div></Field>
          <div className="qp-form-span-full qp-barcode-editor"><div className="qp-barcode-editor-head"><div><strong>Shtrix-kodlar</strong><span>Birinchi kod PRIMARY; scanner exact match bilan ishlaydi.</span></div><SecondaryButton type="button" onClick={() => patchForm({ barcodes: [...form.barcodes, ""] })}><Plus size={14}/> Qo‘shish</SecondaryButton></div>
            {form.barcodes.map((barcode, index) => <div className="qp-barcode-row" key={`${index}-${barcode}`}><span>{index === 0 ? "PRIMARY" : `#${index + 1}`}</span><input className="qp-input" value={barcode} onChange={(event) => patchForm({ barcodes: form.barcodes.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })}/><button type="button" className="qp-icon-button" disabled={form.barcodes.length === 1} onClick={() => patchForm({ barcodes: form.barcodes.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15}/></button></div>)}</div>
        </div></section>
        <section className="qp-product-form-section"><header><span>02</span><div><strong>Narx va ombor</strong><small>Canonical qoldiq base unitda</small></div></header><div className="qp-form-grid">
          <Field label="Tannarx"><input className="qp-input" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => patchForm({ costPrice: event.target.value })}/></Field><Field label="Sotuv narxi"><input className="qp-input" type="number" min="0" step="0.01" value={form.price} onChange={(event) => patchForm({ price: event.target.value })}/></Field>
          <Field label="Ulgurji narx"><input className="qp-input" type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(event) => patchForm({ wholesalePrice: event.target.value })}/></Field><Field label="Minimal qoldiq"><input className="qp-input" type="number" min="0" step="0.001" value={form.minStock} onChange={(event) => patchForm({ minStock: event.target.value })}/></Field>
          <Field label={editing ? "Qoldiq ombori" : "Boshlang‘ich ombor"}><Select value={form.warehouseId} onChange={(event) => changeWarehouse(event.target.value)}><option value="">Tanlang</option>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label={editing ? "Yangi haqiqiy qoldiq" : "Boshlang‘ich qoldiq"} hint={detailedInventory ? "Variant/tracking qoldig‘i Ombor → Kirim / Qoldiq tuzatish orqali aniq variant bilan yuritiladi" : undefined}><input className="qp-input" type="number" min="0" step="0.001" disabled={detailedInventory} value={editing ? form.newStock : form.initialStock} onChange={(event) => patchForm(editing ? { newStock: event.target.value } : { initialStock: event.target.value })}/></Field>
        </div></section>
        <section className="qp-product-form-section"><header><span>03</span><div><strong>Mahsulot xususiyatlari</strong><small>Faqat kerakli modullarni yoqing</small></div></header><div className="qp-product-feature-grid">
          {[['packaging','Qadoqlash mavjud'],['variants','Variantlar mavjud'],['expiry','Yaroqlilik muddati'],['lot','Lot / partiya'],['serial','Serial / IMEI'],['marked','Markirovkali'],['supplier','Supplier ma’lumoti'],['location','Ombor joylashuvi']].map(([key,label]) => <FeatureToggle key={key} active={form.features[key]} label={label} onClick={() => toggleFeature(key)}/>)}</div>
          {form.features.packaging ? <div className="qp-advanced-editor"><div className="qp-editor-head"><div><strong>Qadoqlash</strong><span>1 qadoq nechta base unitga tengligini kiriting.</span></div><SecondaryButton type="button" onClick={() => patchForm({ packages: [...form.packages, { name: "", variantSku: "", conversion: "", barcode: "", price: "", costPrice: "" }] })}><Plus size={14}/> Qadoq</SecondaryButton></div>
            {form.packages.map((item, index) => <div className="qp-package-row" key={item.id || index}><input className="qp-input" placeholder="Quti / pachka" value={item.name} onChange={(event) => updateList('packages',index,{name:event.target.value})}/>{form.features.variants ? <Select value={item.variantSku || ""} onChange={(event) => updateList('packages',index,{variantSku:event.target.value})}><option value="">Barcha variant</option>{form.variants.filter((variant) => variant.status !== "INACTIVE").map((variant) => <option key={variant.id || variant.sku} value={variant.sku}>{variant.name}</option>)}</Select> : null}<input className="qp-input" type="number" min="0.001" step="0.001" placeholder="Konversiya" value={item.conversion} onChange={(event) => updateList('packages',index,{conversion:event.target.value})}/><input className="qp-input" placeholder="Barcode" value={item.barcode} onChange={(event) => updateList('packages',index,{barcode:event.target.value})}/><input className="qp-input" type="number" min="0" placeholder="Sotuv narxi" value={item.price} onChange={(event) => updateList('packages',index,{price:event.target.value})}/><button type="button" className="qp-icon-button" onClick={() => removeList('packages',index)}><Trash2 size={15}/></button></div>)}</div> : null}
          {form.features.variants ? <div className="qp-advanced-editor"><div className="qp-editor-head"><div><strong>Dynamic variantlar</strong><span>Rang, Xotira, Ta’m kabi istalgan attribute yarating.</span></div><SecondaryButton type="button" onClick={() => patchForm({ axes:[...form.axes,{name:'',values:''}] })}><Plus size={14}/> Xususiyat</SecondaryButton></div>
            {form.axes.map((axis,index) => <div className="qp-axis-row" key={index}><input className="qp-input" placeholder="Masalan: Rang" value={axis.name} onChange={(event) => updateList('axes',index,{name:event.target.value})}/><input className="qp-input" placeholder="Qora, Oq, Ko‘k" value={axis.values} onChange={(event) => updateList('axes',index,{values:event.target.value})}/><button type="button" className="qp-icon-button" onClick={() => removeList('axes',index)}><Trash2 size={15}/></button></div>)}
            <SecondaryButton type="button" onClick={generateVariants}><Boxes size={15}/> Kombinatsiyalarni yaratish</SecondaryButton>{form.variants.length ? <div className="qp-variant-table"><div className="qp-variant-row head"><span>Variant</span><span>SKU</span><span>Barcode</span><span>Narx override</span></div>{form.variants.map((item,index) => <div className="qp-variant-row" key={item.id || `${item.name}-${index}`}><strong>{item.name}</strong><input className="qp-input" value={item.sku} onChange={(event)=>updateList('variants',index,{sku:event.target.value.replace(/\D/g,'').slice(0,5)})}/><input className="qp-input" value={item.barcode} onChange={(event)=>updateList('variants',index,{barcode:event.target.value})}/><input className="qp-input" type="number" min="0" value={item.price} onChange={(event)=>updateList('variants',index,{price:event.target.value})}/></div>)}</div> : null}</div> : null}
          {(form.features.supplier || form.features.location || form.manufacturer || form.model) ? <div className="qp-form-grid qp-extra-grid">{form.features.supplier ? <Field label="Asosiy supplier"><Select value={form.supplierId} onChange={(event)=>patchForm({supplierId:event.target.value})}><option value="">Tanlang</option>{db.suppliers.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field> : null}{form.features.location ? <Field label="Ombordagi joy/bin"><input className="qp-input" value={form.warehouseLocation} onChange={(event)=>patchForm({warehouseLocation:event.target.value})}/></Field> : null}<Field label="Ishlab chiqaruvchi"><input className="qp-input" value={form.manufacturer} onChange={(event)=>patchForm({manufacturer:event.target.value})}/></Field><Field label="Model"><input className="qp-input" value={form.model} onChange={(event)=>patchForm({model:event.target.value})}/></Field></div> : null}
        </section>
        <section className="qp-product-form-section"><header><span>04</span><div><strong>Qo‘shimcha</strong><small>Ixtiyoriy tavsif va ichki izoh</small></div></header><div className="qp-form-grid"><Field label="Tavsif"><textarea className="qp-input" rows="3" value={form.description} onChange={(event)=>patchForm({description:event.target.value})}/></Field><Field label="Ichki izoh"><textarea className="qp-input" rows="3" value={form.note} onChange={(event)=>patchForm({note:event.target.value})}/></Field></div></section>
        <div className="qp-form-actions qp-sticky-actions"><SecondaryButton type="button" disabled={busy} onClick={()=>setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={busy}>{busy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : editing ? "Yangilash" : "Mahsulotni saqlash"}</PrimaryButton></div>
      </form>
    </Modal>
    <BarcodeQrModal open={Boolean(codeProduct)} product={codeProduct} onClose={()=>setCodeProduct(null)}/>
  </>;
}

export default ProductsPage;

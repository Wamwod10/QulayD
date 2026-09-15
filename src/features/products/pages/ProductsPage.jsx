import { Barcode, Boxes, CheckCircle2, DollarSign, Edit3, FileText, Layers3, LoaderCircle, MapPin, Package, Plus, Printer, RefreshCw, Tags, Trash2, Truck, Warehouse } from "lucide-react";
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
  warehouseLocation: "", status: "ACTIVE", features: featureDefaults, packages: [], axes: [], variants: [] };

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
  const [categoryModalOpen, setCategoryModalOpen] = useState(false); const [categoryName, setCategoryName] = useState(""); const [categoryBusy, setCategoryBusy] = useState(false);
  const activeWarehouses = (db.warehouses || []).filter((item) => item.status === "ACTIVE");
  const activePriceLists = useMemo(() => (db.priceLists || []).filter((item) => item.status !== "INACTIVE").sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))), [db.priceLists]);
  const stockMap = useMemo(() => (db.balances || []).reduce((map, balance) => { const stock = map[balance.productId] || { onHand: 0, reserved: 0 };
    stock.onHand += Number(balance.onHand || 0); stock.reserved += Number(balance.reserved || 0); map[balance.productId] = stock; return map; }, {}), [db.balances]);
  const rows = (db.products || []).map((product) => { const stock = stockMap[product.id] || { onHand: 0, reserved: 0 }; const barcodes = getProductBarcodes(product);
    return { ...product, barcodes, barcode: barcodes[0] || "", barcodeSearch: barcodes.join(" "), category: getName(db.categories, product.categoryId),
      unit: getName(db.units, product.unitId), supplierName: product.supplier?.name || getName(db.suppliers, product.supplierId), availableStock: stock.onHand - stock.reserved,
      onHand: stock.onHand, reserved: stock.reserved, packageSummary: (product.packages || []).map((item) => `${item.name} × ${Number(item.conversionToBase)}`).join(", "),
      variantSummary: (product.variants || []).map((item) => item.name).join(", "), expirySummary: (product.batches || []).map((item) => item.expiresAt).filter(Boolean).sort()[0] || "" }; });

  const preferredWarehouse = () => activeWarehouses.find((warehouse) => warehouse.id === db.settings.company?.defaultWarehouseId)?.id || activeWarehouses[0]?.id || "";
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
      supplierId: product.supplierId || "", warehouseLocation: product.warehouseLocation || "", status: product.status || "ACTIVE", features: { packaging: Boolean(product.packages?.length), variants: Boolean(product.variants?.length),
        expiry: Boolean(product.trackExpiry), lot: Boolean(product.trackLot), serial: Boolean(product.trackSerial), marked: Boolean(product.isMarked), supplier: Boolean(product.supplierId), location: Boolean(product.warehouseLocation) },
      packages: (product.packages || []).map((item) => ({ ...item, variantSku: product.variants?.find((variant) => variant.id === item.variantId)?.sku || "", conversion: String(item.conversionToBase), barcode: item.barcodes?.[0]?.barcode || "", price: String(item.price ?? ""), costPrice: String(item.costPrice ?? "") })),
      axes: [...axesMap].map(([name, values]) => ({ name, values: [...values].join(", ") })), variants: (product.variants || []).map((item) => ({ ...item,
        barcode: item.barcodes?.[0]?.barcode || "", price: String(item.price ?? ""), costPrice: String(item.costPrice ?? "") })) }); setOpen(true);
  };

  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const toggleFeature = (key) => setForm((current) => {
    if (key === "lot" && current.features.expiry && current.features.lot) {
      notify("Yaroqlilik muddati yoqilganida lot/partiyani o‘chirib bo‘lmaydi", "warning");
      return current;
    }
    const nextValue = !current.features[key];
    const nextFeatures = { ...current.features, [key]: nextValue };
    if (key === "expiry" && nextValue) nextFeatures.lot = true;
    return { ...current, features: nextFeatures };
  });
  const applyPreset = (preset) => setForm((current) => {
    const next = { ...featureDefaults };
    if (preset === "PACK") next.packaging = true;
    if (preset === "VARIANT") next.variants = true;
    if (preset === "SERIAL") next.serial = true;
    if (preset === "LOT") { next.lot = true; next.expiry = true; }
    return { ...current, features: next };
  });
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
    trackExpiry: form.features.expiry, trackLot: form.features.lot, trackSerial: form.features.serial, isMarked: form.features.marked, status: form.status || "ACTIVE",
    barcodes: form.barcodes.map((barcode, index) => ({ barcode: barcode.trim(), isPrimary: index === 0 })).filter((item) => item.barcode),
    prices: activePriceLists.slice(0, 2).map((list, index) => ({ priceListId: list.id, price: cleanNumber(index ? form.wholesalePrice : form.price) })),
    packages: form.features.packaging ? form.packages.filter((item) => item.name.trim()).map((item) => ({ id: item.id, name: item.name.trim(), variantSku: form.features.variants && item.variantSku ? item.variantSku : null, conversionQuantity: cleanNumber(item.conversion),
      conversionToBase: cleanNumber(item.conversion), barcode: item.barcode?.trim() || undefined, price: item.price === "" ? null : cleanNumber(item.price), costPrice: item.costPrice === "" ? null : cleanNumber(item.costPrice) })) : [],
    variants: form.features.variants ? form.variants.map((item) => ({ id: item.id, name: item.name, sku: item.sku, attributes: item.attributes,
      barcodes: item.barcode ? [item.barcode.trim()] : [], price: item.price === "" ? null : cleanNumber(item.price), costPrice: item.costPrice === "" ? null : cleanNumber(item.costPrice) })) : [],
  });

  const submit = async (event) => { event.preventDefault(); if (busy) return; if (!form.name.trim() || !form.categoryId || !form.unitId) return notify("Majburiy maydonlarni to‘ldiring", "warning");
    if (!activePriceLists.length) return notify("Mahsulot narxini saqlash uchun avval kamida bitta faol Narx ro‘yxati yarating", "warning");
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
  const createCategoryInline = async (event) => {
    event.preventDefault(); const name = categoryName.trim(); if (!name || categoryBusy) return;
    const duplicate = (db.categories || []).find((item) => item.status !== "INACTIVE" && String(item.name || "").trim().toLocaleLowerCase("uz-UZ") === name.toLocaleLowerCase("uz-UZ"));
    if (duplicate) { patchForm({ categoryId: duplicate.id }); setCategoryModalOpen(false); setCategoryName(""); notify("Mavjud kategoriya tanlandi"); return; }
    setCategoryBusy(true);
    try { const category = await apiRequest({ url: "/catalog/categories", body: { name, status: "ACTIVE" } }); patchForm({ categoryId: category.id }); setCategoryModalOpen(false); setCategoryName(""); notify("Kategoriya yaratildi"); }
    catch (error) { notify(error.message || "Kategoriyani yaratib bo‘lmadi", "danger"); }
    finally { setCategoryBusy(false); }
  };
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
      actions={can(PERMISSIONS.PRODUCTS_CREATE) ? <PrimaryButton onClick={openCreate}><Plus size={15}/> Yangi mahsulot</PrimaryButton> : null}
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

    <Modal
      open={open}
      title={editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
      description="QULAY universal katalogi — oddiy mahsulotdan IMEI, lot va variantli mahsulotgacha."
      onClose={() => { if (!busy) setOpen(false); }}
      wide
      className="qp-product-create-modal"
    >
      <form className="qp-smart-product-form qp-product-builder" onSubmit={submit} aria-busy={busy}>
        <div className="qp-product-preset-bar">
          <div>
            <span className="qp-product-kicker">TEZ SOZLASH</span>
            <strong>Mahsulot qanday sotiladi?</strong>
            <small>Eng yaqin rejimni tanlang, keyin kerakli maydonlarni aniqlashtiring.</small>
          </div>
          <div className="qp-product-presets">
            <button type="button" onClick={() => applyPreset("SIMPLE")}><Package size={16}/><span><b>Oddiy</b><small>Dona / kg / litr</small></span></button>
            <button type="button" onClick={() => applyPreset("PACK")} className={form.features.packaging && !form.features.variants ? "active" : ""}><Boxes size={16}/><span><b>Qadoqli</b><small>Quti, pachka, blok</small></span></button>
            <button type="button" onClick={() => applyPreset("VARIANT")} className={form.features.variants ? "active" : ""}><Layers3 size={16}/><span><b>Variantli</b><small>Rang, razmer, xotira</small></span></button>
            <button type="button" onClick={() => applyPreset("SERIAL")} className={form.features.serial ? "active" : ""}><Barcode size={16}/><span><b>Serial / IMEI</b><small>Telefon, elektronika</small></span></button>
            <button type="button" onClick={() => applyPreset("LOT")} className={form.features.expiry ? "active" : ""}><CheckCircle2 size={16}/><span><b>Lot / Expiry</b><small>Dori, oziq-ovqat</small></span></button>
          </div>
        </div>

        <div className="qp-product-builder-layout">
          <aside className="qp-product-media-panel">
            <div className="qp-product-panel-title"><span className="qp-section-icon"><Package size={17}/></span><div><strong>Mahsulot rasmlari</strong><span>Maksimal 10 ta. Birinchi rasm asosiy.</span></div></div>
            <ImageUploader multiple value={form.images} name={form.name} label="Rasm qo‘shish" onChange={(images) => patchForm({ images })}/>
            <div className="qp-product-status-card">
              <div><strong>Sotuv holati</strong><span>{form.status === "ACTIVE" ? "POS va buyurtmalarda ko‘rinadi" : "Sotuv kanallarida yashiriladi"}</span></div>
              <button type="button" className={`qp-switch ${form.status === "ACTIVE" ? "on" : ""}`} onClick={() => patchForm({ status: form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}><i/></button>
            </div>
            <div className="qp-product-help-card">
              <strong>Qoldiq qanday ishlaydi?</strong>
              <span>{detailedInventory ? "Bu mahsulot tracking talab qiladi. Dastlabki qoldiqni mahsulot formasida emas, Ombor → Kirim orqali variant/lot/serial bilan kiriting." : "Oddiy mahsulot uchun boshlang‘ich qoldiqni shu formaning o‘zida kiritishingiz mumkin."}</span>
            </div>
          </aside>

          <main className="qp-product-builder-main">
            <section className="qp-product-form-card qp-product-core-card">
              <header><span className="qp-section-icon"><Tags size={17}/></span><div><strong>Asosiy ma’lumot</strong><small>Mahsulotni topish va tanish uchun kerakli maydonlar</small></div></header>
              <div className="qp-form-grid qp-product-core-grid">
                <Field label="Mahsulot nomi *"><input className="qp-input" value={form.name} onChange={(event) => patchForm({ name: event.target.value })} placeholder="Masalan: iPhone 15 128GB" required/></Field>
                <Field label="Kategoriya *"><div className="qp-field-with-action"><Select value={form.categoryId} onChange={(event) => patchForm({ categoryId: event.target.value })} required><option value="">Kategoriyani tanlang</option>{db.categories.filter((item) => item.status !== "INACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><button type="button" className="qp-mini-action" onClick={() => { setCategoryName(""); setCategoryModalOpen(true); }}><Plus size={14}/> Yangi</button></div></Field>
                <Field label="O‘lchov birligi *"><Select value={form.unitId} onChange={(event) => patchForm({ unitId: event.target.value })} required><option value="">Birlikni tanlang</option>{db.units.filter((item) => item.status !== "INACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
                <Field label="SKU *" hint="5 raqam · QULAY ichida unikal"><div className="qp-code-edit-row"><input className="qp-input" inputMode="numeric" maxLength={5} value={form.sku} onChange={(event) => patchForm({ sku: event.target.value.replace(/\D/g, "").slice(0, 5) })}/><button type="button" className="qp-icon-button" title="Yangi SKU yaratish" onClick={() => patchForm({ sku: generateUniqueSku(db.products, editing?.id) })}><RefreshCw size={15}/></button></div></Field>
              </div>

              <div className="qp-product-barcode-block">
                <div className="qp-editor-head"><div><strong><Barcode size={16}/> Shtrix-kodlar</strong><span>Bir mahsulotga bir nechta barcode biriktirish mumkin. Birinchisi asosiy.</span></div><SecondaryButton type="button" onClick={() => patchForm({ barcodes: [...form.barcodes, ""] })}><Plus size={14}/> Barcode</SecondaryButton></div>
                <div className="qp-product-barcode-list">
                  {form.barcodes.map((barcode, index) => <div className="qp-barcode-row qp-barcode-row-premium" key={`${index}-${barcode}`}><span>{index === 0 ? "ASOSIY" : `#${index + 1}`}</span><Barcode size={16}/><input className="qp-input" placeholder="Shtrix-kodni kiriting yoki skaner qiling" value={barcode} onChange={(event) => patchForm({ barcodes: form.barcodes.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })}/><button type="button" className="qp-icon-button" disabled={form.barcodes.length === 1} onClick={() => patchForm({ barcodes: form.barcodes.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15}/></button></div>)}
                </div>
              </div>
            </section>

            <section className="qp-product-form-card">
              <header><span className="qp-section-icon"><DollarSign size={17}/></span><div><strong>Narx va qoldiq</strong><small>Sotuv narxlari, minimal qoldiq va asosiy ombor</small></div></header>
              <div className="qp-form-grid qp-product-commerce-grid">
                <Field label="Tannarx"><input className="qp-input" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => patchForm({ costPrice: event.target.value })} placeholder="0"/></Field>
                <Field label={`${activePriceLists[0]?.name || "Sotuv narxi"} *`} hint={activePriceLists[0]?.code ? `Narx ro‘yxati: ${activePriceLists[0].code}` : "Asosiy sotuv narxi"}><input className="qp-input" type="number" min="0" step="0.01" value={form.price} onChange={(event) => patchForm({ price: event.target.value })} placeholder="0" required/></Field>
                {activePriceLists[1] ? <Field label={activePriceLists[1].name} hint={`Narx ro‘yxati: ${activePriceLists[1].code || "—"}`}><input className="qp-input" type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(event) => patchForm({ wholesalePrice: event.target.value })} placeholder="0"/></Field> : <div className="qp-product-price-list-note"><Tags size={16}/><span><strong>Qo‘shimcha narx turi yo‘q</strong><small>Ulgurji/VIP narx kerak bo‘lsa Sozlamalar → Narx ro‘yxatlarida yarating.</small></span></div>}
                <Field label="Minimal qoldiq"><input className="qp-input" type="number" min="0" step="0.001" value={form.minStock} onChange={(event) => patchForm({ minStock: event.target.value })} placeholder="0"/></Field>
                <Field label={editing ? "Qoldiq ombori" : "Boshlang‘ich ombor"}><Select value={form.warehouseId} onChange={(event) => changeWarehouse(event.target.value)}><option value="">Omborni tanlang</option>{activeWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
                <Field label={editing ? "Yangi haqiqiy qoldiq" : "Boshlang‘ich qoldiq"} hint={detailedInventory ? "Tracking yoqilgan — qoldiq Kirim orqali kiritiladi" : "Base birlikdagi qoldiq"}><input className="qp-input" type="number" min="0" step="0.001" disabled={detailedInventory} value={editing ? form.newStock : form.initialStock} onChange={(event) => patchForm(editing ? { newStock: event.target.value } : { initialStock: event.target.value })}/></Field>
              </div>
              {cleanNumber(form.price) > 0 ? <div className="qp-product-margin-strip"><span>Marja</span><strong>{Math.max(0, Math.round((cleanNumber(form.price) - cleanNumber(form.costPrice)) * 100) / 100).toLocaleString("uz-UZ")} so‘m</strong><small>{cleanNumber(form.costPrice) > 0 ? `${Math.round(((cleanNumber(form.price) - cleanNumber(form.costPrice)) / cleanNumber(form.costPrice)) * 100)}% ustama` : "Tannarx kiritilmagan"}</small></div> : null}
            </section>

            <section className="qp-product-form-card">
              <header><span className="qp-section-icon"><Layers3 size={17}/></span><div><strong>Universal imkoniyatlar</strong><small>Faqat biznesingizga kerak bo‘lgan imkoniyatlarni yoqing</small></div></header>
              <div className="qp-product-feature-grid qp-product-feature-grid-premium">
                {[['packaging','Qadoqlash','Quti, pachka, blok'],['variants','Variantlar','Rang, razmer, xotira'],['serial','Serial / IMEI','Har dona alohida kuzatiladi'],['lot','Lot / partiya','Partiya bo‘yicha qoldiq'],['expiry','Yaroqlilik','FEFO va expiry nazorati'],['marked','Markirovka','Markirovkali mahsulot'],['supplier','Supplier','Asosiy yetkazib beruvchi'],['location','Ombor joyi','Raf / bin / zona']].map(([key,label,caption]) => <FeatureToggle key={key} active={form.features[key]} label={<span><b>{label}</b><small>{caption}</small></span>} onClick={() => toggleFeature(key)}/>)}</div>

              {form.features.packaging ? <div className="qp-advanced-editor qp-packaging-editor"><div className="qp-editor-head"><div><strong><Boxes size={16}/> Qadoqlash birliklari</strong><span>Masalan: 1 pachka = 12 dona, 1 quti = 6 pachka. POS qadoq barcode’ini ham taniydi.</span></div><SecondaryButton type="button" onClick={() => patchForm({ packages: [...form.packages, { name: "", variantSku: "", conversion: "", barcode: "", price: "", costPrice: "" }] })}><Plus size={14}/> Qadoq</SecondaryButton></div>
                {!form.packages.length ? <button type="button" className="qp-product-empty-action" onClick={() => patchForm({ packages: [{ name: "Pachka", variantSku: "", conversion: "", barcode: "", price: "", costPrice: "" }] })}><Plus size={16}/> Birinchi qadoqni qo‘shish</button> : null}
                {form.packages.map((item, index) => <div className="qp-package-card" key={item.id || index}><div className="qp-package-card-head"><span><Package size={16}/><b>{item.name || `Qadoq ${index + 1}`}</b>{cleanNumber(item.conversion) > 0 ? <small>1 {item.name || "qadoq"} = {cleanNumber(item.conversion)} base birlik</small> : null}</span><button type="button" className="qp-icon-button" onClick={() => removeList('packages',index)}><Trash2 size={15}/></button></div><div className="qp-package-fields"><Field label="Nomi"><input className="qp-input" placeholder="Pachka / quti" value={item.name} onChange={(event) => updateList('packages',index,{name:event.target.value})}/></Field>{form.features.variants ? <Field label="Variant"><Select value={item.variantSku || ""} onChange={(event) => updateList('packages',index,{variantSku:event.target.value})}><option value="">Barcha variant</option>{form.variants.filter((variant) => variant.status !== "INACTIVE").map((variant) => <option key={variant.id || variant.sku} value={variant.sku}>{variant.name}</option>)}</Select></Field> : null}<Field label="Ichidagi soni"><input className="qp-input" type="number" min="0.001" step="0.001" placeholder="12" value={item.conversion} onChange={(event) => updateList('packages',index,{conversion:event.target.value})}/></Field><Field label="Qadoq tannarxi"><input className="qp-input" type="number" min="0" placeholder="0" value={item.costPrice} onChange={(event) => updateList('packages',index,{costPrice:event.target.value})}/></Field><Field label="Qadoq sotuv narxi"><input className="qp-input" type="number" min="0" placeholder="0" value={item.price} onChange={(event) => updateList('packages',index,{price:event.target.value})}/></Field><Field label="Qadoq barcode"><input className="qp-input" placeholder="Barcode" value={item.barcode} onChange={(event) => updateList('packages',index,{barcode:event.target.value})}/></Field></div></div>)}
              </div> : null}

              {form.features.variants ? <div className="qp-advanced-editor qp-variant-editor"><div className="qp-editor-head"><div><strong><Layers3 size={16}/> Variant konstruktori</strong><span>Rang, xotira, razmer, ta’m kabi xususiyatlarni kiriting. QULAY kombinatsiyalarni o‘zi yaratadi.</span></div><SecondaryButton type="button" onClick={() => patchForm({ axes:[...form.axes,{name:'',values:''}] })}><Plus size={14}/> Xususiyat</SecondaryButton></div>
                {!form.axes.length ? <button type="button" className="qp-product-empty-action" onClick={() => patchForm({ axes: [{ name: "Rang", values: "" }] })}><Plus size={16}/> Masalan “Rang” xususiyatini qo‘shish</button> : null}
                {form.axes.map((axis,index) => <div className="qp-axis-card" key={index}><div className="qp-axis-row"><input className="qp-input" placeholder="Xususiyat: Rang" value={axis.name} onChange={(event) => updateList('axes',index,{name:event.target.value})}/><input className="qp-input" placeholder="Qora, Oq, Ko‘k" value={axis.values} onChange={(event) => updateList('axes',index,{values:event.target.value})}/><button type="button" className="qp-icon-button" onClick={() => removeList('axes',index)}><Trash2 size={15}/></button></div>{axis.values.trim() ? <div className="qp-axis-chip-preview">{axis.values.split(',').map((value) => value.trim()).filter(Boolean).map((value) => <span key={value}>{value}</span>)}</div> : null}</div>)}
                <div className="qp-variant-generate-row"><SecondaryButton type="button" onClick={generateVariants}><Boxes size={15}/> Kombinatsiyalarni yaratish</SecondaryButton>{form.variants.length ? <span>{form.variants.length} ta variant tayyor</span> : null}</div>
                {form.variants.length ? <div className="qp-variant-table"><div className="qp-variant-row head"><span>Variant</span><span>SKU</span><span>Barcode</span><span>Narx override</span></div>{form.variants.map((item,index) => <div className="qp-variant-row" key={item.id || `${item.name}-${index}`}><strong>{item.name}</strong><input className="qp-input" value={item.sku} onChange={(event)=>updateList('variants',index,{sku:event.target.value.replace(/\D/g,'').slice(0,5)})}/><input className="qp-input" value={item.barcode} placeholder="Ixtiyoriy" onChange={(event)=>updateList('variants',index,{barcode:event.target.value})}/><input className="qp-input" type="number" min="0" value={item.price} placeholder="Asosiy narx" onChange={(event)=>updateList('variants',index,{price:event.target.value})}/></div>)}</div> : null}
              </div> : null}
            </section>

            <section className="qp-product-form-card">
              <header><span className="qp-section-icon"><Warehouse size={17}/></span><div><strong>Ta’minot va ombor</strong><small>Supplier, joylashuv va ishlab chiqaruvchi ma’lumotlari</small></div></header>
              <div className="qp-form-grid qp-product-ops-grid">
                {form.features.supplier ? <Field label="Asosiy supplier"><Select value={form.supplierId} onChange={(event)=>patchForm({supplierId:event.target.value})}><option value="">Yetkazib beruvchini tanlang</option>{db.suppliers.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field> : <div className="qp-product-inline-hint"><Truck size={17}/><span>Supplier kerak bo‘lsa yuqoridagi “Supplier” imkoniyatini yoqing.</span></div>}
                {form.features.location ? <Field label="Ombordagi joy / bin"><div className="qp-input-with-icon"><MapPin size={16}/><input className="qp-input" placeholder="A-1-3" value={form.warehouseLocation} onChange={(event)=>patchForm({warehouseLocation:event.target.value})}/></div></Field> : null}
                <Field label="Ishlab chiqaruvchi"><input className="qp-input" placeholder="Masalan: Apple" value={form.manufacturer} onChange={(event)=>patchForm({manufacturer:event.target.value})}/></Field>
                <Field label="Model"><input className="qp-input" placeholder="Masalan: A3090" value={form.model} onChange={(event)=>patchForm({model:event.target.value})}/></Field>
              </div>
              {(form.features.serial || form.features.lot || form.features.expiry) ? <div className="qp-tracking-notice"><CheckCircle2 size={18}/><div><strong>Tracking mahsuloti</strong><span>{form.features.serial ? "Serial/IMEI " : ""}{form.features.lot ? "Lot/partiya " : ""}{form.features.expiry ? "va yaroqlilik muddati " : ""}ma’lumotlari mahsulotni Ombor → Kirim orqali qabul qilganda kiritiladi.</span></div></div> : null}
            </section>

            <section className="qp-product-form-card qp-product-notes-card">
              <header><span className="qp-section-icon"><FileText size={17}/></span><div><strong>Qo‘shimcha ma’lumot</strong><small>Sotuv va ichki jamoa uchun tavsif</small></div></header>
              <div className="qp-form-grid"><Field label="Tavsif"><textarea className="qp-input" rows="4" maxLength="2000" value={form.description} onChange={(event)=>patchForm({description:event.target.value})} placeholder="Mahsulot haqida qisqacha ma’lumot..."/></Field><Field label="Ichki izoh"><textarea className="qp-input" rows="4" maxLength="2000" value={form.note} onChange={(event)=>patchForm({note:event.target.value})} placeholder="Faqat xodimlar ko‘radigan izoh..."/></Field></div>
            </section>
          </main>
        </div>

        <div className="qp-form-actions qp-sticky-actions qp-product-builder-actions"><div className="qp-product-save-summary"><CheckCircle2 size={16}/><span>{form.name.trim() || "Yangi mahsulot"}</span><small>{[form.features.variants && `${form.variants.length} variant`, form.features.packaging && `${form.packages.length} qadoq`, form.features.serial && "Serial/IMEI", form.features.expiry && "Expiry"].filter(Boolean).join(" · ") || "Oddiy mahsulot"}</small></div><SecondaryButton type="button" disabled={busy} onClick={()=>setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={busy}>{busy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : editing ? "O‘zgarishlarni saqlash" : "Mahsulotni saqlash"}</PrimaryButton></div>
      </form>
    </Modal>
    <Modal open={categoryModalOpen} title="Yangi kategoriya" description="Mahsulot formasidan chiqmasdan yangi kategoriya yarating." onClose={() => { if (!categoryBusy) setCategoryModalOpen(false); }}>
      <form onSubmit={createCategoryInline}><Field label="Kategoriya nomi"><input className="qp-input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Masalan: Telefon va aksessuarlar" autoFocus required/></Field><div className="qp-form-actions"><SecondaryButton type="button" disabled={categoryBusy} onClick={() => setCategoryModalOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={categoryBusy || !categoryName.trim()}>{categoryBusy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : "Kategoriya yaratish"}</PrimaryButton></div></form>
    </Modal>
    <BarcodeQrModal open={Boolean(codeProduct)} product={codeProduct} onClose={()=>setCodeProduct(null)}/>
  </>;
}

export default ProductsPage;

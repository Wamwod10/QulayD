import { Camera, CheckCircle2, ClipboardCheck, Plus, RotateCcw, ScanBarcode } from "lucide-react";
import { useMemo, useState } from "react";

import CameraScannerModal from "../../../components/mobile/CameraScannerModal";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { getName, shortDate } from "../../../utils/formatters";
import { findProductSelectionByScan, getProductBarcodes } from "../../../utils/productCodes";

function createDraftItems(db, warehouseId) {
  return db.products
    .filter((product) => product.status === "ACTIVE")
    .flatMap((product) => {
      const variants = (product.variants || []).filter((variant) => variant.status === "ACTIVE");
      const buildLine = (variant = null) => {
        const stockKey = variant?.id || "BASE";
        const productStock = (product.stocks || []).find((item) => item.warehouseId === warehouseId && (item.stockKey || "BASE") === stockKey);
        const baseBalance = !variant ? db.balances.find((item) => item.warehouseId === warehouseId && item.productId === product.id) : null;
        return {
          lineKey: `${product.id}:${stockKey}`,
          productId: product.id,
          variantId: variant?.id || null,
          variantName: variant?.name || "",
          systemQty: Number(productStock?.onHand ?? baseBalance?.onHand ?? 0),
          countedQty: "",
          tracked: Boolean(product.trackSerial || product.trackLot || product.trackExpiry),
          note: "",
        };
      };
      return variants.length ? variants.map((variant) => buildLine(variant)) : [buildLine()];
    });
}

function InventoryCountsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [countId, setCountId] = useState(null);
  const [countStatus, setCountStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState(db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "");
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedSerialIds, setScannedSerialIds] = useState(() => new Set());
  const [items, setItems] = useState(() => createDraftItems(db, db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || ""));

  const rows = db.inventoryCounts.map((item) => ({
    ...item,
    warehouse: getName(db.warehouses, item.warehouseId),
    progress: item.items?.length ? Math.round((item.items.filter((line) => line.countedQty !== "" && line.countedQty !== null).length / item.items.length) * 100) : 0,
  }));

  const openNew = () => {
    const nextWarehouse = db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "";
    setCountId(null);
    setCountStatus("");
    setWarehouseId(nextWarehouse);
    setItems(createDraftItems(db, nextWarehouse));
    setScannedSerialIds(new Set());
    setQuery("");
    setOpen(true);
  };

  const openCount = (row) => {
    setCountId(row.id);
    setCountStatus(row.status || "");
    setWarehouseId(row.warehouseId);
    setItems((row.items?.length ? row.items : createDraftItems(db, row.warehouseId)).map((item) => {
      const product = db.products.find((entry) => entry.id === item.productId);
      const variant = (product?.variants || []).find((entry) => entry.id === item.variantId);
      const stockKey = item.variantId || item.stockKey || "BASE";
      const systemQty = Number(item.systemQty ?? item.expected ?? 0);
      return { ...item, lineKey: `${item.productId}:${stockKey}`, variantId: item.variantId || null, variantName: item.variant?.name || variant?.name || "",
        systemQty, tracked: Boolean(product?.trackSerial || product?.trackLot || product?.trackExpiry), countedQty: item.countedQty ?? item.counted ?? "" };
    }));
    setScannedSerialIds(new Set());
    setQuery("");
    setOpen(true);
  };

  const changeWarehouse = (nextWarehouseId) => {
    if (countId) return;
    setWarehouseId(nextWarehouseId);
    setItems(createDraftItems(db, nextWarehouseId));
    setScannedSerialIds(new Set());
  };

  const setCounted = (lineKey, value) => {
    setItems((current) => current.map((item) => item.lineKey === lineKey ? { ...item, countedQty: value } : item));
  };

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const product = db.products.find((entry) => entry.id === item.productId);
      const variant = (product?.variants || []).find((entry) => entry.id === item.variantId);
      return `${product?.name || ""} ${product?.sku || ""} ${item.variantName || variant?.name || ""} ${variant?.sku || ""} ${getProductBarcodes(product).join(" ")} ${getProductBarcodes(variant).join(" ")}`.toLowerCase().includes(normalized);
    });
  }, [db.products, items, query]);

  const scanProduct = (rawValue) => {
    const selection = findProductSelectionByScan(db.products.filter((item) => item.status === "ACTIVE"), rawValue);
    const product = selection?.product;
    if (!product) {
      notify("Skanerlangan kod bo‘yicha mahsulot topilmadi", "warning");
      return false;
    }
    const activeVariants = (product.variants || []).filter((variant) => variant.status === "ACTIVE");
    const variantId = selection?.serial?.variantId || selection?.variant?.id || selection?.package?.variantId || null;
    if (activeVariants.length && !variantId) {
      notify("Variantli mahsulotda variant shtrix-kodi yoki serial/IMEI ni skanerlang", "warning");
      return false;
    }
    const lineKey = `${product.id}:${variantId || "BASE"}`;
    if (!items.some((item) => item.lineKey === lineKey)) {
      notify("Bu mahsulot/variant tanlangan ombor inventarizatsiyasida yo‘q", "warning");
      return false;
    }
    if (selection?.serial?.id) {
      if (scannedSerialIds.has(selection.serial.id)) {
        notify("Bu serial / IMEI allaqachon sanalgan", "warning");
        return false;
      }
      setScannedSerialIds((current) => new Set([...current, selection.serial.id]));
    }
    setItems((current) => current.map((item) => {
      if (item.lineKey !== lineKey) return item;
      const currentQty = item.countedQty === "" || item.countedQty === null ? 0 : Number(item.countedQty || 0);
      const increment = Number(selection?.package?.conversionToBase || 1);
      return { ...item, countedQty: String(currentQty + increment) };
    }));
    setQuery("");
    notify(`${product.name}${selection?.variant?.name ? ` · ${selection.variant.name}` : ""}: sanalgan miqdor qo‘shildi`);
    return true;
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    if (scanProduct(query)) event.preventDefault();
  };

  const countedCount = items.filter((item) => item.countedQty !== "" && item.countedQty !== null).length;
  const progress = items.length ? Math.round((countedCount / items.length) * 100) : 0;
  const differences = items.filter((item) => item.countedQty !== "" && Number(item.countedQty) !== Number(item.systemQty)).length;

  const saveDraft = async () => {
    if (countStatus === "COMPLETED") { notify("Yakunlangan inventarizatsiyani o‘zgartirib bo‘lmaydi", "warning"); return null; }
    const lines = items.map((line) => ({ productId: line.productId, variantId: line.variantId || null, counted: line.countedQty === "" || line.countedQty == null ? null : Number(line.countedQty) }));
    try {
      if (countId) { await apiRequest({ url: `/inventory/counts/${countId}`, method: "PATCH", body: { items: lines } }); notify("Inventarizatsiya qoralamasi yangilandi"); return countId; }
      const created = await apiRequest({ url: "/inventory/counts", body: { warehouseId, items: lines } }); setCountId(created.id); setCountStatus(created.status || "IN_PROGRESS"); notify("Inventarizatsiya qoralamasi saqlandi"); return created.id;
    } catch (error) { notify(error.message, "danger"); return null; }
  };

  const finalize = async () => {
    if (!warehouseId) { notify("Omborni tanlang", "warning"); return; }
    if (countedCount !== items.length) {
      notify(`Yakunlash uchun barcha mahsulotlarni sanang. Qoldi: ${items.length - countedCount}`, "warning");
      return;
    }
    const id = await saveDraft(); if (!id) return;
    try { await apiRequest({ url: `/inventory/counts/${id}/complete`, body: {} }); }
    catch (error) { notify(error.message, "danger"); return; }
    notify("Inventarizatsiya yakunlandi va qoldiqlar yangilandi");
    setOpen(false);
    setCountId(null);
    setCountStatus("");
  };

  return <>
    <SmartTablePage
      title="Inventarizatsiya"
      description="Tizim qoldig‘ini real sanalgan qoldiq bilan solishtiring. Faqat yakunlangandan keyin ombor qoldig‘i o‘zgaradi."
      eyebrow="Ombor"
      rows={rows}
      searchFields={["number", "warehouse", "status"]}
      extraSummary={[
        { label: "Jarayonda", value: rows.filter((row) => ["DRAFT", "IN_PROGRESS", "COUNTING", "REVIEW"].includes(row.status)).length, hint: "Sanash tugallanmagan" },
        { label: "Yakunlangan", value: rows.filter((row) => row.status === "COMPLETED").length, hint: "Qoldiq yangilangan" },
        { label: "Farqli hujjatlar", value: rows.filter((row) => Number(row.differences) > 0).length, hint: "Tekshiruv talab qilgan" },
      ]}
      actions={<PrimaryButton onClick={openNew}><Plus size={15} /> Yangi inventarizatsiya</PrimaryButton>}
      detailRenderer={(row) => <div className="qp-drawer-details">
        <div className="qp-detail-kpis"><div><span>Jarayon</span><strong>{row.progress}%</strong></div><div><span>Farqlar</span><strong>{row.differences || 0}</strong></div><div><span>Ombor</span><strong>{row.warehouse}</strong></div></div>
        <div className="qp-form-actions"><PrimaryButton type="button" onClick={() => openCount(row)}>{row.status === "COMPLETED" ? "Natijani ko‘rish" : "Davom ettirish"}</PrimaryButton></div>
      </div>}
      columns={[
        { key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> },
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "warehouse", label: "Ombor" },
        { key: "progress", label: "Jarayon", render: (row) => <div className="qp-mini-progress"><span><i style={{ width: `${row.progress}%` }} /></span><strong>{row.progress}%</strong></div> },
        { key: "differences", label: "Farqlar", render: (row) => <strong className={Number(row.differences) ? "qp-text-warning" : ""}>{row.differences || 0}</strong> },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      ]}
    />

    <Modal open={open} title={countStatus === "COMPLETED" ? "Inventarizatsiya natijasi" : countId ? "Inventarizatsiyani davom ettirish" : "Yangi inventarizatsiya"} description={countStatus === "COMPLETED" ? "Yakunlangan hujjat faqat ko‘rish uchun ochilgan." : "Mahsulotlarni sanang, farqlarni tekshiring va keyin yakunlang."} onClose={() => setOpen(false)} wide>
      <div className="qp-count-workspace">
        <div className="qp-count-toolbar">
          <Field label="Ombor"><Select value={warehouseId} onChange={(event) => changeWarehouse(event.target.value)} disabled={Boolean(countId)}>{db.warehouses.filter((item) => item.status === "ACTIVE").map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field>
          <Field label="Mahsulot qidirish"><div className="qp-count-scan-search"><div className="qp-input-with-icon"><ScanBarcode size={17} /><input className="qp-input" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Nom, SKU yoki shtrix-kod..." autoFocus /></div>{db.settings.mobile?.cameraScanner !== false ? <button type="button" className="qp-icon-button qp-count-camera" onClick={() => setScannerOpen(true)} title="Kamera bilan sanash" aria-label="Kamera bilan shtrix-kod skanerlash"><Camera size={17}/></button> : null}</div></Field>
        </div>

        <div className="qp-count-overview">
          <div><span>Sanash jarayoni</span><strong>{countedCount} / {items.length}</strong><small>{progress}% bajarildi</small></div>
          <div><span>Farqli pozitsiyalar</span><strong>{differences}</strong><small>Tizim va real qoldiq farqi</small></div>
          <div><span>Tanlangan ombor</span><strong>{getName(db.warehouses, warehouseId)}</strong><small>Qoldiq shu omborda tekshiriladi</small></div>
        </div>

        <div className="qp-count-progress"><span><i style={{ width: `${progress}%` }} /></span></div>

        <div className="qp-table-wrap qp-count-table-wrap">
          <table className="qp-table">
            <thead><tr><th>Mahsulot</th><th>SKU</th><th>Tizim qoldig‘i</th><th>Real sanaldi</th><th>Farq</th></tr></thead>
            <tbody>{filteredItems.map((line) => {
              const product = db.products.find((item) => item.id === line.productId);
              const hasCount = line.countedQty !== "" && line.countedQty !== null;
              const diff = hasCount ? Number(line.countedQty) - Number(line.systemQty || 0) : null;
              const variant = (product?.variants || []).find((item) => item.id === line.variantId);
              return <tr key={line.lineKey}>
                <td><strong>{product?.name || "Mahsulot"}</strong>{line.variantName || variant?.name ? <div className="qp-muted">{line.variantName || variant?.name}</div> : null}</td>
                <td><span className="qp-muted">{variant?.sku || product?.sku || "—"}</span></td>
                <td><strong>{line.systemQty}</strong></td>
                <td><input className="qp-input qp-count-input" type="number" min="0" step="0.001" value={line.countedQty} disabled={countStatus === "COMPLETED"} title={line.tracked ? "Serial/lot mahsulotni real sanang. Farq bo‘lsa tracking ma’lumoti bilan Qoldiq tuzatish orqali hal qilinadi." : undefined} onChange={(event) => setCounted(line.lineKey, event.target.value)} placeholder="0" /></td>
                <td>{diff === null ? <span className="qp-muted">—</span> : <strong className={diff === 0 ? "qp-text-success" : "qp-text-warning"}>{diff > 0 ? `+${diff}` : diff}</strong>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>

        <div className="qp-form-actions qp-count-actions">
          {countStatus === "COMPLETED" ? <SecondaryButton type="button" onClick={() => setOpen(false)}>Yopish</SecondaryButton> : <>
            <SecondaryButton type="button" onClick={() => { setItems(createDraftItems(db, warehouseId)); setScannedSerialIds(new Set()); notify("Sanash maydonlari qayta tiklandi", "info"); }}><RotateCcw size={15} /> Qayta boshlash</SecondaryButton>
            <SecondaryButton type="button" onClick={saveDraft}><ClipboardCheck size={15} /> Qoralama saqlash</SecondaryButton>
            <PrimaryButton type="button" onClick={finalize}><CheckCircle2 size={16} /> Inventarizatsiyani yakunlash</PrimaryButton>
          </>}
        </div>
      </div>
    </Modal>
    <CameraScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={scanProduct} title="Inventarizatsiyada skanerlash" />
  </>;
}
export default InventoryCountsPage;

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
import { findProductByScan, getProductBarcodes } from "../../../utils/productCodes";

function createDraftItems(db, warehouseId) {
  return db.products
    .filter((product) => product.status === "ACTIVE")
    .map((product) => {
      const balance = db.balances.find((item) => item.warehouseId === warehouseId && item.productId === product.id);
      return {
        productId: product.id,
        systemQty: Number(balance?.onHand || 0),
        countedQty: "",
        note: "",
      };
    });
}

function InventoryCountsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [countId, setCountId] = useState(null);
  const [warehouseId, setWarehouseId] = useState(db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "");
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [items, setItems] = useState(() => createDraftItems(db, db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || ""));

  const rows = db.inventoryCounts.map((item) => ({
    ...item,
    warehouse: getName(db.warehouses, item.warehouseId),
    progress: item.items?.length ? Math.round((item.items.filter((line) => line.countedQty !== "" && line.countedQty !== null).length / item.items.length) * 100) : 0,
  }));

  const openNew = () => {
    const nextWarehouse = db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "";
    setCountId(null);
    setWarehouseId(nextWarehouse);
    setItems(createDraftItems(db, nextWarehouse));
    setQuery("");
    setOpen(true);
  };

  const openCount = (row) => {
    setCountId(row.id);
    setWarehouseId(row.warehouseId);
    setItems((row.items?.length ? row.items : createDraftItems(db, row.warehouseId)).map((item) => ({ ...item, countedQty: item.countedQty ?? "" })));
    setQuery("");
    setOpen(true);
  };

  const changeWarehouse = (nextWarehouseId) => {
    if (countId) return;
    setWarehouseId(nextWarehouseId);
    setItems(createDraftItems(db, nextWarehouseId));
  };

  const setCounted = (productId, value) => {
    setItems((current) => current.map((item) => item.productId === productId ? { ...item, countedQty: value } : item));
  };

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const product = db.products.find((entry) => entry.id === item.productId);
      return `${product?.name || ""} ${product?.sku || ""} ${getProductBarcodes(product).join(" ")}`.toLowerCase().includes(normalized);
    });
  }, [db.products, items, query]);

  const scanProduct = (rawValue) => {
    const product = findProductByScan(db.products.filter((item) => item.status === "ACTIVE"), rawValue);
    if (!product) {
      notify("Skanerlangan kod bo‘yicha mahsulot topilmadi", "warning");
      return false;
    }
    if (!items.some((item) => item.productId === product.id)) {
      notify("Bu mahsulot tanlangan ombor inventarizatsiyasida yo‘q", "warning");
      return false;
    }
    setItems((current) => current.map((item) => {
      if (item.productId !== product.id) return item;
      const currentQty = item.countedQty === "" || item.countedQty === null ? 0 : Number(item.countedQty || 0);
      return { ...item, countedQty: String(currentQty + 1) };
    }));
    setQuery("");
    notify(`${product.name}: sanalgan miqdor +1`);
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
    if (countId) { notify("Inventarizatsiya qoralamasi avval saqlangan", "info"); return countId; }
    try { const created = await apiRequest({ url: "/inventory/counts", body: { warehouseId, items: items.map((line) => ({ productId: line.productId, counted: Number(line.countedQty || line.systemQty || 0) })) } }); setCountId(created.id); notify("Inventarizatsiya qoralamasi saqlandi"); return created.id; }
    catch (error) { notify(error.message, "danger"); return null; }
  };

  const finalize = async () => {
    if (!warehouseId) { notify("Omborni tanlang", "warning"); return; }
    if (countedCount !== items.length) {
      notify(`Yakunlash uchun barcha mahsulotlarni sanang. Qoldi: ${items.length - countedCount}`, "warning");
      return;
    }
    const id = countId || await saveDraft(); if (!id) return;
    try { await apiRequest({ url: `/inventory/counts/${id}/complete`, body: {} }); }
    catch (error) { notify(error.message, "danger"); return; }
    notify("Inventarizatsiya yakunlandi va qoldiqlar yangilandi");
    setOpen(false);
    setCountId(null);
  };

  return <>
    <SmartTablePage
      title="Inventarizatsiya"
      description="Tizim qoldig‘ini real sanalgan qoldiq bilan solishtiring. Faqat yakunlangandan keyin ombor qoldig‘i o‘zgaradi."
      eyebrow="Ombor"
      rows={rows}
      searchFields={["number", "warehouse", "status"]}
      extraSummary={[
        { label: "Jarayonda", value: rows.filter((row) => ["DRAFT", "COUNTING", "REVIEW"].includes(row.status)).length, hint: "Sanash tugallanmagan" },
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

    <Modal open={open} title={countId ? "Inventarizatsiyani davom ettirish" : "Yangi inventarizatsiya"} description="Mahsulotlarni sanang, farqlarni tekshiring va keyin yakunlang." onClose={() => setOpen(false)} wide>
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
              return <tr key={line.productId}>
                <td><strong>{product?.name || "Mahsulot"}</strong></td>
                <td><span className="qp-muted">{product?.sku || "—"}</span></td>
                <td><strong>{line.systemQty}</strong></td>
                <td><input className="qp-input qp-count-input" type="number" min="0" value={line.countedQty} onChange={(event) => setCounted(line.productId, event.target.value)} placeholder="0" /></td>
                <td>{diff === null ? <span className="qp-muted">—</span> : <strong className={diff === 0 ? "qp-text-success" : "qp-text-warning"}>{diff > 0 ? `+${diff}` : diff}</strong>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>

        <div className="qp-form-actions qp-count-actions">
          <SecondaryButton type="button" onClick={() => { setItems(createDraftItems(db, warehouseId)); notify("Sanash maydonlari qayta tiklandi", "info"); }}><RotateCcw size={15} /> Qayta boshlash</SecondaryButton>
          <SecondaryButton type="button" onClick={saveDraft}><ClipboardCheck size={15} /> Qoralama saqlash</SecondaryButton>
          <PrimaryButton type="button" onClick={finalize}><CheckCircle2 size={16} /> Inventarizatsiyani yakunlash</PrimaryButton>
        </div>
      </div>
    </Modal>
    <CameraScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={scanProduct} title="Inventarizatsiyada skanerlash" />
  </>;
}
export default InventoryCountsPage;

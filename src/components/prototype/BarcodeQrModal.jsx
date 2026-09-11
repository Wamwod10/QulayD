import { Copy, Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { Modal, PrimaryButton, SecondaryButton } from "./PrototypeUI";
import { notify } from "../../services/notify";
import { getProductBarcodes } from "../../utils/productCodes";

import { buildBarcodeUrl, buildQrUrl, printProductLabels, sanitizeCode } from "./barcodeQrUtils";

function BarcodeQrModal({ open, product, onClose }) {
  const [failed, setFailed] = useState({ barcode: false, qr: false });
  const barcodes = getProductBarcodes(product);
  const primaryBarcode = barcodes[0] || "";
  const code = sanitizeCode(primaryBarcode || product?.sku || product?.id);
  const qrPayload = useMemo(() => JSON.stringify({
    id: product?.id,
    sku: product?.sku,
    barcode: primaryBarcode,
    barcodes,
    name: product?.name,
  }), [barcodes, primaryBarcode, product]);

  if (!product) return null;

  const copyCode = async (value = code) => {
    try {
      await navigator.clipboard.writeText(value);
      notify("Kod nusxalandi");
    } catch {
      notify("Koddan nusxa olib bo‘lmadi", "warning");
    }
  };

  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const barcodeUrl = buildBarcodeUrl(code);
  const qrUrl = buildQrUrl(qrPayload);

  return (
    <Modal open={open} title="Shtrix va QR kod" description={`${product.name} · SKU ${product.sku || "—"}`} onClose={onClose} wide>
      <div className="qp-code-modal-grid">
        <section className="qp-code-card">
          <div className="qp-code-card-head"><strong>Asosiy shtrix-kod</strong><span>CODE 128</span></div>
          <div className="qp-code-preview qp-code-preview-barcode">
            {!failed.barcode ? <img src={barcodeUrl} alt={`${product.name} shtrix-kodi`} onError={() => setFailed((value) => ({ ...value, barcode: true }))} /> : <div className="qp-code-fallback"><span>{code}</span><small>Internet bo‘lganda shtrix-kod tasviri yuklanadi</small></div>}
          </div>
          <div className="qp-code-value">{code}</div>
          {barcodes.length > 1 ? <div className="qp-extra-barcodes">{barcodes.slice(1).map((barcode) => <button type="button" key={barcode} onClick={() => copyCode(barcode)}><span>{barcode}</span><Copy size={13} /></button>)}</div> : null}
          <div className="qp-inline-actions">
            <SecondaryButton type="button" onClick={() => copyCode()}><Copy size={15} /> Nusxalash</SecondaryButton>
            <SecondaryButton type="button" onClick={() => downloadImage(barcodeUrl, `${product.sku || product.id}-barcode.png`)}><Download size={15} /> Yuklab olish</SecondaryButton>
          </div>
        </section>

        <section className="qp-code-card">
          <div className="qp-code-card-head"><strong>QR kod</strong><span>Barcha mahsulot kodlari</span></div>
          <div className="qp-code-preview qp-code-preview-qr">
            {!failed.qr ? <img src={qrUrl} alt={`${product.name} QR kodi`} onError={() => setFailed((value) => ({ ...value, qr: true }))} /> : <div className="qp-code-fallback"><span>QR</span><small>Internet bo‘lganda QR tasviri yuklanadi</small></div>}
          </div>
          <div className="qp-code-value qp-code-value-small">{primaryBarcode || product.sku || product.id}</div>
          <div className="qp-inline-actions">
            <SecondaryButton type="button" onClick={() => downloadImage(qrUrl, `${product.sku || product.id}-qr.png`)}><Download size={15} /> Yuklab olish</SecondaryButton>
          </div>
        </section>
      </div>

      <div className="qp-form-actions qp-code-actions">
        <SecondaryButton type="button" onClick={onClose}>Yopish</SecondaryButton>
        <PrimaryButton type="button" onClick={() => printProductLabels([product])}><Printer size={16} /> Chop etish</PrimaryButton>
      </div>
    </Modal>
  );
}

export default BarcodeQrModal;

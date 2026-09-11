import { notify } from "../../services/notify";
import { getProductBarcodes } from "../../utils/productCodes";

function sanitizeCode(value) {
  return String(value || "").trim() || "QULAY";
}

function printWindow(html) {
  const printTab = window.open("", "_blank", "noopener,noreferrer,width=760,height=700");
  if (!printTab) {
    notify("Chop etish oynasini brauzer blokladi", "warning");
    return;
  }
  printTab.document.write(html);
  printTab.document.close();
  printTab.focus();
  window.setTimeout(() => printTab.print(), 250);
}

export function buildBarcodeUrl(code, scale = 4) {
  const text = encodeURIComponent(sanitizeCode(code));
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${text}&scale=${scale}&height=14&includetext=true&backgroundcolor=ffffff`;
}

export function buildQrUrl(payload, size = 240) {
  return `https://quickchart.io/qr?size=${size}&margin=1&text=${encodeURIComponent(payload)}`;
}

export function printProductLabels(products) {
  if (!products?.length) return;
  const labels = products.map((product) => {
    const barcodes = getProductBarcodes(product);
    const code = sanitizeCode(barcodes[0] || product.sku || product.id);
    const qrPayload = JSON.stringify({ id: product.id, sku: product.sku, barcode: barcodes[0] || "", barcodes, name: product.name });
    return `
      <article class="label">
        <header><strong>${product.name}</strong><span>SKU: ${product.sku || "—"}</span></header>
        <div class="codes">
          <img src="${buildBarcodeUrl(code, 3)}" alt="Shtrix-kod" />
          <img class="qr" src="${buildQrUrl(qrPayload, 170)}" alt="QR kod" />
        </div>
      </article>`;
  }).join("");

  printWindow(`<!doctype html><html><head><meta charset="utf-8"><title>Qulay — Shtrix va QR</title><style>
    *{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;margin:24px;color:#161a1d}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.label{border:1px solid #e4e9e5;border-radius:14px;padding:16px;break-inside:avoid}.label header{display:flex;flex-direction:column;gap:3px;margin-bottom:14px}.label strong{font-size:15px}.label span{font-size:11px;color:#68716b}.codes{display:grid;grid-template-columns:1fr 88px;gap:14px;align-items:center}.codes img{max-width:100%;max-height:105px;object-fit:contain}.codes .qr{width:88px;height:88px}@media print{body{margin:0}.label{border-color:#bbb}.grid{gap:8px}}
  </style></head><body><div class="grid">${labels}</div></body></html>`);
}

export { sanitizeCode };

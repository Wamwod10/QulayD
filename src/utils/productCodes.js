function randomDigits(length) {
  let value = "";
  for (let index = 0; index < length; index += 1) value += Math.floor(Math.random() * 10);
  return value;
}

export function calculateEan13CheckDigit(firstTwelveDigits) {
  const digits = String(firstTwelveDigits).replace(/\D/g, "").slice(0, 12).padEnd(12, "0");
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function normalizeBarcode(value) {
  return String(value || "").trim();
}

export function getProductBarcodes(product) {
  const values = Array.isArray(product?.barcodes) ? product.barcodes : [product?.barcode];
  return Array.from(new Set(values.map(normalizeBarcode).filter(Boolean)));
}


export function getScanCandidates(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];
  const values = [raw];
  try {
    const payload = JSON.parse(raw);
    if (payload?.barcode) values.push(String(payload.barcode));
    if (Array.isArray(payload?.barcodes)) values.push(...payload.barcodes.map(String));
    if (payload?.sku) values.push(String(payload.sku));
    if (payload?.id) values.push(String(payload.id));
  } catch {
    // Plain EAN/CODE128/QR values are the common case.
  }
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function findProductByScan(products = [], rawValue) {
  const candidates = getScanCandidates(rawValue);
  if (!candidates.length) return null;
  return products.find((product) => {
    const codes = getProductBarcodes(product);
    return candidates.some((value) => codes.includes(value) || String(product.sku || "") === value || String(product.id || "") === value);
  }) || null;
}

export function collectProductBarcodes(products = [], excludeProductId = "") {
  return new Set(
    products
      .filter((product) => product.id !== excludeProductId)
      .flatMap((product) => getProductBarcodes(product)),
  );
}

export function generateUniqueSku(products = [], excludeProductId = "") {
  const existing = new Set(
    products
      .filter((product) => product.id !== excludeProductId)
      .map((product) => String(product.sku || "").trim().toUpperCase())
      .filter(Boolean),
  );
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = `SKU-${randomDigits(6)}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `SKU-${Date.now().toString().slice(-8)}`;
}

export function generateUniqueEan13(products = [], excludeProductId = "") {
  const existing = collectProductBarcodes(products, excludeProductId);
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const firstTwelve = `478${randomDigits(9)}`;
    const candidate = `${firstTwelve}${calculateEan13CheckDigit(firstTwelve)}`;
    if (!existing.has(candidate)) return candidate;
  }
  const fallback = `478${String(Date.now()).slice(-9)}`.slice(0, 12);
  return `${fallback}${calculateEan13CheckDigit(fallback)}`;
}

export function createProductIdentity(products = [], excludeProductId = "") {
  const barcode = generateUniqueEan13(products, excludeProductId);
  return {
    sku: generateUniqueSku(products, excludeProductId),
    barcode,
    barcodes: [barcode],
  };
}

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
  return Array.from(new Set(values.map((value) => normalizeBarcode(value?.barcode ?? value)).filter(Boolean)));
}

export function findProductSelectionByScan(products = [], rawValue) {
  const candidates = getScanCandidates(rawValue);
  for (const product of products) {
    const serial = (Array.isArray(product.serials) ? product.serials : []).find((item) => item.status === "AVAILABLE" && candidates.some((value) => value === String(item.serial || "") || value === String(item.imei || "")));
    if (serial) return { product, serial, variant: serial.variantId
      ? (Array.isArray(product.variants) ? product.variants : []).find((item) => item.id === serial.variantId) || null : null };
    const variant = (Array.isArray(product.variants) ? product.variants : []).find((item) => item.status !== "INACTIVE" && candidates.some((value) => getProductBarcodes(item).includes(value)));
    if (variant) return { product, variant };
    const productPackage = (Array.isArray(product.packages) ? product.packages : []).find((item) => item.status !== "INACTIVE" && candidates.some((value) => getProductBarcodes(item).includes(value)));
    if (productPackage) return { product, package: productPackage, variant: productPackage.variantId
      ? (Array.isArray(product.variants) ? product.variants : []).find((item) => item.id === productPackage.variantId) || null : null };
    if (candidates.some((value) => getProductBarcodes(product).includes(value) || String(product.sku || "") === value || String(product.id || "") === value)) return { product };
  }
  return null;
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
  return findProductSelectionByScan(products, rawValue)?.product || null;
}

export function collectProductBarcodes(products = [], excludeProductId = "") {
  return new Set(
    products
      .filter((product) => product.id !== excludeProductId)
      .flatMap((product) => [
        ...getProductBarcodes(product),
        ...(Array.isArray(product.variants) ? product.variants : []).flatMap((variant) => getProductBarcodes(variant)),
        ...(Array.isArray(product.packages) ? product.packages : []).flatMap((productPackage) => getProductBarcodes(productPackage)),
      ]),
  );
}

export function collectProductSkus(products = [], excludeProductId = "") {
  return new Set(
    products
      .filter((product) => product.id !== excludeProductId)
      .flatMap((product) => [product.sku, ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant.sku) : [])])
      .map((sku) => String(sku || "").trim().toUpperCase())
      .filter(Boolean),
  );
}

export function generateUniqueSku(products = [], excludeProductId = "") {
  const existing = collectProductSkus(products, excludeProductId);
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = randomDigits(5);
    if (!existing.has(candidate)) return candidate;
  }
  const numeric = [...existing].filter((value) => /^\d+$/.test(value)).map(Number).filter(Number.isFinite);
  let candidate = String((numeric.length ? Math.max(...numeric) : 99999) + 1);
  if (!existing.has(candidate)) return candidate;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    candidate = `SKU-${Date.now().toString(36).toUpperCase()}-${randomDigits(3)}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error("Yangi unikal SKU yaratib bo‘lmadi");
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
  return {
    sku: generateUniqueSku(products, excludeProductId),
    barcode: "",
    barcodes: [""],
  };
}

import { describe, expect, it } from "vitest";

import { createProductIdentity, findProductByScan, generateUniqueSku, getProductBarcodes } from "./productCodes";

describe("product identity", () => {
  it("creates a unique five-digit SKU and an empty first barcode", () => {
    const products = [{ id: "old", sku: "SKU-123456", barcode: "111", barcodes: ["111", "222"] }];
    const identity = createProductIdentity(products);
    expect(identity.sku).toMatch(/^\d{5}$/);
    expect(identity.sku).not.toBe(products[0].sku);
    expect(identity.barcodes).toEqual([""]);
  });

  it("keeps legacy SKUs searchable and resolves every barcode", () => {
    const products = [{ id: "p1", sku: "SKU-123456", barcode: "111", barcodes: ["111", "222"] }];
    expect(getProductBarcodes(products[0])).toEqual(["111", "222"]);
    expect(findProductByScan(products, "222")?.id).toBe("p1");
    expect(findProductByScan(products, "SKU-123456")?.id).toBe("p1");
  });

  it("never returns an existing five-digit SKU", () => {
    const products = Array.from({ length: 20 }, (_, index) => ({ id: String(index), sku: String(index).padStart(5, "0") }));
    expect(products.map((item) => item.sku)).not.toContain(generateUniqueSku(products));
  });
});

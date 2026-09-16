import { describe, expect, it } from "vitest";

import { collectProductBarcodes, createProductIdentity, findProductByScan, findProductSelectionByScan, generateUniqueSku, getProductBarcodes } from "./productCodes";

describe("product identity", () => {
  it("creates a unique SKU and an empty first barcode", () => {
    const products = [{ id: "old", sku: "SKU-123456", barcode: "111", barcodes: ["111", "222"] }];
    const identity = createProductIdentity(products);
    expect(identity.sku).toMatch(/^[A-Za-z0-9._\/-]{1,64}$/);
    expect(identity.sku).not.toBe(products[0].sku);
    expect(identity.barcodes).toEqual([""]);
  });

  it("keeps legacy SKUs searchable and resolves every barcode", () => {
    const products = [{ id: "p1", sku: "SKU-123456", barcode: "111", barcodes: ["111", "222"] }];
    expect(getProductBarcodes(products[0])).toEqual(["111", "222"]);
    expect(findProductByScan(products, "222")?.id).toBe("p1");
    expect(findProductByScan(products, "SKU-123456")?.id).toBe("p1");
  });

  it("never returns an existing product or variant SKU", () => {
    const products = Array.from({ length: 20 }, (_, index) => ({ id: String(index), sku: String(index).padStart(5, "0") }));
    products[0].variants = [{ sku: "99999" }];
    const generated = generateUniqueSku(products);
    expect(products.map((item) => item.sku)).not.toContain(generated);
    expect(generated).not.toBe("99999");
  });

  it("collects variant and package barcodes for client-side duplicate protection", () => {
    const products = [{ id: "p1", barcodes: ["111"], variants: [{ barcodes: ["222"] }], packages: [{ barcode: "333" }] }];
    expect([...collectProductBarcodes(products)].sort()).toEqual(["111", "222", "333"]);
  });

  it("does not resolve inactive variant or package barcodes", () => {
    const products = [{ id: "p1", status: "ACTIVE", variants: [{ id: "v1", status: "INACTIVE", barcodes: ["222"] }], packages: [{ id: "pk1", status: "INACTIVE", barcode: "333" }] }];
    expect(findProductSelectionByScan(products, "222")).toBeNull();
    expect(findProductSelectionByScan(products, "333")).toBeNull();
  });
});

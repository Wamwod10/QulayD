import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./authService", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "./authService";
import { arriveDelivery, completeDelivery, completePosSale, createOrder, createProduct, createTransfer } from "./prototypeActions";
import { loadReport } from "./reportService";

describe("canonical business API flows", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ id: "created-id" });
  });

  it("creates a priced product with barcode and opening stock", async () => {
    await createProduct({ name: "Cola", sku: "SKU-123456", unitId: "unit-1", primaryPriceListId: "price-1", prices: [{ priceListId: "price-1", price: 12_000 }], barcodes: ["4780010000011"], warehouseId: "warehouse-1", initialStock: 10 });
    expect(apiRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: "/catalog/products",
      body: expect.objectContaining({ primaryPriceListId: "price-1", prices: [{ priceListId: "price-1", price: 12_000 }], barcodes: [{ barcode: "4780010000011", isPrimary: true }], openingStock: [{ warehouseId: "warehouse-1", onHand: 10 }] }),
    }));
  });

  it("creates orders and POS sales against backend contracts", async () => {
    await createOrder({ warehouseId: "warehouse-1", customerId: "customer-1", items: [{ productId: "product-1", quantity: 2, price: 5000 }] });
    expect(apiRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: "/orders", body: expect.objectContaining({ items: [expect.objectContaining({ productId: "product-1", quantity: 2, unitPrice: 5000 })] }) }));
    await completePosSale({ cart: [{ productId: "product-1", quantity: 1, price: 5000 }], warehouseId: "warehouse-1", paymentMethod: "CASH", total: 5000 });
    expect(apiRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: "/pos/sales", body: expect.objectContaining({ payments: [{ methodCode: "CASH", amount: 5000 }] }) }));
  });

  it("creates a transfer and executes delivery actions", async () => {
    await createTransfer({ fromWarehouseId: "warehouse-a", toWarehouseId: "warehouse-b", productId: "product-1", quantity: 3 });
    expect(apiRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: "/inventory/transfers", body: expect.objectContaining({ sourceWarehouseId: "warehouse-a", targetWarehouseId: "warehouse-b" }) }));
    await arriveDelivery("delivery-1", { latitude: 41.3, longitude: 69.2 });
    await completeDelivery("delivery-1", { recipientName: "Ali" });
    expect(apiRequest.mock.calls.map(([request]) => request.url)).toEqual(expect.arrayContaining(["/delivery/deliveries/delivery-1/arrive", "/delivery/deliveries/delivery-1/complete"]));
  });

  it.each(["sales", "inventory", "debt", "delivery"])("loads the %s report with GET", async (name) => {
    await loadReport(name);
    expect(apiRequest).toHaveBeenLastCalledWith({ url: `/reports/${name}`, method: "GET" });
  });
});

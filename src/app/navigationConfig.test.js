import { describe, expect, it } from "vitest";

import { getNavigationDefaultPath, getRouteModule, navigationConfig } from "./navigationConfig";

const section = (key) => navigationConfig.find((item) => item.key === key);

describe("module parent navigation", () => {
  it.each([
    ["inventory", "/inventory/products"],
    ["partners", "/customers"],
    ["finance", "/finance"],
    ["settings", "/settings/general"],
  ])("opens %s at its first working page", (key, expected) => {
    expect(getNavigationDefaultPath(section(key))).toBe(expected);
  });

  it("opens Sales at Orders instead of POS focus mode", () => {
    expect(getNavigationDefaultPath(section("sales"))).toBe("/orders");
    expect(getNavigationDefaultPath(section("sales"))).not.toBe("/sales/pos");
  });

  it("has no standalone catalog module and maps legacy catalog routes", () => {
    expect(section("catalog")).toBeUndefined();
    expect(getRouteModule("/catalog/products")).toBe("inventory");
    expect(getRouteModule("/catalog/units")).toBe("settings");
  });
});

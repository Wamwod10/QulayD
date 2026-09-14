import { describe, expect, it } from "vitest";

import { getDisplayValue, getPrimitiveId, relationDisplayFields } from "./displayValue";

describe("UI-safe relation display", () => {
  it.each([
    ["warehouse", { id: "wh-1", name: "Markaziy ombor" }, "Markaziy ombor"],
    ["employee", { id: "emp-1", fullName: "Ali Valiyev" }, "Ali Valiyev"],
    ["customer", { id: "cus-1", name: "Baraka MCHJ" }, "Baraka MCHJ"],
    ["product", { id: "prd-1", name: "Olma sharbati" }, "Olma sharbati"],
  ])("renders a %s relation by its explicit display field", (_type, relation, expected) => {
    expect(getDisplayValue(relation)).toBe(expected);
  });

  it("handles null, deleted and archived relations without exposing objects", () => {
    expect(getDisplayValue(null)).toBe("—");
    expect(getDisplayValue({ id: "old", name: "Arxiv ombor", deletedAt: "2026-01-01" })).toBe("Arxiv ombor");
    expect(getDisplayValue({ id: "old", status: "ARCHIVED" })).toBe("—");
    expect(getDisplayValue({ unexpected: true })).not.toBe("[object Object]");
  });

  it("creates canonical relation id and name aliases", () => {
    const result = relationDisplayFields({ branch: { id: "br-1", name: "Bosh filial" } }, ["branch"]);
    expect(result).toMatchObject({ branchId: "br-1", branchName: "Bosh filial" });
    expect(getPrimitiveId(result.branch)).toBe("br-1");
  });

  it("formats relation arrays by names", () => {
    expect(getDisplayValue([{ name: "Birinchi" }, null, { name: "Ikkinchi" }])).toBe("Birinchi, Ikkinchi");
  });
});

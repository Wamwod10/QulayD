import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/localDb", () => ({
  useLocalDb: (selector) => selector({ settings: { appearance: { showTableSummary: false } }, meta: { loading: false } }),
}));
vi.mock("../navigation/SectionNavigation", () => ({ default: () => null }));

import SmartTablePage from "./SmartTablePage";

describe("SmartTablePage relation safety", () => {
  it("renders relation objects by name in table and mobile paths", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartTablePage
          title="Omborlar"
          rows={[{ id: "1", warehouse: { id: "wh-1", name: "Markaziy ombor" }, employee: { id: "e-1", fullName: "Ali Valiyev" } }]}
          searchFields={["warehouse", "employee"]}
          columns={[{ key: "warehouse", label: "Ombor" }, { key: "employee", label: "Xodim" }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Markaziy ombor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ali Valiyev").length).toBeGreaterThan(0);
  });

  it("renders null and unknown object values as a dash", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartTablePage
          title="Xavfsiz jadval"
          rows={[{ id: "1", customer: null, product: { unexpected: true } }]}
          columns={[{ key: "customer", label: "Mijoz" }, { key: "product", label: "Mahsulot" }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});

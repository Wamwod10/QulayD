import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Select from "./Select";

describe("Select primitive contract", () => {
  it("renders an object option label through a known display field", () => {
    render(<Select value={{ id: "wh-1" }}><option value={{ id: "wh-1" }}>{({ id: "wh-1", name: "Markaziy ombor" })}</option></Select>);
    expect(screen.getByRole("button", { name: "Markaziy ombor" })).toBeInTheDocument();
  });

  it("emits a primitive option value", () => {
    const onChange = vi.fn();
    render(<Select value="" onChange={onChange}><option value="">Tanlang</option><option value={{ id: "emp-1" }}>{({ fullName: "Ali Valiyev" })}</option></Select>);
    fireEvent.click(screen.getByRole("button", { name: "Tanlang" }));
    fireEvent.click(screen.getByRole("option", { name: "Ali Valiyev" }));
    expect(onChange).toHaveBeenCalledWith({ target: { value: "emp-1" } });
  });
});

import { describe, expect, it } from "vitest";

import { resolveMediaUrl } from "./mediaUrl";

describe("resolveMediaUrl", () => {
  it("resolves backend upload paths against the API origin", () => {
    expect(resolveMediaUrl("/uploads/product.webp", "https://api.example.com/api/v1"))
      .toBe("https://api.example.com/uploads/product.webp");
  });

  it("keeps absolute and non-upload URLs unchanged", () => {
    expect(resolveMediaUrl("https://cdn.example.com/product.webp", "https://api.example.com/api/v1"))
      .toBe("https://cdn.example.com/product.webp");
    expect(resolveMediaUrl("/images/placeholder.png", "https://api.example.com/api/v1"))
      .toBe("/images/placeholder.png");
  });
});

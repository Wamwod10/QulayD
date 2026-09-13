import { beforeEach, describe, expect, it } from "vitest";

import { getHomePathForUser } from "./authService";
import { clearSession, saveSession } from "./baseApi";
import { STORAGE_KEYS } from "../constants/storageKeys";

describe("backend authentication state", () => {
  beforeEach(() => localStorage.clear());

  it("persists only the access token and validated tenant context", () => {
    saveSession({
      accessToken: "access-token",
      refreshToken: "must-never-be-persisted",
      user: { companyId: "cmp-1", branchId: "branch-1" },
    });

    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBe("access-token");
    expect(localStorage.getItem(STORAGE_KEYS.selectedCompanyId)).toBe("cmp-1");
    expect(localStorage.getItem(STORAGE_KEYS.selectedBranchId)).toBe("branch-1");
    expect(JSON.stringify({ ...localStorage })).not.toContain("must-never-be-persisted");

    clearSession();
    expect(localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it("selects the first permitted backend module as home", () => {
    expect(getHomePathForUser({ modules: ["sales", "reports"] })).toBe("/orders");
    expect(getHomePathForUser({ modules: [] })).toBe("/forbidden");
  });
});

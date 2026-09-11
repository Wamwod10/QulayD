import { beforeEach, describe, expect, it } from "vitest";

import { createEmployeeAuthUser, DIRECTORY_KEY, getHomePathForUser, loginWithPhone } from "./authService";
import { exportLocalDb, resetLocalDbCache } from "./localDb";

describe("employee platform access", () => {
  beforeEach(() => { localStorage.clear(); resetLocalDbCache(); });

  it("creates a login identity with independent module access and no raw PIN", () => {
    const user = createEmployeeAuthUser({ companyId: "cmp-demo", employeeId: "emp-test", name: "Test Xodim", title: "Savdo menejeri", phone: "+998901234567", login: "manager.test", password: "Secret12", pinHash: "hashed-pin-only", moduleAccess: ["sales", "reports"] });
    expect(user.roles).toEqual(["EMPLOYEE"]);
    expect(user.moduleAccess).toEqual(["sales", "reports"]);
    expect(getHomePathForUser(user)).toBe("/orders");
    expect(loginWithPhone("manager.test", "Secret12").user.id).toBe(user.id);
    expect(localStorage.getItem(DIRECTORY_KEY)).not.toContain('"pin":"');
  });

  it("migrates the LocalDB registry without catalog and seeds payment methods", () => {
    const db = JSON.parse(exportLocalDb());
    expect(db.settings.modules.catalog).toBeUndefined();
    expect(db.paymentMethods.map((item) => item.code)).toContain("CASH");
    expect(db.meta.version).toBe(6);
  });
});

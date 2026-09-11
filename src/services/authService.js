const DIRECTORY_KEY = "qulay.auth.directory.v1";
const SESSION_KEY = "qulay.auth.session.v1";
const AUTH_EVENT = "qulay:auth-change";

const now = () => new Date().toISOString();
const normalizePhone = (value = "") => String(value).replace(/[^\d+]/g, "").trim();

const DEFAULT_COMPANY_ID = "cmp-demo";

const PLATFORM_MODULE_KEYS = ["sales", "pos", "catalog", "inventory", "partners", "agents", "routes", "fulfillment", "delivery", "finance", "reports"];

function defaultPlatformSettings() {
  return {
    signupEnabled: true,
    maintenanceMode: false,
    defaultTrialDays: 14,
    defaultPlan: "TRIAL",
    plans: {
      TRIAL: { limits: { employees: 5, branches: 1, warehouses: 1, storageMb: 250 } },
      FREE: { limits: { employees: 3, branches: 1, warehouses: 1, storageMb: 100 } },
      STANDARD: { limits: { employees: 15, branches: 3, warehouses: 5, storageMb: 2048 } },
      PRO: { limits: { employees: 50, branches: 10, warehouses: 20, storageMb: 10240 } },
      ENTERPRISE: { limits: { employees: 0, branches: 0, warehouses: 0, storageMb: 0 } },
    },
    modules: Object.fromEntries(PLATFORM_MODULE_KEYS.map((key) => [key, { enabled: true, plans: ["TRIAL", "FREE", "STANDARD", "PRO", "ENTERPRISE"] }])),
    broadcasts: [],
    supportTickets: [],
    audit: [],
    featureFlags: { workforceMap: true, debtAging: true, platformBroadcasts: true },
    updatedAt: now(),
  };
}

function seedDirectory() {
  return {
    version: 2,
    platformSettings: defaultPlatformSettings(),
    companies: [
      {
        id: DEFAULT_COMPANY_ID,
        name: "Qulay namunaviy kompaniya",
        ownerUserId: "auth-owner-demo",
        status: "ACTIVE",
        plan: "PRO",
        moduleOverrides: {},
        createdAt: now(),
      },
    ],
    sessions: [],
    users: [
      {
        id: "auth-super-admin",
        companyId: null,
        name: "Qulay administratori",
        title: "Platforma egasi",
        phone: "+998900000001",
        password: "QulayAdmin!2026",
        roles: ["SUPER_ADMIN"],
        primaryRole: "SUPER_ADMIN",
        status: "ACTIVE",
        mustChangePassword: false,
        createdAt: now(),
      },
      {
        id: "auth-owner-demo",
        companyId: DEFAULT_COMPANY_ID,
        name: "Biznes egasi",
        title: "Ega",
        phone: "+998901111111",
        password: "Qulay123!",
        roles: ["OWNER"],
        primaryRole: "OWNER",
        status: "ACTIVE",
        mustChangePassword: false,
        createdAt: now(),
      },
    ],
  };
}

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureDirectory() {
  const current = safeRead(DIRECTORY_KEY, null);
  if (!current?.users || !current?.companies) {
    const seeded = seedDirectory();
    safeWrite(DIRECTORY_KEY, seeded);
    return seeded;
  }

  let changed = false;
  if (!current.platformSettings) { current.platformSettings = defaultPlatformSettings(); changed = true; }
  if (!current.platformSettings.modules) { current.platformSettings.modules = defaultPlatformSettings().modules; changed = true; }
  if (!current.platformSettings.plans) { current.platformSettings.plans = defaultPlatformSettings().plans; changed = true; }
  if (!Array.isArray(current.platformSettings.supportTickets)) { current.platformSettings.supportTickets = []; changed = true; }
  if (!Array.isArray(current.sessions)) { current.sessions = []; changed = true; }
  const loginRoles = new Set(["SUPER_ADMIN", "OWNER", "ADMIN"]);
  const loginUsers = current.users.filter((user) => (user.roles || []).some((role) => loginRoles.has(role)));
  if (loginUsers.length !== current.users.length) { current.users = loginUsers; changed = true; }
  PLATFORM_MODULE_KEYS.forEach((key) => {
    if (!current.platformSettings.modules[key]) { current.platformSettings.modules[key] = { enabled: true, plans: ["TRIAL", "FREE", "STANDARD", "PRO", "ENTERPRISE"] }; changed = true; }
  });
  current.companies = current.companies.map((company) => company.moduleOverrides ? company : { ...company, moduleOverrides: {} });
  if (current.version !== 2) { current.version = 2; changed = true; }
  if (changed) safeWrite(DIRECTORY_KEY, current);
  return current;
}

function writeDirectory(directory) {
  safeWrite(DIRECTORY_KEY, directory);
  dispatchAuthChange();
  return directory;
}

export function getAuthDirectory() {
  return ensureDirectory();
}

export function getAuthSession() {
  return safeRead(SESSION_KEY, null);
}

export function getActiveCompanyId() {
  return getAuthSession()?.companyId || DEFAULT_COMPANY_ID;
}

export function getCurrentAuthUser() {
  const session = getAuthSession();
  if (!session?.userId) return null;
  return ensureDirectory().users.find((user) => user.id === session.userId) || null;
}

export function getCompanyById(companyId) {
  return ensureDirectory().companies.find((company) => company.id === companyId) || null;
}

export function getCompanyUsers(companyId) {
  return ensureDirectory().users.filter((user) => user.companyId === companyId);
}

export function dispatchAuthChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function subscribeAuth(listener) {
  if (typeof window === "undefined") return () => {};
  const handle = () => listener();
  const handleStorage = (event) => {
    if ([SESSION_KEY, DIRECTORY_KEY].includes(event.key)) listener();
  };
  window.addEventListener(AUTH_EVENT, handle);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(AUTH_EVENT, handle);
    window.removeEventListener("storage", handleStorage);
  };
}

function setSessionForUser(user) {
  const sessionId = `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const stamp = now();
  const session = {
    sessionId,
    userId: user.id,
    companyId: user.companyId || null,
    roles: user.roles || [user.primaryRole].filter(Boolean),
    primaryRole: user.primaryRole || user.roles?.[0] || "",
    loggedInAt: stamp,
  };
  safeWrite(SESSION_KEY, session);
  const directory = ensureDirectory();
  if (!Array.isArray(directory.sessions)) directory.sessions = [];
  directory.sessions.unshift({
    id: sessionId,
    userId: user.id,
    companyId: user.companyId || null,
    device: typeof navigator !== "undefined" ? navigator.platform || "Brauzer" : "Brauzer",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
    status: "ACTIVE",
    loggedInAt: stamp,
    lastActivityAt: stamp,
  });
  directory.sessions = directory.sessions.slice(0, 250);
  safeWrite(DIRECTORY_KEY, directory);
  dispatchAuthChange();
  return session;
}

export function loginWithPhone(phone, password) {
  const normalized = normalizePhone(phone);
  const directory = ensureDirectory();
  const user = directory.users.find((item) => normalizePhone(item.phone) === normalized);

  if (!user || user.password !== password) {
    throw new Error("Telefon raqami yoki parol noto‘g‘ri.");
  }
  if (user.status !== "ACTIVE") {
    throw new Error("Bu hisob faolsizlantirilgan. Qulay administratoriga murojaat qiling.");
  }
  if (directory.platformSettings?.maintenanceMode && !user.roles?.includes("SUPER_ADMIN")) {
    throw new Error("Qulayda texnik xizmat ketmoqda. Birozdan so‘ng qayta urinib ko‘ring.");
  }
  if (!user.roles?.some((role) => ["OWNER", "ADMIN", "SUPER_ADMIN"].includes(role))) {
    throw new Error("Qulayning ushbu versiyasida platformaga faqat Owner yoki Admin kiradi.");
  }
  if (user.companyId) {
    const company = directory.companies.find((item) => item.id === user.companyId);
    if (company?.status && company.status !== "ACTIVE") {
      throw new Error("Kompaniya vaqtincha bloklangan. Qulay administratoriga murojaat qiling.");
    }
  }

  const loginAt = now();
  directory.users = directory.users.map((item) => item.id === user.id ? { ...item, lastLoginAt: loginAt } : item);
  writeDirectory(directory);
  const session = setSessionForUser({ ...user, lastLoginAt: loginAt });
  return { user: { ...user, lastLoginAt: loginAt }, session };
}

export function logoutAuth() {
  const active = getAuthSession();
  if (active?.sessionId) {
    const directory = ensureDirectory();
    const session = (directory.sessions || []).find((item) => item.id === active.sessionId);
    if (session) { session.status = "ENDED"; session.endedAt = now(); session.lastActivityAt = now(); }
    safeWrite(DIRECTORY_KEY, directory);
  }
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  dispatchAuthChange();
}

export function createOwnerAccount({ name, phone, password, companyName, title = "Biznes egasi" }) {
  const directory = ensureDirectory();
  if (directory.platformSettings?.signupEnabled === false) {
    throw new Error("Yangi kompaniya ro‘yxatdan o‘tishi vaqtincha yopilgan.");
  }
  if (directory.platformSettings?.maintenanceMode) {
    throw new Error("Qulayda texnik xizmat ketmoqda. Birozdan so‘ng qayta urinib ko‘ring.");
  }
  const normalized = normalizePhone(phone);
  if (directory.users.some((user) => normalizePhone(user.phone) === normalized)) {
    throw new Error("Bu telefon raqami bilan hisob allaqachon mavjud.");
  }

  const stamp = Date.now().toString(36);
  const platformSettings = directory.platformSettings || defaultPlatformSettings();
  const trialDays = Math.max(1, Number(platformSettings.defaultTrialDays || 14));
  const company = {
    id: `cmp-${stamp}`,
    name: companyName.trim(),
    ownerUserId: `auth-owner-${stamp}`,
    status: "ACTIVE",
    plan: platformSettings.defaultPlan || "TRIAL",
    moduleOverrides: {},
    trialEndsAt: new Date(Date.now() + trialDays * 86400000).toISOString(),
    createdAt: now(),
  };
  const user = {
    id: company.ownerUserId,
    companyId: company.id,
    name: name.trim(),
    title,
    phone: normalized,
    password,
    roles: ["OWNER"],
    primaryRole: "OWNER",
    status: "ACTIVE",
    mustChangePassword: false,
    createdAt: now(),
  };
  directory.companies.push(company);
  directory.users.push(user);
  writeDirectory(directory);
  const session = setSessionForUser(user);
  return { company, user, session };
}

export function updateAuthUser(userId, patch) {
  const directory = ensureDirectory();
  let updated = null;
  directory.users = directory.users.map((user) => {
    if (user.id !== userId) return user;
    updated = {
      ...user,
      ...patch,
      roles: patch.roles?.length ? patch.roles : user.roles,
      primaryRole: patch.primaryRole || patch.roles?.[0] || user.primaryRole,
      updatedAt: now(),
    };
    return updated;
  });
  writeDirectory(directory);
  return updated;
}

export function setAuthUserStatus(userId, status) {
  return updateAuthUser(userId, { status });
}

export function changeOwnPassword(currentPassword, newPassword) {
  const current = getCurrentAuthUser();
  if (!current) throw new Error("Faol sessiya topilmadi.");
  if (current.password !== currentPassword) throw new Error("Joriy parol noto‘g‘ri.");
  if (String(newPassword).length < 6) throw new Error("Yangi parol kamida 6 belgidan iborat bo‘lsin.");
  return updateAuthUser(current.id, { password: newPassword, mustChangePassword: false });
}

export function resetAuthUserPassword(userId, newPassword) {
  if (String(newPassword).length < 6) throw new Error("Yangi parol kamida 6 belgidan iborat bo‘lsin.");
  return updateAuthUser(userId, { password: newPassword, mustChangePassword: true });
}

export function updateCompany(companyId, patch) {
  const directory = ensureDirectory();
  let updated = null;
  directory.companies = directory.companies.map((company) => {
    if (company.id !== companyId) return company;
    updated = { ...company, ...patch, updatedAt: now() };
    return updated;
  });
  writeDirectory(directory);
  return updated;
}

export function getPlatformSettings() {
  return ensureDirectory().platformSettings || defaultPlatformSettings();
}

function patchCompanyLocalModules(companyId, moduleKey, enabled) {
  if (typeof window === "undefined") return;
  const key = `qulay.prototype.db.v5.company.${companyId}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const db = JSON.parse(raw);
    if (!db.settings) db.settings = {};
    if (!db.settings.modules) db.settings.modules = {};
    db.settings.modules[moduleKey] = Boolean(enabled);
    window.localStorage.setItem(key, JSON.stringify(db));
    window.dispatchEvent(new CustomEvent("qulay:local-db-change"));
  } catch { /* prototip local storage xatosi global adminni bloklamaydi */ }
}

export function updatePlatformSettings(patch) {
  const directory = ensureDirectory();
  directory.platformSettings = {
    ...directory.platformSettings,
    ...patch,
    updatedAt: now(),
  };
  writeDirectory(directory);
  return directory.platformSettings;
}

export function setGlobalModuleEnabled(moduleKey, enabled) {
  if (!PLATFORM_MODULE_KEYS.includes(moduleKey)) throw new Error("Noma’lum modul.");
  const directory = ensureDirectory();
  const current = directory.platformSettings.modules[moduleKey] || { plans: ["TRIAL", "FREE", "STANDARD", "PRO", "ENTERPRISE"] };
  directory.platformSettings.modules[moduleKey] = { ...current, enabled: Boolean(enabled) };
  directory.companies.forEach((company) => {
    const override = company.moduleOverrides?.[moduleKey];
    const allowedByPlan = !directory.platformSettings.modules[moduleKey]?.plans?.length
      || directory.platformSettings.modules[moduleKey].plans.includes(company.plan || "TRIAL");
    const effective = Boolean(enabled) && allowedByPlan && (override === undefined ? true : Boolean(override));
    patchCompanyLocalModules(company.id, moduleKey, effective);
  });
  directory.platformSettings.audit.unshift?.({ id: `pa-${Date.now()}`, type: "MODULE_GLOBAL", moduleKey, enabled: Boolean(enabled), createdAt: now() });
  writeDirectory(directory);
  return directory.platformSettings.modules[moduleKey];
}

export function setCompanyModuleEnabled(companyId, moduleKey, enabled) {
  if (!PLATFORM_MODULE_KEYS.includes(moduleKey)) throw new Error("Noma’lum modul.");
  const directory = ensureDirectory();
  const company = directory.companies.find((item) => item.id === companyId);
  if (!company) throw new Error("Kompaniya topilmadi.");
  company.moduleOverrides = { ...(company.moduleOverrides || {}), [moduleKey]: Boolean(enabled) };
  const moduleSetting = directory.platformSettings.modules?.[moduleKey] || {};
  const globalEnabled = moduleSetting.enabled !== false;
  const allowedByPlan = !moduleSetting.plans?.length || moduleSetting.plans.includes(company.plan || "TRIAL");
  patchCompanyLocalModules(companyId, moduleKey, Boolean(enabled) && globalEnabled && allowedByPlan);
  directory.platformSettings.audit.unshift?.({ id: `pa-${Date.now()}`, type: "MODULE_COMPANY", companyId, moduleKey, enabled: Boolean(enabled), createdAt: now() });
  writeDirectory(directory);
  return company;
}

function getEffectiveCompanyModulesFromDirectory(directory, companyId) {
  const company = directory.companies.find((item) => item.id === companyId);
  const modules = directory.platformSettings.modules || {};
  return Object.fromEntries(PLATFORM_MODULE_KEYS.map((key) => {
    const globalEnabled = modules[key]?.enabled !== false;
    const allowedByPlan = !modules[key]?.plans?.length || modules[key].plans.includes(company?.plan || "TRIAL");
    const override = company?.moduleOverrides?.[key];
    return [key, (override === undefined ? true : Boolean(override)) && globalEnabled && allowedByPlan];
  }));
}

export function getCompanyPlanLimits(companyId) {
  const directory = ensureDirectory();
  const company = directory.companies.find((item) => item.id === companyId);
  return directory.platformSettings?.plans?.[company?.plan || "TRIAL"]?.limits || {};
}

export function getEffectiveCompanyModules(companyId) {
  return getEffectiveCompanyModulesFromDirectory(ensureDirectory(), companyId);
}

export function updatePlanConfig(planKey, patch) {
  const directory = ensureDirectory();
  const current = directory.platformSettings.plans?.[planKey] || { limits: {} };
  directory.platformSettings.plans = { ...(directory.platformSettings.plans || {}), [planKey]: { ...current, ...patch, limits: { ...(current.limits || {}), ...(patch.limits || {}) } } };
  directory.platformSettings.audit.unshift?.({ id: `pa-${Date.now()}`, type: "PLAN_UPDATED", plan: planKey, createdAt: now() });
  writeDirectory(directory);
  return directory.platformSettings.plans[planKey];
}

export function setModulePlans(moduleKey, plans) {
  if (!PLATFORM_MODULE_KEYS.includes(moduleKey)) throw new Error("Noma’lum modul.");
  const directory = ensureDirectory();
  const current = directory.platformSettings.modules[moduleKey] || { enabled: true };
  directory.platformSettings.modules[moduleKey] = { ...current, plans: [...new Set(plans)] };
  directory.companies.forEach((company) => {
    patchCompanyLocalModules(company.id, moduleKey, getEffectiveCompanyModulesFromDirectory(directory, company.id)[moduleKey]);
  });
  directory.platformSettings.audit.unshift?.({ id: `pa-${Date.now()}`, type: "MODULE_PLANS", moduleKey, plans: [...new Set(plans)], createdAt: now() });
  writeDirectory(directory);
  return directory.platformSettings.modules[moduleKey];
}

export function addSupportTicket({ companyId, subject, description = "", priority = "NORMAL" }) {
  const directory = ensureDirectory();
  const ticket = { id: `support-${Date.now()}`, companyId, subject: String(subject || "").trim(), description: String(description || "").trim(), priority, status: "OPEN", createdAt: now(), updatedAt: now() };
  directory.platformSettings.supportTickets.unshift(ticket);
  writeDirectory(directory);
  return ticket;
}

export function updateSupportTicket(ticketId, patch) {
  const directory = ensureDirectory();
  const ticket = directory.platformSettings.supportTickets.find((item) => item.id === ticketId);
  if (!ticket) throw new Error("Support murojaati topilmadi.");
  Object.assign(ticket, patch, { updatedAt: now() });
  writeDirectory(directory);
  return ticket;
}

export function addPlatformBroadcast({ title, message, audience = "ALL" }) {
  const directory = ensureDirectory();
  if (!Array.isArray(directory.platformSettings.broadcasts)) directory.platformSettings.broadcasts = [];
  const item = { id: `broadcast-${Date.now()}`, title: String(title || "").trim(), message: String(message || "").trim(), audience, createdAt: now(), status: "PUBLISHED" };
  directory.platformSettings.broadcasts.unshift(item);
  writeDirectory(directory);
  return item;
}

export function getUserSessions(userId) {
  return (ensureDirectory().sessions || []).filter((session) => session.userId === userId);
}

export function revokeUserSessions(userId) {
  const directory = ensureDirectory();
  const stamp = now();
  (directory.sessions || []).forEach((session) => {
    if (session.userId === userId && session.status === "ACTIVE") {
      session.status = "REVOKED";
      session.endedAt = stamp;
      session.lastActivityAt = stamp;
    }
  });
  const active = getAuthSession();
  if (active?.userId === userId && typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  writeDirectory(directory);
  return true;
}

export function getHomePathForUser(user) {
  if (!user) return "/login";
  if (user.roles?.includes("SUPER_ADMIN")) return "/super-admin";
  if (user.roles?.some((role) => ["OWNER", "ADMIN"].includes(role))) return "/dashboard";
  return "/login";
}

export { AUTH_EVENT, DEFAULT_COMPANY_ID, DIRECTORY_KEY, PLATFORM_MODULE_KEYS, SESSION_KEY };

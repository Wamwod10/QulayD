import { baseApi, clearSession, saveSession } from "./baseApi";
import { store } from "../app/store";
import { STORAGE_KEYS } from "../constants/storageKeys";

const SESSION_KEY = STORAGE_KEYS.accessToken;
const AUTH_EVENT = "qulay:auth-change";
const DEFAULT_COMPANY_ID = "";
const PLATFORM_MODULE_KEYS = ["dashboard", "sales", "pos", "inventory", "partners", "agents", "routes", "fulfillment", "delivery", "finance", "reports", "settings"];

let currentUser = null;
let currentCompany = null;
let authReady = typeof window === "undefined" || !window.localStorage.getItem(STORAGE_KEYS.accessToken);
let restorePromise = null;

function deviceContext() {
  if (typeof window === "undefined") return { deviceId: "server-render", deviceName: "Server" };
  const key = "qulay.deviceId";
  let deviceId = window.localStorage.getItem(key);
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || `browser-${Date.now()}`;
    window.localStorage.setItem(key, deviceId);
  }
  return { deviceId, deviceName: navigator.platform || "Browser" };
}

function apiError(error, fallback) {
  const payload = error?.data || error;
  const status = Number(error?.status || payload?.status);
  const safeStatusMessage = {
    400: "So‘rov ma’lumotlarini tekshiring.",
    401: "Sessiya tugagan yoki tizimga kirish kerak.",
    403: "Bu amal uchun ruxsatingiz yo‘q.",
    404: "So‘ralgan ma’lumot topilmadi.",
    409: "Ma’lumot boshqa amal bilan to‘qnashdi. Qayta urinib ko‘ring.",
    422: "Kiritilgan ma’lumotlarni tekshiring.",
    429: "Juda ko‘p so‘rov yuborildi. Biroz kutib qayta urinib ko‘ring.",
    503: "Xizmat vaqtincha ishlamayapti. Qayta urinib ko‘ring.",
  }[status];
  const message = payload?.message || payload?.error?.message || safeStatusMessage || fallback;
  const result = new Error(message || "Server request failed");
  result.status = status || undefined;
  result.details = payload?.details || payload?.error?.details;
  result.fieldErrors = result.details?.fields || [];
  return result;
}

async function run(endpoint, input, fallback) {
  try { return await store.dispatch(endpoint.initiate(input)).unwrap(); }
  catch (error) { throw apiError(error, fallback); }
}

export async function apiRequest({ url, method = "POST", body, params }) {
  return run(baseApi.endpoints.request, { url, method, body, params }, "Amalni bajarib bo‘lmadi.");
}

function acceptAuth(result) {
  saveSession(result);
  currentUser = result.user;
  currentCompany = result.user?.company || null;
  authReady = true;
  dispatchAuthChange();
  return { user: currentUser, company: currentCompany, session: getAuthSession() };
}

export function getAuthSession() {
  if (!currentUser) return null;
  return { userId: currentUser.id, companyId: currentUser.companyId, roles: currentUser.roles, primaryRole: currentUser.primaryRole };
}
export function getActiveCompanyId() {
  return currentUser?.companyId || (typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEYS.selectedCompanyId) : null) || "";
}
export function getCurrentAuthUser() { return currentUser; }
export function getCompanyById(companyId) { return currentCompany?.id === companyId ? currentCompany : null; }
export function getCompanyUsers() { return currentUser ? [currentUser] : []; }
export function isAuthReady() { return authReady; }
export function dispatchAuthChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}
export function subscribeAuth(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(AUTH_EVENT, listener); window.removeEventListener("storage", listener); };
}

export async function restoreAuthSession() {
  if (restorePromise) return restorePromise;
  if (typeof window === "undefined" || !window.localStorage.getItem(STORAGE_KEYS.accessToken)) {
    authReady = true; dispatchAuthChange(); return null;
  }
  restorePromise = run(baseApi.endpoints.me, undefined, "Sessiyani tiklab bo‘lmadi.")
    .then((user) => {
      currentUser = user; currentCompany = user.company || null; authReady = true; dispatchAuthChange(); return user;
    })
    .catch(() => { clearSession(); currentUser = null; currentCompany = null; authReady = true; dispatchAuthChange(); return null; })
    .finally(() => { restorePromise = null; });
  return restorePromise;
}

export async function loginWithPhone(identifier, password) {
  return acceptAuth(await run(baseApi.endpoints.login, { identifier, password, ...deviceContext() }, "Login yoki parol noto‘g‘ri."));
}
export async function loginWithPin(identifier, pin) {
  return acceptAuth(await run(baseApi.endpoints.pinLogin, { identifier, pin, ...deviceContext() }, "PIN noto‘g‘ri."));
}
export async function createOwnerAccount({ name, phone, email, login, password, companyName }) {
  return acceptAuth(await run(baseApi.endpoints.registerOwner, { name, phone: phone || undefined, email: email || undefined, login: login || undefined, password, companyName, ...deviceContext() }, "Ro‘yxatdan o‘tib bo‘lmadi."));
}
export async function logoutAuth() {
  try { if (currentUser) await run(baseApi.endpoints.logout, undefined, "Chiqib bo‘lmadi."); } finally {
    currentUser = null; currentCompany = null; authReady = true; clearSession(); store.dispatch(baseApi.util.resetApiState()); dispatchAuthChange();
  }
}
export async function changeOwnPassword(currentPassword, newPassword) {
  const result = await run(baseApi.endpoints.changePassword, { currentPassword, newPassword }, "Parolni o‘zgartirib bo‘lmadi.");
  await logoutAuth(); return result;
}
export function forgotPassword(identifier) { return run(baseApi.endpoints.forgotPassword, { identifier }, "So‘rovni yuborib bo‘lmadi."); }
export function resetPassword(token, newPassword) { return run(baseApi.endpoints.resetPassword, { token, newPassword }, "Parolni tiklab bo‘lmadi."); }

export async function createEmployeeAuthUser(payload) { return apiRequest({ url: "/employees", body: payload }); }
export async function updateEmployeeAuthUser(employeeId, patch) { return apiRequest({ url: `/employees/${employeeId}`, method: "PATCH", body: patch }); }
export async function updateAuthUser(userId, patch) { return updateEmployeeAuthUser(userId, patch); }
export async function setAuthUserStatus(userId, status) { return updateEmployeeAuthUser(userId, { status }); }
export async function resetAuthUserPassword(userId, password) { return apiRequest({ url: `/employees/${userId}/reset-password`, body: { password, mustChangePassword: true } }); }
export async function updateCompany(companyId, patch) {
  if (companyId !== getActiveCompanyId()) throw new Error("Kompaniya konteksti mos emas.");
  const company = await apiRequest({ url: "/companies/current", method: "PATCH", body: patch }); currentCompany = company; dispatchAuthChange(); return company;
}

export function getPlatformSettings() { return { signupEnabled: true, maintenanceMode: false, modules: {}, plans: {}, broadcasts: [], supportTickets: [], audit: [] }; }
export function getCompanyPlanLimits() { return {}; }
export function getEffectiveCompanyModules() {
  const allowed = new Set(currentUser?.modules || []);
  return Object.fromEntries(PLATFORM_MODULE_KEYS.map((key) => [key, allowed.has(key)]));
}
function unsupported() { throw new Error("Bu platform-level amal backendda mavjud emas."); }
export const updatePlatformSettings = unsupported;
export const setGlobalModuleEnabled = unsupported;
export const setCompanyModuleEnabled = unsupported;
export const updatePlanConfig = unsupported;
export const setModulePlans = unsupported;
export const addSupportTicket = unsupported;
export const updateSupportTicket = unsupported;
export const addPlatformBroadcast = unsupported;
export async function getUserSessions(userId) { return userId === currentUser?.id ? run(baseApi.endpoints.sessions, undefined, "Sessiyalarni olib bo‘lmadi.") : []; }
export async function revokeUserSessions(userId) {
  if (userId !== currentUser?.id) throw new Error("Faqat o‘z sessiyalaringizni boshqarishingiz mumkin.");
  const sessions = await getUserSessions(userId); await Promise.all(sessions.filter((item) => !item.revokedAt).map((item) => run(baseApi.endpoints.revokeSession, item.id))); return true;
}
export function getHomePathForUser(user) {
  if (!user) return "/login";
  const first = (user.modules || []).find((key) => PLATFORM_MODULE_KEYS.includes(key));
  return { dashboard: "/dashboard", sales: "/orders", pos: "/sales/pos", inventory: "/inventory", partners: "/customers", agents: "/agents", routes: "/routes/today", fulfillment: "/fulfillment", delivery: "/deliveries", finance: "/finance", reports: "/reports", settings: "/settings/general" }[first] || "/forbidden";
}

export { AUTH_EVENT, DEFAULT_COMPANY_ID, PLATFORM_MODULE_KEYS, SESSION_KEY };

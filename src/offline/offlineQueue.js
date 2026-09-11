import { getOfflineDb, updateOfflineDb } from "./offlineDatabase";

export function enqueueOfflineAction(action) {
  const item = { id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: "PENDING", attempts: 0, createdAt: new Date().toISOString(), ...action };
  updateOfflineDb((db) => { if (!Array.isArray(db.queue)) db.queue = []; db.queue.push(item); });
  return item;
}
export function getOfflineQueue() { return getOfflineDb().queue || []; }
export function removeOfflineAction(id) { updateOfflineDb((db) => { db.queue = (db.queue || []).filter((item) => item.id !== id); }); }
export function patchOfflineAction(id, patch) { updateOfflineDb((db) => { const item = (db.queue || []).find((row) => row.id === id); if (item) Object.assign(item, patch, { updatedAt: new Date().toISOString() }); }); }

import { getOfflineQueue, patchOfflineAction, removeOfflineAction } from "./offlineQueue";

let syncing = false;
export async function syncOfflineQueue(handler) {
  if (syncing || typeof handler !== "function" || (typeof navigator !== "undefined" && !navigator.onLine)) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0; let failed = 0;
  try {
    for (const item of getOfflineQueue()) {
      try { patchOfflineAction(item.id, { status: "SYNCING", attempts: Number(item.attempts || 0) + 1 }); await handler(item); removeOfflineAction(item.id); synced += 1; }
      catch (error) { patchOfflineAction(item.id, { status: "FAILED", lastError: error?.message || "Sync error" }); failed += 1; }
    }
  } finally { syncing = false; }
  return { synced, failed };
}
export function installOnlineSync(handler) { const listener = () => syncOfflineQueue(handler); window.addEventListener("online", listener); return () => window.removeEventListener("online", listener); }

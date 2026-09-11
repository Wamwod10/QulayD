import { makeId } from "./localDb";

export function ensureWorkflowCollections(db) {
  if (!Array.isArray(db.workflowNotifications)) db.workflowNotifications = [];
  if (!Array.isArray(db.activityLog)) db.activityLog = [];
}

export function addActivity(db, {
  entityType,
  entityId,
  action,
  title,
  description = "",
  actorId = "system",
  actorName = "Tizim",
  metadata = {},
}) {
  ensureWorkflowCollections(db);
  const entry = {
    id: makeId("act"),
    entityType,
    entityId,
    action,
    title,
    description,
    actorId,
    actorName,
    metadata,
    createdAt: new Date().toISOString(),
  };
  db.activityLog.unshift(entry);
  return entry;
}

export function addWorkflowNotification(db, {
  userId = "",
  role = "",
  title,
  message = "",
  type = "INFO",
  referenceType = "",
  referenceId = "",
  actionPath = "",
  createdByUserId = "",
  createdByName = "",
}) {
  ensureWorkflowCollections(db);
  const notification = {
    id: makeId("ntf"),
    userId,
    role,
    title,
    message,
    type,
    referenceType,
    referenceId,
    actionPath,
    createdByUserId,
    createdByName,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.workflowNotifications.unshift(notification);
  return notification;
}

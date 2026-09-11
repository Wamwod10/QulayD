import { CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { updateLocalDb, useLocalDb } from "../../../services/localDb";
import { useAuth } from "../../../hooks/useAuth";
import NotificationItem from "./NotificationItem";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { usePermissions } from "../../../hooks/usePermissions";
import { getRouteModule, getRoutePermission } from "../../../app/navigationConfig";

function NotificationDropdown({ limit = 6, onClose }) {
  const { user } = useAuth();
  const { isEnabled } = useModuleAccess();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const notifications = useLocalDb((db) => (db.workflowNotifications || []).filter((item) => (!item.userId || item.userId === user?.id) && (!item.actionPath || (isEnabled(getRouteModule(item.actionPath)) && can(getRoutePermission(item.actionPath))))).slice(0, limit));
  const markRead = (item) => updateLocalDb((db) => { const row = db.workflowNotifications.find((entry) => entry.id === item.id); if (row) row.read = true; });
  const markAll = () => updateLocalDb((db) => db.workflowNotifications.forEach((item) => { if (!item.userId || item.userId === user?.id) item.read = true; }));
  const open = (item) => { if (item.actionPath) navigate(item.actionPath); onClose?.(); };
  return <div className="qp-notification-dropdown"><div className="qp-notification-dropdown-head"><div><span>Bildirishnomalar</span><strong>{notifications.filter((item) => !item.read).length} o‘qilmagan</strong></div><button type="button" onClick={markAll}><CheckCheck size={15}/> Hammasini o‘qish</button></div><div className="qp-notification-dropdown-list">{notifications.length ? notifications.map((item) => <NotificationItem key={item.id} item={item} onRead={markRead} onOpen={open}/>) : <div className="qp-role-empty">Yangi bildirishnoma yo‘q.</div>}</div></div>;
}
export default NotificationDropdown;

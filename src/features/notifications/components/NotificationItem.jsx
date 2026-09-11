import { Bell, CheckCircle2, CircleAlert, Info } from "lucide-react";

import { formatDateTime } from "../../../utils/formatters";

const icons = { SUCCESS: CheckCircle2, WARNING: CircleAlert, INFO: Info };

function NotificationItem({ item, onOpen, onRead }) {
  const Icon = icons[item.type] || Bell;
  return <button type="button" className={`qp-notification-item ${item.read ? "read" : "unread"}`} onClick={() => { onRead?.(item); onOpen?.(item); }}>
    <span className="qp-notification-item-icon"><Icon size={16}/></span>
    <span className="qp-notification-item-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{item.createdAt ? formatDateTime(item.createdAt) : ""}</small></span>
    {!item.read ? <i aria-label="O‘qilmagan"/> : null}
  </button>;
}
export default NotificationItem;

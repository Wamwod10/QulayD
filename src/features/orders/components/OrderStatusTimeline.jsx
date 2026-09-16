import { CheckCircle2, Clock3, PackageCheck, ShoppingCart, Truck } from "lucide-react";

import { formatRelativeDateTime } from "../../../utils/formatters";

function state(done, active, failed = false) {
  if (failed) return "failed";
  if (done) return "done";
  if (active) return "active";
  return "pending";
}

// eslint-disable-next-line react-refresh/only-export-components
export function getOrderLifecycleStages(order = {}) {
  const preparing = ["RESERVED", "PICKING", "PICKED", "PACKING", "PACKED", "FULFILLED"].includes(order.fulfillmentStatus);
  const prepared = ["FULFILLED"].includes(order.fulfillmentStatus);
  const delivering = ["PLANNED", "OUT_FOR_DELIVERY", "ARRIVED", "PARTIALLY_DELIVERED", "DELIVERED"].includes(order.deliveryStatus);
  const delivered = ["DELIVERED"].includes(order.deliveryStatus);
  const problem = order.deliveryStatus === "FAILED" || order.status === "CANCELLED";
  return [
    { key: "new", label: "Yangi", detail: "Buyurtma yaratildi", status: state(true, false), time: order.createdAt, icon: ShoppingCart },
    { key: "preparing", label: "Tayyorlanmoqda", detail: prepared ? "Tayyor" : preparing ? "Ombor jarayonida" : "Tayyorlash kutilmoqda", status: state(prepared, preparing && !prepared), time: order.confirmedAt || order.updatedAt, icon: PackageCheck },
    { key: "delivery", label: "Yetkazilmoqda", detail: delivered ? "Yetkazildi" : delivering ? "Reysda" : "Yetkazish kutilmoqda", status: state(delivered, delivering && !delivered, problem), time: order.deliveryStartedAt || order.updatedAt, icon: Truck },
    { key: "done", label: "Yakunlandi", detail: delivered ? "Jarayon yopildi" : problem ? "Muammoli" : "Kutilmoqda", status: state(delivered, false, problem), time: order.deliveredAt, icon: CheckCircle2 },
  ];
}

function OrderStatusTimeline({ order, compact = false }) {
  const stages = getOrderLifecycleStages(order);
  return <div className={`qp-order-status-timeline ${compact ? "compact" : ""}`}>{stages.map((stage, index) => {
    const Icon = stage.icon;
    return <div className={`qp-order-stage ${stage.status}`} key={stage.key}><div className="qp-order-stage-rail"><span>{stage.status === "done" ? <CheckCircle2 size={16}/> : stage.status === "active" ? <Clock3 size={16}/> : <Icon size={16}/>}</span>{index < stages.length - 1 ? <i/> : null}</div><div className="qp-order-stage-copy"><strong>{stage.label}</strong><span>{stage.detail}</span>{stage.time ? <small>{formatRelativeDateTime(stage.time)}</small> : null}</div></div>;
  })}</div>;
}
export default OrderStatusTimeline;

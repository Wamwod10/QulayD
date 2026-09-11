import { CheckCircle2, Clock3, MapPin, Navigation, Route, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import NavigationAppModal from "../../../components/maps/NavigationAppModal";
import YandexMap from "../../../components/maps/YandexMap";
import { PageShell, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { getName } from "../../../utils/formatters";

function RoutesMapPage() {
  const db = useLocalDb();
  const today = new Date().toISOString().slice(0, 10);
  const plans = useMemo(() => db.routePlans.filter((plan) => plan.date === today || !plan.date), [db.routePlans, today]);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || db.routePlans[0]?.id || null);
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const selectedPlan = db.routePlans.find((plan) => plan.id === selectedPlanId) || plans[0] || db.routePlans[0];
  const agent = db.agents.find((item) => item.id === selectedPlan?.agentId);
  const warehouse = db.warehouses.find((item) => item.id === (selectedPlan?.warehouseId || db.settings.company.defaultWarehouseId)) || db.warehouses[0];

  const stops = (selectedPlan?.stops || []).map((stop, index) => {
    const customer = db.customers.find((item) => item.id === stop.customerId);
    return {
      ...stop,
      index,
      id: `${selectedPlan?.id || "route"}-${index}`,
      customer,
      title: customer?.name || `Nuqta ${index + 1}`,
      latitude: customer?.latitude,
      longitude: customer?.longitude,
      shortLabel: String(index + 1),
      description: customer?.address || customer?.territory || "Mijoz manzili",
    };
  });

  const routePoints = [
    ...(warehouse?.latitude && warehouse?.longitude ? [{ id: warehouse.id, latitude: warehouse.latitude, longitude: warehouse.longitude, title: warehouse.name, shortLabel: "O" }] : []),
    ...stops.filter((stop) => stop.latitude && stop.longitude),
  ];
  const selectedStop = stops[selectedStopIndex] || stops[0];
  const completed = stops.filter((stop) => ["DONE", "COMPLETED", "VISITED"].includes(stop.status)).length;
  const progress = stops.length ? Math.round((completed / stops.length) * 100) : 0;
  const activePlans = plans.filter((plan) => !["COMPLETED", "CANCELLED"].includes(plan.status)).length;

  return <>
    <PageShell title="Bugungi marshrutlar" description="Agentlarning kunlik yo‘nalishlari, mijoz nuqtalari va bajarilish holatini Yandex xaritada boshqaring." eyebrow="Marshrutlar" actions={<PrimaryButton type="button" onClick={() => window.location.assign("/routes/plans")}>Marshrut rejalari</PrimaryButton>}>
      <div className="qp-agent-kpis qp-route-kpis">
        <div><span>Bugungi marshrutlar</span><strong>{plans.length}</strong><small>{activePlans} tasi jarayonda</small></div>
        <div><span>Jami nuqtalar</span><strong>{plans.reduce((sum, plan) => sum + (plan.stops?.length || 0), 0)}</strong><small>Mijoz tashrif nuqtalari</small></div>
        <div><span>Bajarilgan</span><strong>{plans.reduce((sum, plan) => sum + (plan.stops || []).filter((stop) => ["DONE", "COMPLETED", "VISITED"].includes(stop.status)).length, 0)}</strong><small>Bugungi tashriflar</small></div>
        <div><span>Tanlangan marshrut</span><strong>{progress}%</strong><small>{completed}/{stops.length} stop bajarildi</small></div>
      </div>

      <div className="qp-route-selector">{(plans.length ? plans : db.routePlans).map((plan) => <button key={plan.id} type="button" className={plan.id === selectedPlan?.id ? "active" : ""} onClick={() => { setSelectedPlanId(plan.id); setSelectedStopIndex(0); }}><Route size={15} /><span><strong>{plan.name || plan.number || "Marshrut"}</strong><small>{getName(db.agents, plan.agentId)}</small></span><StatusPill status={plan.status} /></button>)}</div>

      <div className="qp-map-workspace qp-route-workspace">
        <div className="qp-map-workspace-map"><YandexMap points={routePoints} routePoints={routePoints} selectedId={selectedStop?.id} onPointClick={(point) => {
          const index = stops.findIndex((stop) => stop.id === point.id);
          if (index >= 0) setSelectedStopIndex(index);
        }} height={590} /></div>
        <aside className="qp-map-side-panel qp-route-side">
          <div className="qp-map-side-head"><div><span>Tanlangan marshrut</span><h2>{selectedPlan?.name || "Marshrut tanlanmagan"}</h2></div><StatusPill status={selectedPlan?.status || "PLANNED"} /></div>
          <div className="qp-route-summary-card"><div><UserRound size={15} /><span>Agent</span><strong>{agent?.name || "—"}</strong></div><div><MapPin size={15} /><span>Nuqtalar</span><strong>{stops.length}</strong></div><div><CheckCircle2 size={15} /><span>Bajarildi</span><strong>{completed}</strong></div><div><Clock3 size={15} /><span>Jarayon</span><strong>{progress}%</strong></div></div>
          <div className="qp-route-progress"><span><i style={{ width: `${progress}%` }} /></span></div>
          <div className="qp-route-stop-list">{stops.map((stop, index) => <button key={stop.id} type="button" className={`${index === selectedStopIndex ? "active" : ""} ${["DONE", "COMPLETED", "VISITED"].includes(stop.status) ? "done" : ""}`} onClick={() => setSelectedStopIndex(index)}><span className="qp-route-stop-number">{["DONE", "COMPLETED", "VISITED"].includes(stop.status) ? <CheckCircle2 size={15} /> : index + 1}</span><div><strong>{stop.title}</strong><small>{stop.description}</small></div><StatusPill status={stop.status || "PENDING"} /></button>)}</div>
          {selectedStop?.customer ? <div className="qp-selected-map-card qp-route-current-stop"><div className="qp-selected-map-title"><div><strong>{selectedStop.customer.name}</strong><span>{selectedStop.customer.address || selectedStop.customer.phone || "Mijoz"}</span></div></div><div className="qp-inline-actions qp-selected-map-actions"><SecondaryButton type="button" onClick={() => setNavigationTarget({ ...selectedStop.customer, title: selectedStop.customer.name })}><Navigation size={14} /> Navigatsiyada ochish</SecondaryButton>{selectedStop.customer.phone ? <a className="qp-button qp-button-secondary" href={`tel:${selectedStop.customer.phone}`}>Qo‘ng‘iroq</a> : null}</div></div> : null}
        </aside>
      </div>
    </PageShell>
    <NavigationAppModal open={Boolean(navigationTarget)} destination={navigationTarget} origin={warehouse} onClose={() => setNavigationTarget(null)} />
  </>;
}
export default RoutesMapPage;

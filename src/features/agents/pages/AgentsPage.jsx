import { Activity, Navigation, Phone, Plus, Route, ShoppingBag, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import NavigationAppModal from "../../../components/maps/NavigationAppModal";
import LocationPicker from "../../../components/maps/LocationPicker";
import YandexMap from "../../../components/maps/YandexMap";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import Select from "../../../components/ui/Select";
import { Field, Modal, PageShell, PrimaryButton, SecondaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import { useAuth } from "../../../hooks/useAuth";
import { usePlatformFeatureFlag } from "../../../hooks/usePlatformSettings";
import { createEmployeeIdentity } from "../../../services/employeeService";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";

function AgentsPage() {
  const db = useLocalDb();
  const { company } = useAuth();
  const workforceMapEnabled = usePlatformFeatureFlag("workforceMap", true);
  const [open, setOpen] = useState(false);
  const operationalAgents = useMemo(() => getOperationalAgents(db), [db]);
  const [selectedId, setSelectedId] = useState(() => operationalAgents[0]?.id || null);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [form, setForm] = useState({ name: "", title: "Savdo agenti", phone: "", territory: "", branch: "Bosh filial", warehouseId: db.settings.company.defaultWarehouseId || "", baseSalary: 0, kpiBonus: 0, salesBonusPercent: 0, address: "", latitude: null, longitude: null });

  const agents = useMemo(() => operationalAgents.map((agent) => ({
    ...agent,
    plannedVisitsToday: Number(agent.plannedVisitsToday || 0),
    visitsToday: Number(agent.visitsToday || 0),
    ordersToday: Number(agent.ordersToday || 0),
    salesToday: Number(agent.salesToday || 0),
    paymentsToday: Number(agent.paymentsToday || 0),
    progress: Number(agent.plannedVisitsToday || 0) ? Math.round((Number(agent.visitsToday || 0) / Number(agent.plannedVisitsToday)) * 100) : 0,
  })), [operationalAgents]);

  const selected = agents.find((agent) => agent.id === selectedId) || agents[0];
  const activeAgents = agents.filter((agent) => agent.status === "ACTIVE").length;
  const workingAgents = agents.filter((agent) => ["ON_ROUTE", "AT_VISIT", "ACTIVE"].includes(agent.activityStatus || agent.status)).length;
  const visits = agents.reduce((sum, agent) => sum + agent.visitsToday, 0);
  const orders = agents.reduce((sum, agent) => sum + agent.ordersToday, 0);
  const sales = agents.reduce((sum, agent) => sum + agent.salesToday, 0);
  const payments = agents.reduce((sum, agent) => sum + agent.paymentsToday, 0);

  const mapPoints = agents.filter((agent) => Number.isFinite(Number(agent.latitude)) && Number.isFinite(Number(agent.longitude))).map((agent) => ({
    id: agent.id,
    latitude: Number(agent.latitude),
    longitude: Number(agent.longitude),
    title: agent.name,
    description: `${agent.territory || "Hudud belgilanmagan"} · ${agent.visitsToday}/${agent.plannedVisitsToday || 0} tashrif`,
    shortLabel: agent.name.split(" ")[0],
  }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { notify("Agent ismi va telefonini kiriting", "warning"); return; }
    try {
      const employee = createEmployeeIdentity({ companyId: company?.id, ...form, roles: ["SALES_AGENT"], plannedVisitsToday: 10 });
      const created = db.agents.find((item) => item.employeeId === employee.id);
      setForm({ name: "", title: "Savdo agenti", phone: "", territory: "", branch: "Bosh filial", warehouseId: db.settings.company.defaultWarehouseId || "", baseSalary: 0, kpiBonus: 0, salesBonusPercent: 0, address: "", latitude: null, longitude: null });
      setOpen(false);
      setSelectedId(created?.id || null);
      notify("Savdo agenti qo‘shildi");
    } catch (error) {
      notify(error.message, "warning");
    }
  };

  return <>
    <PageShell title="Agentlar" description="Savdo agentlarining joylashuvi, bugungi marshruti, tashriflari, buyurtmalari va to‘lovlarini bitta boshqaruv markazida kuzating." eyebrow="Agentlar" actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Agent qo‘shish</PrimaryButton>}>
      <SummaryGrid>
        <div><span>Faol agentlar</span><strong>{activeAgents}</strong><small>{workingAgents} tasi bugun faol</small></div>
        <div><span>Bugungi tashriflar</span><strong>{visits}</strong><small>{agents.reduce((sum, agent) => sum + agent.plannedVisitsToday, 0)} ta rejalashtirilgan</small></div>
        <div><span>Buyurtmalar</span><strong>{orders}</strong><small>Bugungi agent buyurtmalari</small></div>
        <div><span>Bugungi savdo</span><strong>{formatMoney(sales)}</strong><small>To‘lov: {formatMoney(payments)}</small></div>
      </SummaryGrid>

      {workforceMapEnabled ? <div className="qp-map-workspace qp-agent-map-workspace">
        <div className="qp-map-workspace-map">
          <YandexMap points={mapPoints} selectedId={selected?.id} onPointClick={(point) => setSelectedId(point.id)} height={545} />
        </div>
        <aside className="qp-map-side-panel">
          <div className="qp-map-side-head"><div><span>Jonli holat</span><h2>Agentlar xaritasi</h2></div><StatusPill status="ACTIVE" label={`${workingAgents} faol`} /></div>
          <div className="qp-map-list">{agents.map((agent) => <button type="button" key={agent.id} className={agent.id === selected?.id ? "active" : ""} onClick={() => setSelectedId(agent.id)}>
            <span className={`qp-agent-dot ${(agent.activityStatus || agent.status).toLowerCase()}`} />
            <div><strong>{agent.name}</strong><small>{agent.territory || "Hudud yo‘q"} · {agent.visitsToday}/{agent.plannedVisitsToday || 0} tashrif</small></div>
            <span>{agent.progress}%</span>
          </button>)}</div>

          {selected ? <div className="qp-selected-map-card">
            <div className="qp-selected-map-title"><div><strong>{selected.name}</strong><span>{selected.phone || "Telefon kiritilmagan"}</span></div><StatusPill status={selected.activityStatus || selected.status} /></div>
            <div className="qp-selected-map-grid">
              <div><Route size={15} /><span>Tashrif</span><strong>{selected.visitsToday}/{selected.plannedVisitsToday || 0}</strong></div>
              <div><ShoppingBag size={15} /><span>Buyurtma</span><strong>{selected.ordersToday}</strong></div>
              <div><WalletCards size={15} /><span>Savdo</span><strong>{formatMoney(selected.salesToday)}</strong></div>
              <div><Activity size={15} /><span>To‘lov</span><strong>{formatMoney(selected.paymentsToday)}</strong></div>
            </div>
            <div className="qp-inline-actions qp-selected-map-actions">
              {selected.phone ? <a className="qp-button qp-button-secondary" href={`tel:${selected.phone}`}><Phone size={14} /> Qo‘ng‘iroq</a> : null}
              <SecondaryButton type="button" onClick={() => setNavigationTarget({ ...selected, title: selected.name })}><Navigation size={14} /> Navigatsiya</SecondaryButton>
            </div>
          </div> : null}
        </aside>
      </div> : <div className="qp-inline-warning">Xodimlar xaritasi Super Admin tomonidan vaqtincha o‘chirilgan.</div>}
    </PageShell>

    <SmartTablePage
      title="Agentlar ro‘yxati"
      description="Agentlar bo‘yicha batafsil ko‘rsatkichlar va tezkor tahlil."
      eyebrow="Agentlar"
      rows={agents}
      searchFields={["name", "phone", "territory", "activityStatus"]}
      extraSummary={[]}
      detailRenderer={(row) => <div className="qp-drawer-details"><div className="qp-detail-kpis"><div><span>Tashrif</span><strong>{row.visitsToday}/{row.plannedVisitsToday || 0}</strong></div><div><span>Buyurtma</span><strong>{row.ordersToday}</strong></div><div><span>Savdo</span><strong>{formatMoney(row.salesToday)}</strong></div></div><div className="qp-drawer-detail-row"><span>Hudud</span><strong>{row.territory || "—"}</strong></div><div className="qp-drawer-detail-row"><span>Telefon</span><strong>{row.phone || "—"}</strong></div></div>}
      columns={[
        { key: "name", label: "Agent", render: (row) => <div><strong>{row.name}</strong><div className="qp-muted">{row.phone}</div></div> },
        { key: "territory", label: "Hudud" },
        { key: "activityStatus", label: "Joriy holat", render: (row) => <StatusPill status={row.activityStatus || row.status} /> },
        { key: "visitsToday", label: "Tashrif", render: (row) => <strong>{row.visitsToday}/{row.plannedVisitsToday || 0}</strong> },
        { key: "ordersToday", label: "Buyurtma" },
        { key: "salesToday", label: "Bugungi savdo", render: (row) => <strong>{formatMoney(row.salesToday)}</strong> },
        { key: "paymentsToday", label: "To‘lov", render: (row) => formatMoney(row.paymentsToday) },
      ]}
    />

    <Modal open={open} title="Yangi savdo agenti" description="Agent biznes jarayonlarida mas’ul xodim sifatida qo‘shiladi. Login va parol kerak emas." onClose={() => setOpen(false)} wide><form onSubmit={submit}><div className="qp-form-grid"><Field label="Ism va familiya"><input className="qp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Lavozim"><input className="qp-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Telefon"><input className="qp-input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" /></Field><Field label="Filial"><input className="qp-input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></Field><Field label="Ombor"><Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}><option value="">Biriktirilmagan</option>{db.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field><Field label="Hudud"><input className="qp-input" value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} /></Field><Field label="Bazaviy oylik"><input className="qp-input" type="number" min="0" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} /></Field><Field label="KPI bonusi"><input className="qp-input" type="number" min="0" value={form.kpiBonus} onChange={(e) => setForm({ ...form, kpiBonus: e.target.value })} /></Field><Field label="Savdo bonusi (%)"><input className="qp-input" type="number" min="0" max="100" value={form.salesBonusPercent} onChange={(e) => setForm({ ...form, salesBonusPercent: e.target.value })} /></Field><div className="qp-form-grid-span"><LocationPicker value={form} onChange={(location) => setForm({ ...form, ...location })} /></div></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Agent qo‘shish</PrimaryButton></div></form></Modal>
    <NavigationAppModal open={Boolean(navigationTarget)} destination={navigationTarget} onClose={() => setNavigationTarget(null)} />
  </>;
}
export default AgentsPage;

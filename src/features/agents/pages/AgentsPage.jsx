import { Activity, LoaderCircle, Navigation, Phone, Plus, Route, ShoppingBag, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import NavigationAppModal from "../../../components/maps/NavigationAppModal";
import YandexMap from "../../../components/maps/YandexMap";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import Select from "../../../components/ui/Select";
import { Field, Modal, PageShell, PrimaryButton, SecondaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import { usePlatformFeatureFlag } from "../../../hooks/usePlatformSettings";
import { usePermissions } from "../../../hooks/usePermissions";
import { createEmployeeIdentity } from "../../../services/employeeService";
import { apiRequest } from "../../../services/authService";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";

function AgentsPage() {
  const db = useLocalDb();
  const { isOwner, isAdmin } = usePermissions();
  const canCreateAgent = isOwner || isAdmin;
  const workforceMapEnabled = usePlatformFeatureFlag("workforceMap", true);
  const [open, setOpen] = useState(false);
  const operationalAgents = useMemo(() => getOperationalAgents(db), [db]);
  const [selectedId, setSelectedId] = useState(() => operationalAgents[0]?.id || null);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const activeBranches = (db.branches || []).filter((branch) => branch.status !== "INACTIVE");
  const emptyAgentForm = () => {
    const branchId = activeBranches[0]?.id || "";
    const preferredWarehouse = (db.warehouses || []).find((warehouse) => warehouse.id === db.settings.company.defaultWarehouseId && warehouse.status !== "INACTIVE" && (!branchId || !warehouse.branchId || warehouse.branchId === branchId))
      || (db.warehouses || []).find((warehouse) => warehouse.status !== "INACTIVE" && (!branchId || !warehouse.branchId || warehouse.branchId === branchId));
    return {
      name: "", title: "Savdo agenti", phone: "", login: "", password: "", pin: "",
      branchId, warehouseId: preferredWarehouse?.id || "", baseSalary: 0, kpiBonus: 0, salesBonusPercent: 0,
    };
  };
  const [form, setForm] = useState(() => emptyAgentForm());
  const warehousesForForm = useMemo(() => (db.warehouses || []).filter((warehouse) => warehouse.status !== "INACTIVE" && (!form.branchId || !warehouse.branchId || warehouse.branchId === form.branchId)), [db.warehouses, form.branchId]);

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

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim() || (!form.phone.trim() && !form.login.trim())) { notify("Agent ismi va login yoki telefonini kiriting", "warning"); return; }
    if (!/^\d{4,8}$/.test(form.pin)) { notify("PIN 4–8 ta raqamdan iborat bo‘lsin", "warning"); return; }
    setBusy(true);
    try {
      const employee = await createEmployeeIdentity({
        ...form, role: "SALES_AGENT", moduleAccess: ["agent_workspace", "agents", "routes", "partners", "sales", "finance"],
      });
      const month = new Date().toISOString().slice(0, 7);
      if (Number(form.baseSalary || 0) || Number(form.kpiBonus || 0)) {
        try {
          await apiRequest({ url: "/workforce/kpis", method: "PUT", body: { employeeId: employee.id, month, baseSalary: Number(form.baseSalary || 0),
            target: 100, actual: 0, kpiBonus: Number(form.kpiBonus || 0), salesBonus: 0, penalties: 0 } });
        } catch (salaryError) {
          notify(`Agent yaratildi, lekin KPI/oylik sozlamasi saqlanmadi: ${salaryError.message}`, "warning");
        }
      }
      setForm(emptyAgentForm());
      setOpen(false);
      setSelectedId(employee.id);
      notify("Savdo agenti va uning kirish ma’lumotlari yaratildi");
    } catch (error) {
      notify(error.message, "warning");
    } finally { setBusy(false); }
  };

  return <>
    <PageShell title="Agentlar" description="Savdo agentlarining joylashuvi, bugungi marshruti, tashriflari, buyurtmalari va to‘lovlarini bitta boshqaruv markazida kuzating." eyebrow="Agentlar" actions={canCreateAgent ? <PrimaryButton onClick={() => { setForm(emptyAgentForm()); setOpen(true); }}><Plus size={15} /> Agent qo‘shish</PrimaryButton> : null}>
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

    <Modal open={open} title="Yangi savdo agenti" description="Agent QULAY xodimi sifatida yaratiladi va Agent ish joyiga login/parol yoki PIN bilan kira oladi." onClose={() => { if (!busy) setOpen(false); }} wide><form onSubmit={submit} aria-busy={busy}><div className="qp-form-grid"><Field label="Ism va familiya"><input required className="qp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Lavozim"><input required className="qp-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Telefon"><input className="qp-input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" /></Field><Field label="Login"><input className="qp-input" autoComplete="off" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value.replace(/\s/g, "") })} placeholder="agent.ali" /></Field><Field label="Parol" hint="Kamida 8 belgi, katta-kichik harf va raqam"><input required className="qp-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field><Field label="PIN" hint="4–8 ta raqam"><input required className="qp-input" type="password" inputMode="numeric" maxLength={8} autoComplete="new-password" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></Field><Field label="Filial"><Select value={form.branchId} onChange={(e) => { const branchId = e.target.value; setForm((current) => ({ ...current, branchId, warehouseId: warehousesForForm.some((warehouse) => warehouse.id === current.warehouseId && (!branchId || !warehouse.branchId || warehouse.branchId === branchId)) ? current.warehouseId : "" })); }}><option value="">Biriktirilmagan</option>{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field><Field label="Ombor"><Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}><option value="">Biriktirilmagan</option>{warehousesForForm.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field><Field label="Bazaviy oylik"><input className="qp-input" type="number" min="0" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} /></Field><Field label="KPI bonusi"><input className="qp-input" type="number" min="0" value={form.kpiBonus} onChange={(e) => setForm({ ...form, kpiBonus: e.target.value })} /></Field></div><div className="qp-inline-warning">Hudud va marshrut agent yaratilgandan keyin Agentlar → Hududlar / Marshrutlar orqali biriktiriladi. Bu ma’lumotlar login profilidan alohida boshqariladi.</div><div className="qp-form-actions"><SecondaryButton type="button" disabled={busy} onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={busy}>{busy ? <><LoaderCircle className="qp-spin" size={15}/> Yaratilmoqda...</> : <><Plus size={15}/> Agent qo‘shish</>}</PrimaryButton></div></form></Modal>
    <NavigationAppModal open={Boolean(navigationTarget)} destination={navigationTarget} onClose={() => setNavigationTarget(null)} />
  </>;
}
export default AgentsPage;

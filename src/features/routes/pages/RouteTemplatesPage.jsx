import Checkbox from "../../../components/ui/Checkbox";
import Select from "../../../components/ui/Select";
import { Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { usePermissions } from "../../../hooks/usePermissions";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { notify } from "../../../services/notify";
import { getName } from "../../../utils/formatters";

const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

function emptyForm(agentId = "") {
  return { name: "", day: "Dushanba", territoryId: "", agentId, status: "ACTIVE", stops: [] };
}

function RouteTemplatesPage() {
  const db = useLocalDb();
  const { can } = usePermissions();
  const operationalAgents = getOperationalAgents(db);
  const activeTerritories = useMemo(() => (db.territories || []).filter((item) => item.status === "ACTIVE"), [db.territories]);
  const customers = useMemo(() => (db.customers || []).filter((item) => item.status !== "INACTIVE" && item.status !== "ARCHIVED"), [db.customers]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(() => emptyForm(operationalAgents[0]?.id || ""));

  const rows = (db.routeTemplates || []).map((item) => ({
    ...item,
    agent: getName(db.agents, item.agentId),
    territory: getName(db.territories, item.territoryId),
    stopCount: item.stops?.length || 0,
  }));

  const openCreate = () => {
    if (!operationalAgents.length) {
      notify("Avval faol savdo agentini yarating", "warning");
      return;
    }
    setEditingId("");
    setForm(emptyForm(operationalAgents[0]?.id || ""));
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      day: days[(Number(row.dayOfWeek || 1) - 1)] || row.day || "Dushanba",
      territoryId: row.territoryId || "",
      agentId: row.agentId || operationalAgents[0]?.id || "",
      status: row.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      stops: [...(row.stops || [])],
    });
    setOpen(true);
  };

  const toggleCustomer = (customerId) => {
    setForm((current) => ({
      ...current,
      stops: current.stops.includes(customerId) ? current.stops.filter((id) => id !== customerId) : [...current.stops, customerId],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.agentId || !form.stops.length) {
      notify("Shablon nomi, agent va kamida bitta mijozni tanlang", "warning");
      return;
    }
    const body = {
      name: form.name.trim(),
      dayOfWeek: days.indexOf(form.day) + 1,
      territoryId: form.territoryId || null,
      agentId: form.agentId,
      status: form.status,
      stops: form.stops.map((customerId, index) => ({ customerId, stopOrder: index + 1 })),
    };
    try {
      await apiRequest({ url: editingId ? `/routes/templates/${editingId}` : "/routes/templates", method: editingId ? "PATCH" : "POST", body });
    } catch (error) {
      notify(error.message, "danger");
      return;
    }
    setOpen(false);
    setEditingId("");
    setForm(emptyForm(operationalAgents[0]?.id || ""));
    notify(editingId ? "Marshrut shabloni yangilandi" : "Marshrut shabloni yaratildi");
  };

  return (
    <>
      <SmartTablePage
        title="Marshrut shablonlari"
        description="Takrorlanuvchi haftalik yo‘nalishlarni hudud, agent va mijozlar ketma-ketligi bilan boshqaring."
        eyebrow="Marshrutlar"
        rows={rows}
        searchFields={["name", "agent", "territory", "day", "status"]}
        actions={can("routes.create") ? <PrimaryButton onClick={openCreate}><Plus size={15} /> Shablon yaratish</PrimaryButton> : null}
        columns={[
          { key: "name", label: "Shablon", render: (row) => <strong>{row.name}</strong> },
          { key: "territory", label: "Hudud", render: (row) => row.territory || "—" },
          { key: "day", label: "Kun" },
          { key: "agent", label: "Agent" },
          { key: "stopCount", label: "Mijozlar" },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          ...(can("routes.update") ? [{ key: "action", label: "Amal", sortable: false, render: (row) => <SecondaryButton type="button" onClick={() => openEdit(row)}><Pencil size={14} /> Tahrirlash</SecondaryButton> }] : []),
        ]}
      />
      <Modal open={open} title={editingId ? "Marshrut shablonini tahrirlash" : "Yangi marshrut shabloni"} description="Agentning odatiy kunlik mijozlar ketma-ketligini belgilang." onClose={() => setOpen(false)} wide>
        <form onSubmit={submit} className="qp-stack">
          <div className="qp-form-grid">
            <Field label="Shablon nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Masalan, Chilonzor Dushanba" /></Field>
            <Field label="Hudud"><Select value={form.territoryId} onChange={(event) => setForm({ ...form, territoryId: event.target.value })}><option value="">Hududsiz</option>{activeTerritories.map((territory) => <option key={territory.id} value={territory.id}>{territory.name}</option>)}</Select></Field>
            <Field label="Hafta kuni"><Select value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>{days.map((day) => <option key={day}>{day}</option>)}</Select></Field>
            <Field label="Agent"><Select value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })}>{operationalAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</Select></Field>
            <Field label="Holat"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Faol</option><option value="INACTIVE">Nofaol</option></Select></Field>
          </div>
          <Field label="Mijozlar" hint={`${form.stops.length} ta tanlandi · tanlash tartibi tashrif tartibi bo‘ladi`}>
            <div className="qp-choice-grid">
              {customers.map((customer) => (
                <label key={customer.id} className={`qp-choice-card ${form.stops.includes(customer.id) ? "active" : ""}`}>
                  <Checkbox checked={form.stops.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} ariaLabel={`${customer.name}ni marshrutga qo‘shish`} />
                  <span><strong>{customer.name}</strong><small>{customer.address || customer.territory || "Manzil kiritilmagan"}</small></span>
                </label>
              ))}
            </div>
          </Field>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{editingId ? "Saqlash" : "Shablonni saqlash"}</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default RouteTemplatesPage;

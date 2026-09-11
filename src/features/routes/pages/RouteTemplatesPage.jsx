import Checkbox from "../../../components/ui/Checkbox";
import Select from "../../../components/ui/Select";
import { Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import { addLocalRecord, useLocalDb } from "../../../services/localDb";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { notify } from "../../../services/notify";
import { getName } from "../../../utils/formatters";

const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

function RouteTemplatesPage() {
  const db = useLocalDb();
  const operationalAgents = getOperationalAgents(db);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", day: "Dushanba", agentId: operationalAgents[0]?.id || "", stops: [] });
  const rows = db.routeTemplates.map((item) => ({ ...item, agent: getName(db.agents, item.agentId), stopCount: item.stops?.length || 0 }));

  const toggleCustomer = (customerId) => {
    setForm((current) => ({
      ...current,
      stops: current.stops.includes(customerId) ? current.stops.filter((id) => id !== customerId) : [...current.stops, customerId],
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.agentId || !form.stops.length) {
      notify("Shablon nomi, agent va kamida bitta mijozni tanlang", "warning");
      return;
    }
    addLocalRecord("routeTemplates", { ...form, name: form.name.trim() });
    setOpen(false);
    setForm({ name: "", day: "Dushanba", agentId: operationalAgents[0]?.id || "", stops: [] });
    notify("Marshrut shabloni yaratildi");
  };

  return (
    <>
      <SmartTablePage
        title="Marshrut shablonlari"
        description="Takrorlanuvchi haftalik yo‘nalishlarni oldindan tayyorlab, ulardan kunlik reja yarating."
        eyebrow="Marshrutlar"
        rows={rows}
        searchFields={["name", "agent", "day"]}
        actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Shablon yaratish</PrimaryButton>}
        columns={[
          { key: "name", label: "Shablon", render: (row) => <strong>{row.name}</strong> },
          { key: "day", label: "Kun" },
          { key: "agent", label: "Agent" },
          { key: "stopCount", label: "Mijozlar" },
        ]}
      />
      <Modal open={open} title="Yangi marshrut shabloni" description="Agentning odatiy kunlik mijozlar ketma-ketligini belgilang." onClose={() => setOpen(false)} wide>
        <form onSubmit={submit} className="qp-stack">
          <div className="qp-form-grid">
            <Field label="Shablon nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Masalan, Chilonzor Dushanba" /></Field>
            <Field label="Hafta kuni"><Select value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>{days.map((day) => <option key={day}>{day}</option>)}</Select></Field>
            <Field label="Agent"><Select value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })}>{operationalAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</Select></Field>
          </div>
          <Field label="Mijozlar" hint={`${form.stops.length} ta tanlandi`}>
            <div className="qp-choice-grid">
              {db.customers.map((customer) => (
                <label key={customer.id} className={`qp-choice-card ${form.stops.includes(customer.id) ? "active" : ""}`}>
                  <Checkbox checked={form.stops.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} ariaLabel={`${customer.name}ni marshrutga qo‘shish`} />
                  <span><strong>{customer.name}</strong><small>{customer.address || customer.territory || "Manzil kiritilmagan"}</small></span>
                </label>
              ))}
            </div>
          </Field>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Shablonni saqlash</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default RouteTemplatesPage;

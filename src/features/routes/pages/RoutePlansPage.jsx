import Select from "../../../components/ui/Select";
import { Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { getName, shortDate } from "../../../utils/formatters";

function RoutePlansPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ templateId: db.routeTemplates[0]?.id || "", date: new Date().toISOString().slice(0, 10), name: "" });
  const rows = db.routePlans.map((item) => ({ ...item, agent: getName(db.agents, item.agentId), stopCount: item.stops?.length || 0, done: item.stops?.filter((stop) => stop.status === "DONE").length || 0, progress: item.stops?.length ? Math.round((item.stops.filter((stop) => stop.status === "DONE").length / item.stops.length) * 100) : 0 }));

  const createPlan = async (event) => {
    event.preventDefault();
    const template = db.routeTemplates.find((item) => item.id === form.templateId);
    if (!template) {
      notify("Marshrut shablonini tanlang", "warning");
      return;
    }
    const duplicate = db.routePlans.some((item) => item.date === form.date && item.agentId === template.agentId);
    if (duplicate) {
      notify("Bu agent uchun tanlangan sanada marshrut rejasi allaqachon mavjud", "warning");
      return;
    }
    try { await apiRequest({ url: "/routes/plans", body: { planDate: form.date, name: form.name.trim() || `${template.name} · ${form.date}`, agentId: template.agentId, templateId: template.id, stops: template.stops.map((customerId, index) => ({ customerId, stopOrder: index + 1 })) } }); }
    catch (error) { notify(error.message, "danger"); return; }
    setOpen(false);
    notify("Marshrut rejasi yaratildi");
  };

  return (
    <>
      <SmartTablePage
        title="Marshrut rejalari"
        description="Shablondan aniq sana uchun agent marshrutini yarating va bajarilishini kuzating."
        eyebrow="Marshrutlar"
        rows={rows}
        searchFields={["name", "agent", "status"]}
        actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Reja yaratish</PrimaryButton>}
        columns={[
          { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
          { key: "name", label: "Marshrut", render: (row) => <strong>{row.name}</strong> },
          { key: "agent", label: "Agent" },
          { key: "stopCount", label: "Nuqtalar" },
          { key: "progress", label: "Bajarilish", render: (row) => <div style={{ minWidth: 110 }}><div className="qp-progress"><span style={{ width: `${row.progress}%` }} /></div><div className="qp-muted" style={{ marginTop: 4 }}>{row.done}/{row.stopCount} · {row.progress}%</div></div> },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        ]}
      />
      <Modal open={open} title="Marshrut rejasi yaratish" description="Mavjud shablondan bir kunlik agent yo‘nalishi yaratiladi." onClose={() => setOpen(false)}>
        <form onSubmit={createPlan} className="qp-stack">
          <Field label="Shablon"><Select value={form.templateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })}><option value="">Tanlang</option>{db.routeTemplates.map((item) => <option key={item.id} value={item.id}>{item.name} · {getName(db.agents, item.agentId)}</option>)}</Select></Field>
          <Field label="Sana"><input className="qp-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
          <Field label="Reja nomi" hint="Bo‘sh qoldirilsa avtomatik shakllanadi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Rejani yaratish</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default RoutePlansPage;

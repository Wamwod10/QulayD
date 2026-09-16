import Select from "../../../components/ui/Select";
import { Play, Plus, Square, X } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { usePermissions } from "../../../hooks/usePermissions";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { dateKeyForTimeZone } from "../../../utils/date";
import { getName, shortDate } from "../../../utils/formatters";

function RoutePlansPage() {
  const db = useLocalDb();
  const { can } = usePermissions();
  const timeZone = db.settings?.company?.timezone || "Asia/Tashkent";
  const activeTemplates = useMemo(() => (db.routeTemplates || []).filter((item) => item.status === "ACTIVE"), [db.routeTemplates]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ templateId: activeTemplates[0]?.id || "", date: dateKeyForTimeZone(new Date(), timeZone), name: "" });

  const rows = (db.routePlans || []).map((item) => {
    const done = (item.stops || []).filter((stop) => ["COMPLETED", "DONE", "VISITED"].includes(stop.status)).length;
    const stopCount = item.stops?.length || 0;
    return {
      ...item,
      agent: getName(db.agents, item.agentId),
      territory: item.template?.territory?.name || getName(db.territories, db.routeTemplates.find((template) => template.id === item.templateId)?.territoryId),
      stopCount,
      done,
      progress: stopCount ? Math.round((done / stopCount) * 100) : 0,
    };
  });

  const createPlan = async (event) => {
    event.preventDefault();
    const template = activeTemplates.find((item) => item.id === form.templateId);
    if (!template) {
      notify("Faol marshrut shablonini tanlang", "warning");
      return;
    }
    const duplicate = db.routePlans.some((item) => item.date === form.date && item.agentId === template.agentId && item.status !== "CANCELLED");
    if (duplicate) {
      notify("Bu agent uchun tanlangan sanada marshrut rejasi allaqachon mavjud", "warning");
      return;
    }
    try {
      await apiRequest({
        url: "/routes/plans",
        body: { planDate: form.date, name: form.name.trim() || undefined, templateId: template.id },
      });
    } catch (error) {
      notify(error.message, "danger");
      return;
    }
    setOpen(false);
    setForm((current) => ({ ...current, name: "" }));
    notify("Marshrut rejasi yaratildi");
  };

  const transition = async (row, action, successMessage) => {
    try {
      await apiRequest({ url: `/routes/plans/${row.id}/${action}`, body: {} });
      notify(successMessage);
    } catch (error) {
      notify(error.message, "danger");
    }
  };

  const renderAction = (row) => {
    if (!can("routes.update")) return <span className="qp-muted">—</span>;
    if (row.status === "APPROVED") return <div className="qp-inline-actions"><SecondaryButton type="button" onClick={() => transition(row, "start", "Marshrut boshlandi")}><Play size={14} /> Boshlash</SecondaryButton><SecondaryButton type="button" onClick={() => transition(row, "cancel", "Marshrut bekor qilindi")}><X size={14} /> Bekor qilish</SecondaryButton></div>;
    if (row.status === "IN_PROGRESS" && row.done === row.stopCount && row.stopCount > 0) return <SecondaryButton type="button" onClick={() => transition(row, "complete", "Marshrut yakunlandi")}><Square size={14} /> Yakunlash</SecondaryButton>;
    if (row.status === "IN_PROGRESS") return <span className="qp-muted">{row.stopCount - row.done} ta nuqta qoldi</span>;
    return <span className="qp-muted">—</span>;
  };

  return (
    <>
      <SmartTablePage
        title="Marshrut rejalari"
        description="Shablondan aniq sana uchun agent marshrutini yarating va bajarilishini kuzating."
        eyebrow="Marshrutlar"
        rows={rows}
        searchFields={["name", "agent", "territory", "status"]}
        actions={can("routes.create") ? <PrimaryButton onClick={() => { setForm({ templateId: activeTemplates[0]?.id || "", date: dateKeyForTimeZone(new Date(), timeZone), name: "" }); setOpen(true); }}><Plus size={15} /> Reja yaratish</PrimaryButton> : null}
        columns={[
          { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
          { key: "name", label: "Marshrut", render: (row) => <strong>{row.name}</strong> },
          { key: "territory", label: "Hudud", render: (row) => row.territory || "—" },
          { key: "agent", label: "Agent" },
          { key: "stopCount", label: "Nuqtalar" },
          { key: "progress", label: "Bajarilish", render: (row) => <div style={{ minWidth: 110 }}><div className="qp-progress"><span style={{ width: `${row.progress}%` }} /></div><div className="qp-muted" style={{ marginTop: 4 }}>{row.done}/{row.stopCount} · {row.progress}%</div></div> },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          { key: "action", label: "Amal", sortable: false, render: renderAction },
        ]}
      />
      <Modal open={open} title="Marshrut rejasi yaratish" description="Shablondagi agent va mijozlar server tomonidan olinadi; reja ularning canonical nusxasi bo‘ladi." onClose={() => setOpen(false)}>
        <form onSubmit={createPlan} className="qp-stack">
          <Field label="Shablon"><Select value={form.templateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })}><option value="">Tanlang</option>{activeTemplates.map((item) => <option key={item.id} value={item.id}>{item.name} · {getName(db.agents, item.agentId)}</option>)}</Select></Field>
          <Field label="Sana"><input className="qp-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
          <Field label="Reja nomi" hint="Bo‘sh qoldirilsa shablon nomi ishlatiladi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Rejani yaratish</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default RoutePlansPage;

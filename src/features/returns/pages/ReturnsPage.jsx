import { Plus } from "lucide-react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { PrimaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";

function ReturnsPage() {
  const db = useLocalDb();
  const rows = db.returns.map((item) => ({ ...item, customer: getName(db.customers, item.customerId) }));

  const quickCreate = async () => {
    const order = db.orders.find((item) => item.status === "COMPLETED" && item.items?.length);
    if (!order) {
      notify("Qaytarish yaratish uchun yakunlangan buyurtma kerak", "warning");
      return;
    }
    try { const created = await apiRequest({ url: "/returns", body: { orderId: order.id, reason: "Mijoz qaytarishi", items: [{ orderItemId: order.items[0].id, quantity: 1 }] } }); notify(`${created.number} qaytarish yaratildi`); }
    catch (error) { notify(error.message, "danger"); }
  };

  return (
    <SmartTablePage
      title="Qaytarishlar"
      description="Sotuvdan qaytgan mahsulotlar tekshiruv va tasdiq orqali boshqariladi."
      eyebrow="Savdo"
      rows={rows}
      searchFields={["number", "customer", "status"]}
      actions={<PrimaryButton onClick={quickCreate}><Plus size={15} /> Qoralama qaytarish</PrimaryButton>}
      columns={[
        { key: "number", label: "Qaytarish", render: (row) => <strong>{row.number}</strong> },
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "customer", label: "Mijoz" },
        { key: "total", label: "Summa", render: (row) => formatMoney(row.total) },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      ]}
    />
  );
}

export default ReturnsPage;

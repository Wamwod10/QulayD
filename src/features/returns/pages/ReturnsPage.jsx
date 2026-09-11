import { Plus } from "lucide-react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { PrimaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { addLocalRecord, nextNumber, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";

function ReturnsPage() {
  const db = useLocalDb();
  const rows = db.returns.map((item) => ({ ...item, customer: getName(db.customers, item.customerId) }));

  const quickCreate = () => {
    const customer = db.customers[0];
    const sale = db.sales[0];
    if (!customer || !sale) {
      notify("Qaytarish yaratish uchun mijoz va sotuv kerak", "warning");
      return;
    }
    const number = nextNumber(db.settings.documents.returnPrefix || "RET", db.returns);
    addLocalRecord("returns", { number, date: new Date().toISOString().slice(0, 10), customerId: customer.id, saleId: sale.id, total: 0, status: "DRAFT" });
    notify(`${number} qoralama qaytarish yaratildi`);
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

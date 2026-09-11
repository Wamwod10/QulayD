import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { getName } from "../../../utils/formatters";

function PickListsPage() {
  const db = useLocalDb();
  const rows = db.pickLists.map((item) => {
    const order = db.orders.find((entry) => entry.id === item.orderId);
    return {
      ...item,
      order: order?.number || "—",
      customer: getName(db.customers, order?.customerId),
    };
  });

  return (
    <SmartTablePage
      title="Yig‘ish varaqalari"
      description="Omborchi yig‘ishi kerak bo‘lgan tasdiqlangan buyurtmalar ro‘yxati."
      eyebrow="Tayyorlash"
      rows={rows}
      searchFields={["number", "order", "customer", "status"]}
      columns={[
        { key: "number", label: "Yig‘ish varaqasi", render: (row) => <strong>{row.number}</strong> },
        { key: "order", label: "Buyurtma" },
        { key: "customer", label: "Mijoz" },
        {
          key: "progress",
          label: "Bajarilish",
          render: (row) => (
            <div style={{ minWidth: 120 }}>
              <div className="qp-progress">
                <span style={{ width: `${row.progress}%` }} />
              </div>
              <div className="qp-muted" style={{ marginTop: 4 }}>
                {row.progress}%
              </div>
            </div>
          ),
        },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      ]}
    />
  );
}

export default PickListsPage;

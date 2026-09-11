import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { shortDate } from "../../../utils/formatters";

function DeliveryTripsPage() {
  const db = useLocalDb();
  const showWorkload = db.settings.delivery.showDriverWorkload !== false;
  const columns = [
    { key: "number", label: "Reys", render: (row) => <strong>{row.number}</strong> },
    { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
    { key: "driver", label: "Haydovchi" },
    { key: "vehicle", label: "Mashina" },
    ...(showWorkload ? [{ key: "deliveries", label: "Topshiriqlar soni" }] : []),
    { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
  ];
  return <SmartTablePage title="Yetkazib berish reyslari" description={showWorkload ? "Haydovchi, mashina va reys yuklamasi." : "Haydovchi, mashina va reys holati."} eyebrow="Yetkazib berish" rows={db.deliveryTrips} searchFields={["number", "driver", "vehicle", "status"]} columns={columns} />;
}

export default DeliveryTripsPage;

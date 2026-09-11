import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { useLocalDb } from "../../../services/localDb";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";
import { getLabel } from "../../../utils/labels";

function CustomerLedgerPage() {
  const db = useLocalDb();
  const rows = db.ledger.map((item) => ({
    ...item,
    customer: getName(db.customers, item.customerId),
    typeLabel: getLabel(item.type),
  }));

  return (
    <SmartTablePage
      title="Mijoz hisob-kitob tarixi"
      description="Hisob-faktura, to‘lov va tuzatishlarning o‘zgarmas moliyaviy tarixi."
      eyebrow="Moliya"
      rows={rows}
      searchFields={["customer", "typeLabel", "reference"]}
      columns={[
        { key: "date", label: "Sana", render: (row) => shortDate(row.date) },
        { key: "customer", label: "Mijoz", render: (row) => <strong>{row.customer}</strong> },
        { key: "typeLabel", label: "Turi" },
        { key: "debit", label: "Debet", render: (row) => formatMoney(row.debit) },
        { key: "credit", label: "Kredit", render: (row) => formatMoney(row.credit) },
        { key: "reference", label: "Manba" },
      ]}
    />
  );
}

export default CustomerLedgerPage;

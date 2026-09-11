import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { getCustomerDebtRow } from "../../../services/financeSelectors";
import { usePlatformFeatureFlag } from "../../../hooks/usePlatformSettings";
import { useLocalDb } from "../../../services/localDb";
import { formatMoney, getName } from "../../../utils/formatters";

function CustomerDebtPage() {
  const db = useLocalDb();
  const debtAgingEnabled = usePlatformFeatureFlag("debtAging", true);
  const rows = db.customers.map((customer) => ({ ...getCustomerDebtRow(db, customer), agent: getName(db.agents, customer.agentId, "—") }));
  const columns = [
    { key: "name", label: "Mijoz", render: (row) => <strong>{row.name}</strong> },
    { key: "agent", label: "Agent" },
    { key: "debt", label: "Qarz", render: (row) => <strong>{formatMoney(row.debt)}</strong> },
    ...(debtAgingEnabled ? [{ key: "overdue", label: "Muddati o‘tgan", render: (row) => formatMoney(row.overdue) }] : []),
    { key: "advance", label: "Avans", render: (row) => formatMoney(row.advance) },
    { key: "creditLimit", label: "Kredit limiti", render: (row) => formatMoney(row.creditLimit) },
    { key: "debtStatus", label: "Holat", render: (row) => <StatusPill status={row.debtStatus} /> },
  ];
  return <SmartTablePage title="Qarzdorlik" description={debtAgingEnabled ? "Mijozlarning joriy qarzi, muddati o‘tgan summasi va kredit limiti." : "Mijozlarning joriy qarzi va kredit limiti."} eyebrow="Moliya" rows={rows} searchFields={["name", "agent", "debtStatus"]} columns={columns} />;
}
export default CustomerDebtPage;

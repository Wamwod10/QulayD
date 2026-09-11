import { CircleDollarSign, FileText, ReceiptText, Users, WalletCards } from "lucide-react";

import { PageShell, QuickLink, SummaryGrid, SummaryItem } from "../../../components/prototype/PrototypeUI";
import { getFinanceSummary } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { formatMoney } from "../../../utils/formatters";

function FinanceOverviewPage() {
  const db = useLocalDb();
  const finance = getFinanceSummary(db);

  return (
    <PageShell title="Moliya" description="Hisob-faktura, to‘lov va qarzdorlikning umumiy holati." eyebrow="Umumiy">
      <SummaryGrid>
        <SummaryItem label="Jami qarz" value={formatMoney(finance.totalDebt)} hint={`${finance.debtorCount} ta qarzdor mijoz`} icon={<CircleDollarSign size={16} />} />
        <SummaryItem label="Muddati o‘tgan" value={formatMoney(finance.totalOverdue)} hint={`${finance.overdueCustomerCount} ta mijoz`} icon={<ReceiptText size={16} />} tone={finance.totalOverdue > 0 ? "danger" : ""} />
        <SummaryItem label="Avans" value={formatMoney(finance.totalAdvance)} hint="Mijozlar avansi" icon={<WalletCards size={16} />} />
        <SummaryItem label="Ochiq fakturalar" value={(db.invoices || []).filter((item) => Number(item.total || 0) > Number(item.paid || 0)).length} hint="To‘lov kutilmoqda" icon={<FileText size={16} />} />
      </SummaryGrid>
      <div className="qp-quick-grid">
        <QuickLink to="/invoices" title="Hisob-fakturalar" description="Mijozlarga chiqarilgan hisob-fakturalar" icon={<FileText size={17} />} />
        <QuickLink to="/payments" title="To‘lovlar" description="Qabul qilingan to‘lovlar" icon={<WalletCards size={17} />} />
        <QuickLink to="/debt" title="Qarzdorlik" description="Qarz va kredit limiti" icon={<CircleDollarSign size={17} />} />
        <QuickLink to="/ledger" title="Mijoz hisoboti" description="Mijoz bo‘yicha moliyaviy harakatlar" icon={<Users size={17} />} />
      </div>
    </PageShell>
  );
}

export default FinanceOverviewPage;

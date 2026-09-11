export function getInvoiceOutstanding(invoice) {
  return Math.max(0, Number(invoice?.total || 0) - Number(invoice?.paid || 0));
}

export function getCustomerOpenInvoices(db, customerId) {
  return (db?.invoices || [])
    .filter((invoice) => invoice.customerId === customerId && getInvoiceOutstanding(invoice) > 0 && !["VOID", "CANCELLED"].includes(invoice.status))
    .sort((a, b) => String(a.dueDate || a.date || "").localeCompare(String(b.dueDate || b.date || "")));
}

export function getCustomerDebt(db, customerId) {
  return getCustomerOpenInvoices(db, customerId).reduce((sum, invoice) => sum + getInvoiceOutstanding(invoice), 0);
}

export function getCustomerAdvance(db, customerId) {
  const customer = (db?.customers || []).find((item) => item.id === customerId);
  return Math.max(0, Number(customer?.advance || 0));
}

function dayDiff(from, to) {
  const oneDay = 86400000;
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 0;
  return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / oneDay));
}

export function getDebtAging(db, today = new Date().toISOString().slice(0, 10)) {
  const buckets = { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, overdue: 0, total: 0 };
  (db?.invoices || []).forEach((invoice) => {
    const outstanding = getInvoiceOutstanding(invoice);
    if (outstanding <= 0 || ["VOID", "CANCELLED"].includes(invoice.status)) return;
    buckets.total += outstanding;
    const dueDate = invoice.dueDate || invoice.date || today;
    if (dueDate >= today) { buckets.current += outstanding; return; }
    buckets.overdue += outstanding;
    const days = dayDiff(dueDate, today);
    if (days <= 30) buckets.d0_30 += outstanding;
    else if (days <= 60) buckets.d31_60 += outstanding;
    else if (days <= 90) buckets.d61_90 += outstanding;
    else buckets.d90_plus += outstanding;
  });
  return buckets;
}

export function getCustomerDebtRow(db, customer) {
  const debt = getCustomerDebt(db, customer.id);
  const creditLimit = Number(customer.creditLimit || 0);
  const today = new Date().toISOString().slice(0, 10);
  const invoices = getCustomerOpenInvoices(db, customer.id);
  const overdue = invoices.filter((invoice) => (invoice.dueDate || invoice.date || today) < today).reduce((sum, invoice) => sum + getInvoiceOutstanding(invoice), 0);
  return {
    ...customer,
    debt,
    overdue,
    advance: getCustomerAdvance(db, customer.id),
    remainingLimit: Math.max(0, creditLimit - debt),
    debtStatus: creditLimit > 0 && debt > creditLimit ? "OVER_LIMIT" : overdue > 0 ? "OVERDUE" : debt > 0 ? "OPEN" : "CLEAR",
  };
}

export function getFinanceSummary(db) {
  const rows = (db?.customers || []).map((customer) => getCustomerDebtRow(db, customer));
  const aging = getDebtAging(db);
  return {
    totalDebt: rows.reduce((sum, row) => sum + row.debt, 0),
    totalOverdue: rows.reduce((sum, row) => sum + row.overdue, 0),
    totalAdvance: rows.reduce((sum, row) => sum + row.advance, 0),
    debtorCount: rows.filter((row) => row.debt > 0).length,
    overdueCustomerCount: rows.filter((row) => row.overdue > 0).length,
    rows,
    aging,
  };
}

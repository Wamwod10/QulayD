import Select from "../../../components/ui/Select";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Field, PageShell, PrimaryButton, SecondaryButton, SectionCard } from "../../../components/prototype/PrototypeUI";
import { getCustomerDebt } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { notify } from "../../../services/notify";
import { createOrder } from "../../../services/prototypeActions";
import { resolveProductPrice } from "../../pricing/priceUtils";
import { formatMoney } from "../../../utils/formatters";

function OrderCreatePage() {
  const db = useLocalDb();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [warehouseId, setWarehouseId] = useState(db.settings.company.defaultWarehouseId || db.warehouses[0]?.id || "");
  const [items, setItems] = useState([{ productId: "", quantity: "1" }]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const operationalAgents = useMemo(() => getOperationalAgents(db), [db]);

  const normalized = useMemo(() => items.map((item) => {
    const product = db.products.find((entry) => entry.id === item.productId);
    const customer = db.customers.find((entry) => entry.id === customerId);
    const price = resolveProductPrice(db, product, customer);
    const balance = db.balances.find((entry) => entry.productId === item.productId && entry.warehouseId === warehouseId);
    const available = balance ? Number(balance.onHand || 0) - Number(balance.reserved || 0) : 0;
    return { ...item, price, available, productName: product?.name || "" };
  }), [items, db, customerId, warehouseId]);

  const subtotal = normalized.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const total = Math.round(subtotal * (1 - Number(discountPercent || 0) / 100));
  const selectedCustomer = db.customers.find((item) => item.id === customerId);
  const insufficient = normalized.some((item) => item.productId && Number(item.quantity) > item.available && !db.settings.inventory.allowNegativeStock);

  const submit = (event) => {
    event.preventDefault();
    if (!customerId || !warehouseId || !normalized.some((item) => item.productId)) {
      notify("Mijoz, ombor va kamida bitta mahsulotni tanlang", "warning");
      return;
    }
    if (normalized.some((item) => item.productId && (!item.quantity || Number(item.quantity) <= 0))) {
      notify("Har bir mahsulot uchun miqdor 0 dan katta bo‘lsin", "warning");
      return;
    }
    const result = createOrder({ customerId, agentId, warehouseId, items: normalized, discountPercent });
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) navigate("/orders");
  };

  const removeRow = (index) => {
    setItems((current) => current.length === 1 ? [{ productId: "", quantity: "1" }] : current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <PageShell title="Yangi buyurtma" description="Buyurtma tasdiqlanganda mahsulot ombordan chiqmaydi. Band qilish yoqilgan bo‘lsa, sotish mumkin bo‘lgan qoldiq buyurtma uchun band qilinadi." eyebrow="Savdo" actions={<SecondaryButton onClick={() => navigate("/orders")}>Buyurtmalarga qaytish</SecondaryButton>}>
      <form onSubmit={submit} className="qp-stack">
        <SectionCard title="Buyurtma ma’lumotlari">
          <div className="qp-settings-panel qp-form-grid">
            <Field label="Mijoz"><Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Tanlang</option>{db.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Agent"><Select value={agentId} onChange={(e) => setAgentId(e.target.value)}><option value="">Biriktirilmagan</option>{operationalAgents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Ombor"><Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>{db.warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label={`Chegirma (maks. ${db.settings.sales.maxAgentDiscount || 0}%)`}><input className="qp-input" type="number" min="0" max={db.settings.sales.maxAgentDiscount || 0} value={discountPercent} onChange={(e) => setDiscountPercent(Math.min(Number(db.settings.sales.maxAgentDiscount || 0), Math.max(0, Number(e.target.value))))} /></Field>
          </div>
          {db.settings.sales.warnCustomerDebt !== false && selectedCustomer && getCustomerDebt(db, selectedCustomer.id) > 0 ? <div className="qp-inline-warning">Mijozning joriy qarzi: <strong>{formatMoney(getCustomerDebt(db, selectedCustomer.id))}</strong></div> : null}
        </SectionCard>

        <SectionCard title="Mahsulotlar" description={db.settings.sales.showStockOnOrder !== false ? "Har bir qator yonida tanlangan ombordagi sotish mumkin bo‘lgan qoldiq ko‘rsatiladi." : "Mahsulot, miqdor va narxni kiriting."}>
          <div className="qp-order-lines">
            {normalized.map((line, index) => (
              <div className={`qp-order-line ${line.productId && line.quantity > line.available && !db.settings.inventory.allowNegativeStock ? "has-error" : ""}`} key={`${index}-${line.productId}`}>
                <Field label={`Mahsulot ${index + 1}`}>
                  <Select value={line.productId} onChange={(e) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: e.target.value } : item))}>
                    <option value="">Tanlang</option>
                    {db.products.filter((product) => product.status === "ACTIVE").map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </Select>
                </Field>
                <Field label="Miqdor"><input className="qp-input" inputMode="decimal" value={line.quantity} onChange={(e) => { const value = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, ""); setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: value } : item)); }} /></Field>
                {db.settings.sales.showStockOnOrder !== false ? <div className="qp-order-line-meta"><span>Sotish mumkin</span><strong className={line.quantity > line.available && !db.settings.inventory.allowNegativeStock ? "danger" : ""}>{line.productId ? line.available : "—"}</strong></div> : null}
                <div className="qp-order-line-meta"><span>Narx</span><strong>{formatMoney(line.price)}</strong></div>
                <div className="qp-order-line-meta"><span>Jami</span><strong>{formatMoney(Number(line.quantity || 0) * Number(line.price || 0))}</strong></div>
                <button type="button" className="qp-icon-button" onClick={() => removeRow(index)} aria-label="Qatorni o‘chirish"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="qp-form-actions qp-order-add-row"><SecondaryButton type="button" onClick={() => setItems((current) => [...current, { productId: "", quantity: "1" }])}><Plus size={14} /> Qator qo‘shish</SecondaryButton></div>
        </SectionCard>

        <SectionCard>
          <div className="qp-order-total">
            <div><span>Buyurtma jami</span><strong>{formatMoney(total)}</strong>{discountPercent > 0 ? <small>Chegirmasiz: {formatMoney(subtotal)} · Chegirma {discountPercent}%</small> : null}{insufficient ? <small>Ba’zi mahsulotlarda mavjud qoldiq yetarli emas.</small> : null}</div>
            <PrimaryButton type="submit" disabled={insufficient}>Buyurtmani saqlash</PrimaryButton>
          </div>
        </SectionCard>
      </form>
    </PageShell>
  );
}

export default OrderCreatePage;

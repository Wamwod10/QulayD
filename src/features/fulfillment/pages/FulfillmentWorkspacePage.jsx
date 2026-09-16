import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Clock3, PackageCheck, Play, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CameraScannerModal from "../../../components/mobile/CameraScannerModal";
import { Field, Modal, PageShell, PrimaryButton, SecondaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { apiRequest } from "../../../services/authService";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatDateTime, formatMoney } from "../../../utils/formatters";

const qty = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
const activeWorker = (item) => item.status === "ACTIVE" && (item.modules || []).some((key) => ["warehouse_workspace", "fulfillment_workspace"].includes(key));

function fefoAllocations(line, pickedBase) {
  let remaining = qty(pickedBase);
  const rows = [];
  for (const batch of [...(line.availableBatches || [])].sort((a, b) => {
    const aa = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bb = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aa - bb;
  })) {
    const used = Math.min(remaining, Number(batch.available || 0));
    if (used > 0) rows.push({ batchId: batch.id, quantity: qty(used) });
    remaining = qty(remaining - used);
    if (remaining <= 0) break;
  }
  return remaining > 0 ? [] : rows;
}

function FulfillmentWorkspacePage(){
  const db=useLocalDb();
  const [selectedId,setSelectedId]=useState("");
  const [statusFilter,setStatusFilter]=useState("ALL");
  const [drafts,setDrafts]=useState({});
  const [scannerOpen,setScannerOpen]=useState(false);
  const [batchLineId,setBatchLineId]=useState("");

  const picks=useMemo(()=> (db.pickLists||[]).map((pick)=>{
    const order=pick.order || db.orders.find((item)=>item.id===pick.orderId);
    const customer=order?.customer || db.customers.find((item)=>item.id===order?.customerId);
    return {...pick,order,customer:customer?.name||"—",total:order?.total||0,itemCount:order?.items?.length||0};
  }),[db.customers,db.orders,db.pickLists]);
  const filtered=statusFilter==="ALL"?picks:picks.filter((pick)=> {
    const state=pick.order?.fulfillmentStatus;
    return statusFilter==="READY"?state==="FULFILLED":state===statusFilter;
  });
  const selected=picks.find((pick)=>pick.id===selectedId)||filtered[0]||picks[0];
  const workers=(db.users||[]).filter((item)=>activeWorker(item)&&(!selected?.order?.warehouseId||!item.warehouseId||item.warehouseId===selected.order.warehouseId));
  const lines=selected?.items||[];

  useEffect(()=>{
    if(!selected) return;
    setDrafts(Object.fromEntries((selected.items||[]).map((line)=>[line.id,{
      pickedQuantity:String(Number(line.pickedQuantity||0)), shortageQuantity:String(Number(line.shortageQuantity||0)),
      serialIds:Array.isArray(line.serialIds)?line.serialIds:[], batchAllocations:Array.isArray(line.batchAllocations)?line.batchAllocations:[], note:line.note||"",
    }])));
  },[selected?.id, selected?.updatedAt]);

  const required=lines.reduce((sum,line)=>sum+Number(line.requiredQuantity||0),0);
  const picked=lines.reduce((sum,line)=>sum+Number(line.pickedQuantity||0),0);
  const activity=selected?.order?(db.activityLog||[]).filter((entry)=>entry.entityType==="ORDER"&&entry.entityId===selected.order.id).slice(0,8):[];
  const assignWorker=async(employeeId)=>{const worker=workers.find((item)=>item.id===employeeId);try{await apiRequest({url:`/fulfillment/pick-lists/${selected.id}/assign`,method:"PATCH",body:{employeeId:employeeId||null}});notify(worker?`${worker.name} omborchi sifatida biriktirildi`:"Omborchi biriktirish olib tashlandi");}catch(error){notify(error.message,"danger");}};

  const saveLine=async(line, override)=>{
    const draft={...(drafts[line.id]||{}),...(override||{})};
    const conversion=Number(line.orderItem?.conversionToBase||1);
    const pickedQuantity=qty(draft.pickedQuantity); const pickedBase=qty(pickedQuantity*conversion);
    let batchAllocations=draft.batchAllocations||[];
    const product=line.orderItem?.product;
    if((product?.trackLot||product?.trackExpiry)&&!product?.trackSerial&&!batchAllocations.length&&pickedBase>0){
      batchAllocations=fefoAllocations(line,pickedBase);
      if(!batchAllocations.length) return notify("Tanlangan miqdor uchun yetarli lot/partiya topilmadi", "warning");
    }
    try{
      const result=await apiRequest({url:`/fulfillment/pick-lists/${selected.id}/items/${line.id}`,method:"PATCH",body:{
        pickedQuantity, shortageQuantity:qty(draft.shortageQuantity), serialIds:draft.serialIds||[], batchAllocations, note:draft.note||undefined,
      }});
      setDrafts((current)=>({...current,[line.id]:{...draft,pickedQuantity:String(Number(result.pickedQuantity||0)),shortageQuantity:String(Number(result.shortageQuantity||0)),serialIds:result.serialIds||[],batchAllocations:result.batchAllocations||[]}}));
      notify("Yig‘ish qatori saqlandi");
    }catch(error){notify(error.message,"danger");}
  };

  const scanValue=async(value)=>{
    const code=String(value||"").trim(); if(!code||!selected) return;
    const serialLine=lines.find((line)=>(line.reservedSerials||[]).some((serial)=>serial.serial===code||serial.imei===code));
    if(serialLine){
      const serial=(serialLine.reservedSerials||[]).find((item)=>item.serial===code||item.imei===code);
      const draft=drafts[serialLine.id]||{}; const ids=[...new Set([...(draft.serialIds||[]),serial.id])];
      const conversion=Number(serialLine.orderItem?.conversionToBase||1);
      const next={...draft,serialIds:ids,pickedQuantity:String(qty(ids.length/conversion)),shortageQuantity:"0"};
      setDrafts((current)=>({...current,[serialLine.id]:next}));
      await saveLine(serialLine,next); return;
    }
    const barcodeLine=lines.find((line)=>{
      const item=line.orderItem||{};
      const values=[...(item.product?.barcodes||[]),...(item.variant?.barcodes||[]),...(item.package?.barcodes||[])].map((entry)=>entry.barcode);
      return values.includes(code);
    });
    if(!barcodeLine) return notify("Bu kod joriy yig‘ish varaqasida topilmadi", "warning");
    const draft=drafts[barcodeLine.id]||{}; const conversion=Number(barcodeLine.orderItem?.conversionToBase||1);
    const packageBarcode=(barcodeLine.orderItem?.package?.barcodes||[]).some((entry)=>entry.barcode===code);
    const increment=packageBarcode?1:qty(1/conversion);
    const nextPicked=Math.min(Number(barcodeLine.requiredQuantity||0),qty(Number(draft.pickedQuantity||0)+increment));
    const next={...draft,pickedQuantity:String(nextPicked),shortageQuantity:"0"};
    setDrafts((current)=>({...current,[barcodeLine.id]:next}));
    await saveLine(barcodeLine,next);
  };

  const nextAction=async()=>{if(!selected?.order)return;const status=selected.order.fulfillmentStatus;const route={RESERVED:"picking/start",PICKING:"picking/complete",PICKED:"packing/complete",PACKED:"ready"}[status];if(!route){notify("Buyurtma tayyor","success");return;}try{await apiRequest({url:`/orders/${selected.order.id}/${route}`,body:{}});notify({RESERVED:"Yig‘ish boshlandi",PICKING:"Yig‘ish tugadi",PICKED:"Qadoqlash tugadi",PACKED:"Buyurtma yetkazishga tayyor"}[status]);}catch(error){notify(error.message,"danger");}};
  const fulfillmentStatus=selected?.order?.fulfillmentStatus; const actionLabel=!selected?"":fulfillmentStatus==="RESERVED"?"Yig‘ishni boshlash":fulfillmentStatus==="PICKING"?"Yig‘ishni tugatish":fulfillmentStatus==="PICKED"?"Qadoqlashni tugatish":fulfillmentStatus==="PACKED"?"Tayyor deb belgilash":"Tayyor";
  const queue=picks.filter((pick)=>pick.order?.fulfillmentStatus==="RESERVED").length, inProgress=picks.filter((pick)=>["PICKING","PICKED","PACKING","PACKED"].includes(pick.order?.fulfillmentStatus)).length, problems=picks.filter((pick)=>pick.exception).length, ready=picks.filter((pick)=>pick.order?.fulfillmentStatus==="FULFILLED").length;
  const batchLine=lines.find((line)=>line.id===batchLineId); const batchDraft=batchLine?drafts[batchLine.id]:null;

  return <PageShell title="Tayyorlash markazi" description="Buyurtmalarni real yig‘ish, tekshirish va qadoqlash jarayonida boshqaring." eyebrow="Tayyorlash">
    <SummaryGrid className="qp-fulfillment-kpis"><div><span>Kutilmoqda</span><strong>{queue}</strong><small>Tayyorlash navbati</small></div><div><span>Jarayonda</span><strong>{inProgress}</strong><small>Yig‘ish yoki qadoqlash</small></div><div><span>Muammoli</span><strong>{problems}</strong><small>E’tibor talab qiladi</small></div><div><span>Tayyor</span><strong>{ready}</strong><small>Yetkazishga yuborish mumkin</small></div></SummaryGrid>
    <div className="qp-fulfillment-toolbar"><div className="qp-category-tabs">{[["ALL","Barchasi"],["RESERVED","Kutilmoqda"],["PICKING","Yig‘ilmoqda"],["PACKING","Qadoqlanmoqda"],["READY","Tayyor"]].map(([value,label])=><button type="button" className={statusFilter===value?"active":""} key={value} onClick={()=>setStatusFilter(value)}>{label}</button>)}</div></div>
    <div className="qp-fulfillment-workspace"><aside className="qp-fulfillment-queue"><div className="qp-card-head"><div><h2>Ish navbati</h2><p>Buyurtmalarni tanlang va keyingi amalni bajaring.</p></div></div><div className="qp-fulfillment-queue-list">{filtered.map((pick)=><button type="button" key={pick.id} className={pick.id===selected?.id?"active":""} onClick={()=>setSelectedId(pick.id)}><span className="qp-fulfillment-priority">{pick.order?.fulfillmentStatus==="FULFILLED"?<CheckCircle2 size={14}/>:"•"}</span><div><strong>{pick.order?.number||pick.number}</strong><small>{pick.customer} · {pick.itemCount} pozitsiya</small><span className="qp-queue-progress"><i style={{width:`${Number(pick.progress||0)}%`}}/></span></div><div><StatusPill status={pick.order?.fulfillmentStatus||pick.status}/><small>{pick.picker||"Mas’ul tanlanmagan"}</small></div></button>)}</div></aside>
      <section className={`qp-fulfillment-detail ${selectedId ? "is-mobile-open" : ""}`}>{selected?<><button type="button" className="qp-mobile-detail-back" onClick={()=>setSelectedId("")}><ArrowLeft size={18}/> Ish navbati</button><div className="qp-fulfillment-detail-head"><div><span className="qp-eyebrow">{selected.number}</span><h2>{selected.order?.number} · {selected.customer}</h2><p>{formatMoney(selected.total)} · {selected.itemCount} pozitsiya</p></div><StatusPill status={fulfillmentStatus||selected.status}/></div>
        <div className="qp-fulfillment-meta"><div><UserRound size={15}/><span>Mas’ul omborchi</span><Select value={selected.pickerEmployeeId||""} onChange={(e)=>assignWorker(e.target.value)}><option value="">Tanlanmagan</option>{workers.map((employee)=><option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select></div><div><Clock3 size={15}/><span>Progress</span><strong>{selected.progress||0}%</strong></div><div><PackageCheck size={15}/><span>Holat</span><strong>{actionLabel}</strong></div></div>
        {selected.exception?<div className="qp-fulfillment-exception"><AlertTriangle size={15}/><div><strong>Muammo</strong><span>{selected.exception}</span></div></div>:null}
        <section className="qp-owner-fulfillment-actions"><div><strong>Keyingi amal</strong><span>Yig‘ish tugashi uchun har bir qator real miqdor bilan tasdiqlanishi kerak.</span></div><div className="qp-inline-actions">{fulfillmentStatus==="PICKING"&&db.settings.mobile?.cameraScanner!==false?<SecondaryButton onClick={()=>setScannerOpen(true)}><Camera size={15}/> Skaner</SecondaryButton>:null}{fulfillmentStatus!=="FULFILLED"?<PrimaryButton onClick={nextAction}><Play size={15}/>{actionLabel}</PrimaryButton>:<StatusPill status="READY" label="Yetkazishga tayyor"/>}</div></section>
        <div className="qp-fulfillment-progress-large"><div><span>Tayyorlash holati</span><strong>{qty(picked)}/{qty(required)} · {selected.progress||0}%</strong></div><span><i style={{width:`${selected.progress||0}%`}}/></span></div>
        <div className="qp-fulfillment-bottom-grid">
          <section className="qp-fulfillment-products-card"><div className="qp-fulfillment-section-head"><div><span className="qp-eyebrow">Buyurtma</span><h3>Mahsulotlar</h3></div><span className="qp-fulfillment-section-count">{lines.length} pozitsiya</span></div>
            <div className="qp-table-wrap qp-fulfillment-lines"><table className="qp-table"><thead><tr><th>Mahsulot</th><th>Kerak</th><th>Yig‘ildi</th><th>Yetishmaydi</th><th>Tracking</th><th>Amal</th></tr></thead><tbody>{lines.map((line)=>{const item=line.orderItem||{};const product=item.product||{};const draft=drafts[line.id]||{};const tracking=[product.trackSerial?"Serial/IMEI":"",product.trackLot?"Lot":"",product.trackExpiry?"Expiry":""].filter(Boolean).join(" · ");return <tr key={line.id}><td><strong>{item.productName||product.name||"Mahsulot"}</strong><div className="qp-muted">{[item.variantName,item.packageName,item.sku].filter(Boolean).join(" · ")}</div></td><td>{Number(line.requiredQuantity||0)}</td><td><input className="qp-input" style={{minWidth:86}} type="number" min="0" step="0.001" disabled={fulfillmentStatus!=="PICKING"||product.trackSerial} value={draft.pickedQuantity??"0"} onChange={(event)=>setDrafts((current)=>({...current,[line.id]:{...draft,pickedQuantity:event.target.value}}))}/></td><td><input className="qp-input" style={{minWidth:86}} type="number" min="0" step="0.001" disabled={fulfillmentStatus!=="PICKING"} value={draft.shortageQuantity??"0"} onChange={(event)=>setDrafts((current)=>({...current,[line.id]:{...draft,shortageQuantity:event.target.value}}))}/></td><td><div><span>{tracking||"—"}</span>{product.trackSerial?<div className="qp-muted">{(draft.serialIds||[]).length}/{Number(line.requiredBaseQuantity||0)} skan</div>:null}{(product.trackLot||product.trackExpiry)&&!product.trackSerial?<button type="button" className="qp-link-button" disabled={fulfillmentStatus!=="PICKING"} onClick={()=>setBatchLineId(line.id)}>Partiyalar ({(draft.batchAllocations||[]).length})</button>:null}</div></td><td>{fulfillmentStatus==="PICKING"?<SecondaryButton onClick={()=>saveLine(line)}><Save size={14}/> Saqlash</SecondaryButton>:<StatusPill status={Number(line.shortageQuantity)>0?"PROBLEM":Number(line.pickedBaseQuantity)>=Number(line.requiredBaseQuantity)?"COMPLETED":"PENDING"}/>}</td></tr>})}</tbody></table></div>
          </section>
          <section className="qp-fulfillment-activity-card"><div className="qp-fulfillment-section-head"><div><span className="qp-eyebrow">Jarayon</span><h3>Faoliyat tarixi</h3></div><span className="qp-fulfillment-section-count">{activity.length}</span></div>{activity.length?<div className="qp-fulfillment-activity-list">{activity.map((entry)=><article className="qp-fulfillment-activity-item" key={entry.id}><span className="qp-fulfillment-activity-icon"><CheckCircle2 size={15}/></span><div className="qp-fulfillment-activity-copy"><strong>{entry.title}</strong><span>{entry.description||entry.actorName}</span><small><Clock3 size={12}/>{formatDateTime(entry.createdAt)}</small></div></article>)}</div>:<div className="qp-fulfillment-activity-empty"><Clock3 size={20}/><div><strong>Faoliyat yozuvi yo‘q</strong><span>Buyurtma bo‘yicha bajarilgan amallar shu yerda ko‘rinadi.</span></div></div>}</section>
        </div>
      </>:<div className="qp-empty"><strong>Buyurtma tanlang</strong><span>Chap navbatdan tayyorlanadigan buyurtmani tanlang.</span></div>}</section></div>
    <CameraScannerModal open={scannerOpen} onClose={()=>setScannerOpen(false)} onDetected={scanValue} title="Yig‘ishda skanerlash" />
    <Modal open={Boolean(batchLine)} title="Lot / partiyalar" description={batchLine?.orderItem?.productName||batchLine?.orderItem?.product?.name||"Mahsulot"} onClose={()=>setBatchLineId("")}>
      {batchLine?<div className="qp-stack">{(batchLine.availableBatches||[]).length?(batchLine.availableBatches||[]).map((batch)=>{const current=Number((batchDraft?.batchAllocations||[]).find((row)=>row.batchId===batch.id)?.quantity||0);return <Field key={batch.id} label={`${batch.lotNumber} · mavjud ${qty(batch.available)}`} hint={batch.expiresAt?`Yaroqlilik: ${new Date(batch.expiresAt).toLocaleDateString()}`:"Yaroqlilik sanasi yo‘q"}><input className="qp-input" type="number" min="0" max={Number(batch.available)+current} step="0.001" value={current||""} onChange={(event)=>{const value=qty(event.target.value);setDrafts((all)=>{const lineDraft=all[batchLine.id]||{};const next=(lineDraft.batchAllocations||[]).filter((row)=>row.batchId!==batch.id);if(value>0)next.push({batchId:batch.id,quantity:value});return {...all,[batchLine.id]:{...lineDraft,batchAllocations:next}};});}}/></Field>}):<div className="qp-empty"><strong>Partiya topilmadi</strong><span>Mahsulot kirimida lot/expiry ma’lumoti bo‘lishi kerak.</span></div>}<div className="qp-form-actions"><SecondaryButton onClick={()=>setBatchLineId("")}>Yopish</SecondaryButton><PrimaryButton onClick={()=>{saveLine(batchLine);setBatchLineId("");}}>Saqlash</PrimaryButton></div></div>:null}
    </Modal>
  </PageShell>;
}
export default FulfillmentWorkspacePage;

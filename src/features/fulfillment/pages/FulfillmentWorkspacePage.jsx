import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, PackageCheck, Play, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { PageShell, PrimaryButton, StatusPill, SummaryGrid } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { addActivity } from "../../../services/workflowHelpers";
import { formatDateTime, formatMoney } from "../../../utils/formatters";

function FulfillmentWorkspacePage(){
  const db=useLocalDb(); const [selectedId,setSelectedId]=useState(""); const [statusFilter,setStatusFilter]=useState("ALL");
  const picks=useMemo(()=> (db.pickLists||[]).map((pick)=>{const order=db.orders.find((item)=>item.id===pick.orderId);const customer=db.customers.find((item)=>item.id===order?.customerId);return {...pick,order,customer:customer?.name||"—",total:order?.total||0,itemCount:order?.items?.length||0};}),[db.customers,db.orders,db.pickLists]);
  const filtered=statusFilter==="ALL"?picks:picks.filter((pick)=>pick.status===statusFilter); const selected=picks.find((pick)=>pick.id===selectedId)||filtered[0]||picks[0];
  const workers=(db.users||[]).filter((item)=>item.status==="ACTIVE"&&(item.role==="WAREHOUSE_WORKER"||item.roles?.includes("WAREHOUSE_WORKER"))&&(!selected?.order?.warehouseId||!item.warehouseId||item.warehouseId===selected.order.warehouseId));
  const required=(selected?.order?.items||[]).reduce((sum,line)=>sum+Number(line.quantity||0),0); const picked=Math.round(required*Number(selected?.progress||0)/100);
  const lines=(selected?.order?.items||[]).map((line)=>({ ...line, product:db.products.find((item)=>item.id===line.productId) }));
  const activity=selected?.order?(db.activityLog||[]).filter((entry)=>entry.entityType==="ORDER"&&entry.entityId===selected.order.id).slice(0,8):[];
  const patchPick=(patch,activityTitle)=>{ if(!selected)return; updateLocalDb((draft)=>{const pick=draft.pickLists.find((item)=>item.id===selected.id);const order=draft.orders.find((item)=>item.id===selected.orderId);if(!pick)return;Object.assign(pick,patch,{updatedAt:new Date().toISOString()});if(order){order.fulfillmentStatus=patch.status||order.fulfillmentStatus;order.updatedAt=new Date().toISOString();addActivity(draft,{entityType:"ORDER",entityId:order.id,action:"FULFILLMENT_UPDATED",title:activityTitle,description:pick.picker?`Mas’ul: ${pick.picker}`:"",actorId:"owner",actorName:"Biznes egasi"});}});notify(activityTitle);};
  const assignWorker=(employeeId)=>{const worker=workers.find((item)=>item.id===employeeId);patchPick({pickerEmployeeId:employeeId,picker:worker?.name||""},worker?`${worker.name} omborchi sifatida biriktirildi`:"Omborchi biriktirish olib tashlandi");};
  const nextAction=()=>{if(!selected)return;if(["RESERVED","PENDING"].includes(selected.status))return patchPick({status:"PICKING",progress:25,startedAt:new Date().toISOString()},"Yig‘ish boshlandi");if(selected.status==="PICKING")return patchPick({status:"PACKING",progress:75},"Yig‘ish tugadi, qadoqlash boshlandi");if(["PICKED","PACKING"].includes(selected.status))return patchPick({status:"READY",progress:100,completedAt:new Date().toISOString()},"Buyurtma yetkazishga tayyor");notify("Buyurtma tayyor","success");};
  const actionLabel=!selected?"": ["RESERVED","PENDING"].includes(selected.status)?"Yig‘ishni boshlash":selected.status==="PICKING"?"Qadoqlashga o‘tkazish":["PICKED","PACKING"].includes(selected.status)?"Tayyor deb belgilash":"Tayyor";
  const queue=picks.filter((pick)=>["RESERVED","PENDING"].includes(pick.status)).length, inProgress=picks.filter((pick)=>["PICKING","PICKED","PACKING"].includes(pick.status)).length, problems=picks.filter((pick)=>pick.exception).length, ready=picks.filter((pick)=>["READY","COMPLETED"].includes(pick.status)).length;
  return <PageShell title="Tayyorlash markazi" description="Owner buyurtmalarni yig‘ish va qadoqlash jarayonini bitta joydan boshqaradi." eyebrow="Tayyorlash">
    <SummaryGrid className="qp-fulfillment-kpis"><div><span>Kutilmoqda</span><strong>{queue}</strong><small>Tayyorlash navbati</small></div><div><span>Jarayonda</span><strong>{inProgress}</strong><small>Yig‘ish yoki qadoqlash</small></div><div><span>Muammoli</span><strong>{problems}</strong><small>E’tibor talab qiladi</small></div><div><span>Tayyor</span><strong>{ready}</strong><small>Yetkazishga yuborish mumkin</small></div></SummaryGrid>
    <div className="qp-fulfillment-toolbar"><div className="qp-category-tabs">{[["ALL","Barchasi"],["RESERVED","Kutilmoqda"],["PICKING","Yig‘ilmoqda"],["PACKING","Qadoqlanmoqda"],["READY","Tayyor"]].map(([value,label])=><button type="button" className={statusFilter===value?"active":""} key={value} onClick={()=>setStatusFilter(value)}>{label}</button>)}</div></div>
    <div className="qp-fulfillment-workspace"><aside className="qp-fulfillment-queue"><div className="qp-card-head"><div><h2>Ish navbati</h2><p>Buyurtmalarni tanlang va keyingi amalni bajaring.</p></div></div><div className="qp-fulfillment-queue-list">{filtered.map((pick)=><button type="button" key={pick.id} className={pick.id===selected?.id?"active":""} onClick={()=>setSelectedId(pick.id)}><span className="qp-fulfillment-priority">{pick.status==="READY"?<CheckCircle2 size={14}/>:"•"}</span><div><strong>{pick.order?.number||pick.number}</strong><small>{pick.customer} · {pick.itemCount} pozitsiya</small><span className="qp-queue-progress"><i style={{width:`${Number(pick.progress||0)}%`}}/></span></div><div><StatusPill status={pick.status}/><small>{pick.picker||"Mas’ul tanlanmagan"}</small></div></button>)}</div></aside>
      <section className={`qp-fulfillment-detail ${selectedId ? "is-mobile-open" : ""}`}>{selected?<><button type="button" className="qp-mobile-detail-back" onClick={()=>setSelectedId("")}><ArrowLeft size={18}/> Ish navbati</button><div className="qp-fulfillment-detail-head"><div><span className="qp-eyebrow">{selected.number}</span><h2>{selected.order?.number} · {selected.customer}</h2><p>{formatMoney(selected.total)} · {selected.itemCount} pozitsiya</p></div><StatusPill status={selected.status}/></div>
        <div className="qp-fulfillment-meta"><div><UserRound size={15}/><span>Mas’ul omborchi</span><Select value={selected.pickerEmployeeId||""} onChange={(e)=>assignWorker(e.target.value)}><option value="">Tanlanmagan</option>{workers.map((employee)=><option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select></div><div><Clock3 size={15}/><span>Progress</span><strong>{selected.progress||0}%</strong></div><div><PackageCheck size={15}/><span>Holat</span><strong>{actionLabel}</strong></div></div>
        {selected.exception?<div className="qp-fulfillment-exception"><AlertTriangle size={15}/><div><strong>Muammo</strong><span>{selected.exception}</span></div></div>:null}
        <section className="qp-owner-fulfillment-actions"><div><strong>Keyingi amal</strong><span>Qulay jarayonni ortiqcha bosqichlarga bo‘lmaydi.</span></div>{selected.status!=="READY"?<PrimaryButton onClick={nextAction}><Play size={15}/>{actionLabel}</PrimaryButton>:<StatusPill status="READY" label="Yetkazishga tayyor"/>}</section>
        <div className="qp-fulfillment-progress-large"><div><span>Tayyorlash holati</span><strong>{picked}/{required} dona · {selected.progress||0}%</strong></div><span><i style={{width:`${selected.progress||0}%`}}/></span></div>
        <div className="qp-fulfillment-bottom-grid">
          <section className="qp-fulfillment-products-card">
            <div className="qp-fulfillment-section-head">
              <div><span className="qp-eyebrow">Buyurtma</span><h3>Mahsulotlar</h3></div>
              <span className="qp-fulfillment-section-count">{lines.length} pozitsiya</span>
            </div>
            <div className="qp-table-wrap qp-fulfillment-lines"><table className="qp-table"><thead><tr><th>Mahsulot</th><th>Miqdor</th><th>SKU</th></tr></thead><tbody>{lines.map((line)=><tr key={line.productId}><td><strong>{line.product?.name||"Mahsulot"}</strong></td><td>{line.quantity}</td><td>{line.product?.sku||"—"}</td></tr>)}</tbody></table></div>
          </section>
          <section className="qp-fulfillment-activity-card">
            <div className="qp-fulfillment-section-head">
              <div><span className="qp-eyebrow">Jarayon</span><h3>Faoliyat tarixi</h3></div>
              <span className="qp-fulfillment-section-count">{activity.length}</span>
            </div>
            {activity.length?<div className="qp-fulfillment-activity-list">{activity.map((entry)=><article className="qp-fulfillment-activity-item" key={entry.id}><span className="qp-fulfillment-activity-icon"><CheckCircle2 size={15}/></span><div className="qp-fulfillment-activity-copy"><strong>{entry.title}</strong><span>{entry.description||entry.actorName}</span><small><Clock3 size={12}/>{formatDateTime(entry.createdAt)}</small></div></article>)}</div>:<div className="qp-fulfillment-activity-empty"><Clock3 size={20}/><div><strong>Faoliyat yozuvi yo‘q</strong><span>Buyurtma bo‘yicha bajarilgan amallar shu yerda ko‘rinadi.</span></div></div>}
          </section>
        </div>
      </>:<div className="qp-empty"><strong>Buyurtma tanlang</strong><span>Chap navbatdan tayyorlanadigan buyurtmani tanlang.</span></div>}</section></div>
  </PageShell>;
}
export default FulfillmentWorkspacePage;

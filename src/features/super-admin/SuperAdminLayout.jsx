import { Activity, BarChart3, Bell, Blocks, Building2, CircleHelp, CreditCard, Gauge, Languages, LogOut, PlugZap, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./superAdmin.scss";

const links=[
  {to:"/super-admin",icon:Gauge,label:"Boshqaruv",end:true},
  {to:"/super-admin/companies",icon:Building2,label:"Kompaniyalar"},
  {to:"/super-admin/users",icon:UsersRound,label:"Foydalanuvchilar"},
  {to:"/super-admin/plans",icon:CreditCard,label:"Tariflar"},
  {to:"/super-admin/modules",icon:Blocks,label:"Modullar"},
  {to:"/super-admin/translations",icon:Languages,label:"Tarjimalar"},
  {to:"/super-admin/notifications",icon:Bell,label:"Bildirishnomalar"},
  {to:"/super-admin/security",icon:ShieldCheck,label:"Audit va xavfsizlik"},
  {to:"/super-admin/analytics",icon:BarChart3,label:"Analitika"},
  {to:"/super-admin/integrations",icon:PlugZap,label:"Integratsiyalar"},
  {to:"/super-admin/support",icon:CircleHelp,label:"Support"},
  {to:"/super-admin/health",icon:Activity,label:"Tizim holati"},
  {to:"/super-admin/settings",icon:Settings,label:"Sozlamalar"},
];
function SuperAdminLayout(){const{user,logout}=useAuth();const navigate=useNavigate();return <div className="qp-super-layout"><aside className="qp-super-sidebar"><div className="qp-super-logo"><span>Q</span><div><strong>Qulay</strong><small>Platforma administratori</small></div></div><nav>{links.map(({to,icon:Icon,label,end})=><NavLink end={end} key={to} to={to}><Icon size={17}/><span>{label}</span></NavLink>)}</nav><button type="button" className="qp-super-user" onClick={()=>{logout();navigate("/login",{replace:true})}}><span>{user?.name?.slice(0,1)||"S"}</span><div><strong>{user?.name}</strong><small>{user?.title}</small></div><LogOut size={16}/></button></aside><main className="qp-super-main"><Outlet/></main></div>}
export default SuperAdminLayout;

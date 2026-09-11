import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { SecondaryButton } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import EmployeeProfileOverview from "../components/EmployeeProfileOverview";

function UserDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const db = useLocalDb();
  const employee = (db.users || []).find((item) => item.id === userId);
  if (!employee) return <div className="qp-page"><div className="qp-empty-state"><h1>Xodim topilmadi</h1><SecondaryButton onClick={() => navigate("/users")}>Xodimlarga qaytish</SecondaryButton></div></div>;
  return <div className="qp-page qp-employee-page"><div className="qp-page-heading qp-employee-page-head"><div><button type="button" className="qp-back-link" onClick={() => navigate("/users")}><ArrowLeft size={16}/> Xodimlar</button><h1>{employee.name}</h1><p>Xodimning operatsion roli, KPI, oyligi, xaritadagi oxirgi joylashuvi va bog‘liq biznes ma’lumotlarini ko‘ring.</p></div></div><EmployeeProfileOverview db={db} employee={employee}/></div>;
}
export default UserDetailsPage;

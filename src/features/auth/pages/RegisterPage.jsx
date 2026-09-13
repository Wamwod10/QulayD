import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import RegisterCompanyForm from "../components/RegisterCompanyForm";
import { useAuth } from "../../../hooks/useAuth";
import { apiRequest } from "../../../services/authService";

function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (auth.user) return <Navigate to="/dashboard" replace />;

  const submit = async (form) => {
    setError(""); setLoading(true);
    try {
      await auth.registerOwner(form);
      const [branches, warehouses, settings] = await Promise.all([
        apiRequest({ url: "/branches", method: "GET", params: { limit: 10 } }),
        apiRequest({ url: "/inventory/warehouses", method: "GET", params: { limit: 10 } }),
        apiRequest({ url: "/settings", method: "GET" }),
      ]);
      const branch = branches?.[0]; const warehouse = warehouses?.[0];
      await Promise.all([
        branch && form.branchName ? apiRequest({ url: `/branches/${branch.id}`, method: "PATCH", body: { name: form.branchName.trim() } }) : null,
        warehouse && form.warehouseName ? apiRequest({ url: `/inventory/warehouses/${warehouse.id}`, method: "PATCH", body: { name: form.warehouseName.trim() } }) : null,
        settings ? apiRequest({ url: "/settings", method: "PUT", body: { version: settings.version, data: { ...settings.data, company: { ...(settings.data?.company || {}), currency: form.currency, language: form.language } } } }) : null,
      ]);
      navigate("/dashboard", { replace: true });
    } catch (err) { setError(err.message || "Ro‘yxatdan o‘tib bo‘lmadi."); }
    finally { setLoading(false); }
  };

  return <div className="qp-auth-card">
    <RegisterCompanyForm onSubmit={submit} loading={loading} error={error} />
    <div className="qp-auth-footer">Hisobingiz bormi? <Link to="/login">Kirish</Link></div>
  </div>;
}
export default RegisterPage;

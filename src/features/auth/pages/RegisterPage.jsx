import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import RegisterCompanyForm from "../components/RegisterCompanyForm";
import { useAuth } from "../../../hooks/useAuth";
import { initializeCompanyDb, updateLocalDb } from "../../../services/localDb";

function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (auth.user) return <Navigate to="/dashboard" replace />;

  const submit = (form) => {
    setError(""); setLoading(true);
    try {
      const { company, user } = auth.registerOwner(form);
      initializeCompanyDb({ company, owner: user });
      updateLocalDb((db) => {
        db.settings.company.currency = form.currency;
        db.settings.company.language = form.language;
        db.settings.locale.language = form.language;
        db.settings.company.workMode = form.workMode;
        db.settings.company.branch = form.branchName?.trim() || "Bosh filial";
        const mainWarehouse = db.warehouses.find((warehouse) => warehouse.id === "wh-main") || db.warehouses[0];
        if (mainWarehouse) {
          mainWarehouse.name = form.warehouseName?.trim() || "Asosiy ombor";
          mainWarehouse.branch = form.branchName?.trim() || "Bosh filial";
        }
        const ownerRow = db.users.find((item) => item.id === user.id);
        if (ownerRow) ownerRow.branch = form.branchName?.trim() || "Bosh filial";
      });
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

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import LoginForm from "../components/LoginForm";
import { getHomePathForUser } from "../../../services/authService";
import { resetLocalDbCache } from "../../../services/localDb";
import { useAuth } from "../../../hooks/useAuth";

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (auth.user) return <Navigate to={auth.user.mustChangePassword ? "/change-password" : getHomePathForUser(auth.user)} replace />;

  const submit = async ({ phone, password }) => {
    setError(""); setLoading(true);
    try {
      const { user } = auth.login(phone, password);
      resetLocalDbCache();
      navigate(user.mustChangePassword ? "/change-password" : getHomePathForUser(user), { replace: true });
    } catch (err) {
      setError(err.message || "Kirish amalga oshmadi.");
    } finally { setLoading(false); }
  };

  return <div className="qp-auth-card">
    <div className="qp-auth-card-head"><span>Qulay hisobingiz</span><h2>Xush kelibsiz</h2><p>Telefon raqamingiz va parolingiz bilan tizimga kiring.</p></div>
    <LoginForm onSubmit={submit} loading={loading} error={error} />
    <div className="qp-auth-demo"><strong>Sinov egasi:</strong>&nbsp; +998 90 111 11 11 &nbsp;•&nbsp; Qulay123!</div>
    <div className="qp-auth-footer">Yangi biznesmisiz? <Link to="/register">Kompaniya yaratish</Link></div>
  </div>;
}
export default LoginPage;

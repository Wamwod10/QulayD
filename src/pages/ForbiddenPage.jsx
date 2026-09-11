import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../services/authService";

function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="qp-access-state">
      <div className="qp-access-state-icon"><ShieldX size={28} /></div>
      <h1>Bu bo‘limga ruxsat yo‘q</h1>
      <p>Sizning rolingiz yoki ruxsatlaringiz ushbu sahifani ochishga yetarli emas.</p>
      <Link to={getHomePathForUser(user)}>O‘z ish joyimga qaytish</Link>
    </div>
  );
}

export default ForbiddenPage;

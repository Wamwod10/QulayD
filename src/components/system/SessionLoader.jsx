import { LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

function SessionLoader() {
  const [slow, setSlow] = useState(false);
  const [verySlow, setVerySlow] = useState(false);

  useEffect(() => {
    const slowTimer = window.setTimeout(() => setSlow(true), 2500);
    const verySlowTimer = window.setTimeout(() => setVerySlow(true), 7000);
    return () => { window.clearTimeout(slowTimer); window.clearTimeout(verySlowTimer); };
  }, []);

  return (
    <div className="qp-session-loader" role="status" aria-live="polite">
      <div className="qp-session-loader-card">
        <div className="qp-session-loader-mark">Q</div>
        <div className="qp-session-loader-spinner"><LoaderCircle size={23}/></div>
        <div className="qp-session-loader-copy">
          <strong>{slow ? "Server bilan aloqa o‘rnatilmoqda" : "Qulay tayyorlanmoqda"}</strong>
          <span>{slow ? "Sessiya va ruxsatlar xavfsiz tekshirilmoqda." : "Sessiya tekshirilmoqda..."}</span>
        </div>
        <div className="qp-session-loader-progress"><i /></div>
        {verySlow ? <button type="button" className="qp-button qp-button-secondary" onClick={() => window.location.reload()}><RefreshCw size={15}/> Qayta urinish</button> : null}
      </div>
    </div>
  );
}

export default SessionLoader;

import { Car, ExternalLink, MapPinned, Navigation, Smartphone } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Modal } from "../prototype/PrototypeUI";
import { getAvailableNavigationApps, openNavigationApp } from "../../services/mapNavigation";
import { notify } from "../../services/notify";
import { useLocalDb } from "../../services/localDb";

const icons = {
  YANDEX_NAVIGATOR: <Navigation size={19} />,
  YANDEX_MAPS: <MapPinned size={19} />,
  YANDEX_GO: <Car size={19} />,
  GOOGLE_MAPS: <ExternalLink size={19} />,
  APPLE_MAPS: <Smartphone size={19} />,
};

function NavigationAppModal({ open, onClose, destination, origin = null }) {
  const db = useLocalDb();
  const apps = useMemo(() => getAvailableNavigationApps(), []);
  const preferredAppId = db.settings?.maps?.navigationApp || "ASK";
  const autoOpenedRef = useRef(false);

  const choose = (app) => {
    const result = openNavigationApp(app.id, destination, origin);
    if (!result.ok) {
      notify(result.message || "Ilovani ochib bo‘lmadi", "warning");
      return;
    }
    if (result.message) notify(result.message, "info");
    onClose?.();
  };

  useEffect(() => {
    if (!open) {
      autoOpenedRef.current = false;
      return;
    }
    if (preferredAppId === "ASK" || autoOpenedRef.current) return;
    const preferred = apps.find((app) => app.id === preferredAppId && !app.disabled);
    if (!preferred) return;
    autoOpenedRef.current = true;
    const result = openNavigationApp(preferred.id, destination, origin);
    if (!result.ok) {
      notify(result.message || "Ilovani ochib bo‘lmadi", "warning");
      return;
    }
    if (result.message) notify(result.message, "info");
    onClose?.();
  }, [apps, destination, onClose, open, origin, preferredAppId]);

  if (open && preferredAppId !== "ASK" && apps.some((app) => app.id === preferredAppId && !app.disabled)) return null;

  return (
    <Modal
      open={open}
      title="Qaysi ilovada ochilsin?"
      description={destination?.title || destination?.name || "Tanlangan manzil"}
      onClose={onClose}
    >
      <div className="qp-navigation-apps">
        {apps.map((app) => (
          <button
            type="button"
            key={app.id}
            disabled={app.disabled}
            onClick={() => choose(app)}
            title={app.disabledReason || app.description}
          >
            <span className="qp-navigation-app-icon">{icons[app.id]}</span>
            <span><strong>{app.label}</strong><small>{app.disabledReason || app.description}</small></span>
            <ExternalLink size={15} />
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default NavigationAppModal;

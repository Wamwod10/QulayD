import { AlertTriangle, MapPin, Navigation } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import "./YandexMap.scss";

import { loadYandexMaps } from "./yandexMapsLoader";
import { useLocalDb } from "../../../services/localDb";
function validPoint(point) {
  return Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude));
}

function YandexMap({ points = [], routePoints = [], center = null, zoom = null, height = 500, selectedId = "", onPointClick = null, onMapClick = null, className = "" }) {
  const db = useLocalDb();
  const resolvedZoom = Number(zoom ?? db.settings?.maps?.defaultZoom ?? 12);
  const showTraffic = db.settings?.maps?.showTraffic === true;
  const generatedId = useId().replaceAll(":", "");
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const objectsRef = useRef([]);
  const onPointClickRef = useRef(onPointClick);
  const onMapClickRef = useRef(onMapClick);
  const [state, setState] = useState("idle");
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  const validPoints = useMemo(() => points.filter(validPoint), [points]);
  const validRoute = useMemo(() => routePoints.filter(validPoint), [routePoints]);
  const fallbackCenter = center || validPoints[0] || { latitude: 41.2995, longitude: 69.2401 };
  const pointsSignature = useMemo(() => JSON.stringify(validPoints.map((point) => [point.id, point.latitude, point.longitude, point.title, point.name, point.description, point.preset, point.shortLabel])), [validPoints]);
  const routeSignature = useMemo(() => JSON.stringify(validRoute.map((point) => [point.id, point.latitude, point.longitude])), [validRoute]);

  useEffect(() => {
    onPointClickRef.current = onPointClick;
  }, [onPointClick]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) {
      setState(apiKey ? "idle" : "missing-key");
      return undefined;
    }
    let disposed = false;
    setState("loading");

    loadYandexMaps(apiKey).then((ymaps) => {
      if (disposed || !containerRef.current) return;
      mapRef.current?.destroy?.();
      const map = new ymaps.Map(containerRef.current, {
        center: [Number(fallbackCenter.latitude), Number(fallbackCenter.longitude)],
        zoom: resolvedZoom,
        controls: ["zoomControl", "geolocationControl", "fullscreenControl", ...(showTraffic ? ["trafficControl"] : [])],
      }, { suppressMapOpenBlock: true });
      mapRef.current = map;
      objectsRef.current = [];
      map.events.add("click", (event) => {
        const coords = event.get("coords");
        onMapClickRef.current?.({ latitude: Number(coords?.[0]), longitude: Number(coords?.[1]) });
      });

      const primary = getComputedStyle(document.documentElement).getPropertyValue("--qp-brand-primary").trim()
        || getComputedStyle(document.documentElement).getPropertyValue("--qp-primary").trim()
        || "#0a2a43";

      validPoints.forEach((point) => {
        const placemark = new ymaps.Placemark(
          [Number(point.latitude), Number(point.longitude)],
          { balloonContentHeader: point.title || point.name || "Nuqta", balloonContentBody: point.description || "", hintContent: point.title || point.name || "Nuqta" },
          {
            preset: point.preset || (point.id === selectedId ? "islands#dotIcon" : "islands#circleDotIcon"),
            iconColor: primary,
            iconCaption: point.shortLabel || "",
          },
        );
        placemark.events.add("click", () => onPointClickRef.current?.(point));
        map.geoObjects.add(placemark);
        objectsRef.current.push(placemark);
      });

      if (validRoute.length >= 2) {
        const route = new ymaps.multiRouter.MultiRoute({ referencePoints: validRoute.map((point) => [Number(point.latitude), Number(point.longitude)]), params: { routingMode: "auto" } }, { boundsAutoApply: true, routeActiveStrokeColor: primary, routeActiveStrokeWidth: 5, pinIconFillColor: primary });
        map.geoObjects.add(route);
        objectsRef.current.push(route);
      } else if (validPoints.length > 1) {
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 50 });
      }
      setState("ready");
    }).catch(() => setState("error"));

    return () => {
      disposed = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  // Signatures intentionally control map rebuilds so callback identity changes do not destroy/recreate the map.
  }, [apiKey, fallbackCenter.latitude, fallbackCenter.longitude, pointsSignature, resolvedZoom, routeSignature, selectedId, showTraffic, validPoints, validRoute]);

  return (
    <div className={`qp-yandex-map ${className}`.trim()} style={{ height }}>
      <div ref={containerRef} id={`qulay-map-${generatedId}`} className="qp-yandex-map-canvas" />
      {state === "loading" ? <div className="qp-yandex-map-state"><Navigation size={20} className="spin" /><strong>Xarita yuklanmoqda...</strong></div> : null}
      {state === "missing-key" ? (
        <div className="qp-yandex-map-fallback">
          <div className="qp-yandex-map-fallback-copy"><span><AlertTriangle size={18} /></span><strong>Yandex Maps API kaliti hali kiritilmagan</strong><p>Koordinatalar va navigatsiya tayyor. API key qo‘yilgach shu joyda haqiqiy interaktiv Yandex xarita ochiladi.</p></div>
          <div className="qp-yandex-map-points">{validPoints.slice(0, 6).map((point, index) => <button type="button" key={point.id || index} onClick={() => onPointClick?.(point)}><MapPin size={14} /><span>{point.title || point.name || `Nuqta ${index + 1}`}</span></button>)}</div>
        </div>
      ) : null}
      {state === "error" ? <div className="qp-yandex-map-state error"><AlertTriangle size={20} /><strong>Yandex xaritani yuklab bo‘lmadi</strong><span>Internet yoki API key cheklovlarini tekshiring.</span></div> : null}
    </div>
  );
}

export default YandexMap;

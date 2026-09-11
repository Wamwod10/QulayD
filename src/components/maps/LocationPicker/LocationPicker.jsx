import { Crosshair, MapPin, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Field, Modal, PrimaryButton, SecondaryButton } from "../../prototype/PrototypeUI";
import { requestCurrentLocation } from "../../../services/mapNavigation";
import { notify } from "../../../services/notify";
import YandexMap from "../YandexMap/YandexMap";
import { loadYandexMaps } from "../YandexMap/yandexMapsLoader";
import "./LocationPicker.scss";

const DEFAULT_POINT = { latitude: 41.2995, longitude: 69.2401 };

async function resolveAddress(point) {
  const ymaps = await loadYandexMaps();
  const result = await ymaps.geocode([Number(point.latitude), Number(point.longitude)], { results: 1 });
  return result.geoObjects.get(0)?.getAddressLine?.() || "";
}

async function resolvePoint(query) {
  const ymaps = await loadYandexMaps();
  const result = await ymaps.geocode(query, { results: 1 });
  const object = result.geoObjects.get(0);
  const coords = object?.geometry?.getCoordinates?.();
  if (!coords?.length) return null;
  return {
    latitude: Number(coords[0]),
    longitude: Number(coords[1]),
    address: object.getAddressLine?.() || query,
  };
}

function LocationPicker({ value = { address: "", latitude: null, longitude: null }, onChange, label = "Joylashuv", buttonLabel = "Xaritadan tanlash" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value.address || "");
  const [draft, setDraft] = useState({
    latitude: Number(value.latitude) || DEFAULT_POINT.latitude,
    longitude: Number(value.longitude) || DEFAULT_POINT.longitude,
    address: value.address || "",
  });
  const [loading, setLoading] = useState(false);

  const marker = useMemo(() => [{ id: "selected-location", name: draft.address || "Tanlangan joy", ...draft }], [draft]);

  const openPicker = () => {
    setDraft({
      latitude: Number(value.latitude) || DEFAULT_POINT.latitude,
      longitude: Number(value.longitude) || DEFAULT_POINT.longitude,
      address: value.address || "",
    });
    setSearch(value.address || "");
    setOpen(true);
  };

  const choosePoint = useCallback(async (point) => {
    setLoading(true);
    try {
      const address = await resolveAddress(point);
      setDraft({ ...point, address });
      setSearch(address);
    } catch {
      setDraft((current) => ({ ...point, address: current.address || "" }));
      notify("Manzil nomini aniqlab bo‘lmadi. Nuqta koordinatasi saqlanadi.", "warning");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAddress = async (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    try {
      const point = await resolvePoint(search.trim());
      if (!point) {
        notify("Manzil topilmadi", "warning");
        return;
      }
      setDraft(point);
      setSearch(point.address);
    } catch {
      notify("Manzil qidiruvini bajarib bo‘lmadi", "warning");
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const point = await requestCurrentLocation();
      await choosePoint(point);
    } catch (error) {
      notify(error.message || "Joriy joylashuvni olib bo‘lmadi", "warning");
    }
  };

  const confirm = () => {
    onChange?.(draft);
    setOpen(false);
  };

  return (
    <>
      <Field label={label}>
        <div className="qp-location-picker-summary">
          <div><MapPin size={17} /><span><strong>{value.address || "Joylashuv tanlanmagan"}</strong>{value.latitude && value.longitude ? <small>{Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}</small> : <small>Xaritadan aniq nuqtani belgilang</small>}</span></div>
          <SecondaryButton type="button" onClick={openPicker}><MapPin size={15} /> {buttonLabel}</SecondaryButton>
        </div>
      </Field>

      <Modal open={open} title="Yandex xaritadan joylashuv tanlash" description="Manzilni qidiring yoki xaritada kerakli nuqtani bosing." onClose={() => setOpen(false)} wide>
        <form className="qp-location-picker-search" onSubmit={searchAddress}>
          <Search size={17} />
          <input className="qp-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Manzil yoki joy nomini kiriting..." />
          <SecondaryButton type="submit" disabled={loading}>Qidirish</SecondaryButton>
          <SecondaryButton type="button" onClick={useCurrentLocation}><Crosshair size={15} /> Hozirgi joyim</SecondaryButton>
        </form>
        <div className="qp-location-picker-map">
          <YandexMap points={marker} selectedId="selected-location" center={draft} zoom={15} height={430} onMapClick={choosePoint} />
          {loading ? <div className="qp-location-picker-loading">Joylashuv aniqlanmoqda...</div> : null}
        </div>
        <div className="qp-location-picker-selected"><MapPin size={16} /><div><span>Tanlangan manzil</span><strong>{draft.address || "Xaritadagi nuqta"}</strong><small>{draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}</small></div></div>
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="button" onClick={confirm}>Joylashuvni tasdiqlash</PrimaryButton></div>
      </Modal>
    </>
  );
}

export default LocationPicker;

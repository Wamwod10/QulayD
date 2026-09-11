import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { compressImageFile, imageInitial } from "../../../utils/imageStorage";
import { notify } from "../../../services/notify";
import "./ImageUploader.scss";

function ImageUploader({ value = "", onChange, label = "Rasm", name = "", compact = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImageFile(file);
      onChange?.(compressed);
    } catch (error) {
      notify(error.message || "Rasmni yuklab bo‘lmadi", "warning");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`qp-image-uploader ${compact ? "compact" : ""}`}>
      <div
        className={`qp-image-dropzone ${dragging ? "dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        {value ? <img src={value} alt={`${name || label} rasmi`} /> : <div className="qp-image-placeholder"><ImagePlus size={22} /><strong>{imageInitial(name)}</strong></div>}
        <div className="qp-image-uploader-copy">
          <strong>{busy ? "Rasm tayyorlanmoqda..." : value ? "Rasmni almashtirish" : label}</strong>
          <span>JPG, PNG yoki WEBP · avtomatik siqiladi</span>
        </div>
        <UploadCloud size={18} />
      </div>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {value ? <button type="button" className="qp-image-remove" onClick={() => onChange?.("")}><Trash2 size={14} /> Rasmni olib tashlash</button> : null}
    </div>
  );
}

export default ImageUploader;

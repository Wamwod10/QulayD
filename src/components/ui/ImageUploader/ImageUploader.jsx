import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { imageInitial } from "../../../utils/imageStorage";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import "./ImageUploader.scss";

function ImageUploader({ value = "", onChange, label = "Rasm", name = "", compact = false, multiple = false, maxFiles = 10, purpose = "product" }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const values = multiple ? (Array.isArray(value) ? value : value ? [value] : []) : [];

  const uploadFiles = async (files) => {
    const selected = [...files].slice(0, multiple ? Math.max(0, maxFiles - values.length) : 1);
    if (!selected.length) return;
    setBusy(true);
    try {
      const uploadedUrls = [];
      for (const file of selected) {
        const body = new FormData(); body.append("image", file); body.append("purpose", purpose);
        const uploaded = await apiRequest({ url: "/uploads/images", body }); uploadedUrls.push(uploaded.url);
      }
      onChange?.(multiple ? [...values, ...uploadedUrls].slice(0, maxFiles) : uploadedUrls[0]);
    } catch (error) {
      notify(error.message || "Rasmni yuklab bo‘lmadi", "warning");
    } finally { setBusy(false); }
  };

  return (
    <div className={`qp-image-uploader ${compact ? "compact" : ""}`}>
      <div className={`qp-image-dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); uploadFiles(event.dataTransfer.files || []); }}>
        {multiple && values.length ? <div className="qp-image-preview-stack">{values.slice(0, 3).map((url) => <img key={url} src={url} alt="" />)}</div>
          : value ? <img src={value} alt={`${name || label} rasmi`} /> : <div className="qp-image-placeholder"><ImagePlus size={22} /><strong>{imageInitial(name)}</strong></div>}
        <div className="qp-image-uploader-copy"><strong>{busy ? "Rasm yuklanmoqda..." : multiple && values.length ? `${values.length}/${maxFiles} rasm · yana qo‘shish` : value ? "Rasmni almashtirish" : label}</strong><span>JPG, PNG yoki WEBP · xavfsiz siqiladi</span></div>
        <UploadCloud size={18} />
      </div>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple}
        onChange={async (event) => { await uploadFiles(event.target.files || []); event.target.value = ""; }} />
      {multiple && values.length ? <div className="qp-image-list">{values.map((url, index) => <div key={url}><img src={url} alt={`${name} ${index + 1}`} />
        <span>{index === 0 ? "Asosiy" : `${index + 1}-rasm`}</span><button type="button" aria-label="Rasmni olib tashlash" onClick={() => onChange?.(values.filter((item) => item !== url))}><Trash2 size={13}/></button></div>)}</div>
        : value ? <button type="button" className="qp-image-remove" onClick={() => onChange?.("")}><Trash2 size={14} /> Rasmni olib tashlash</button> : null}
    </div>
  );
}

export default ImageUploader;

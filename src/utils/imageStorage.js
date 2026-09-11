const DEFAULT_OPTIONS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.82,
  mimeType: "image/webp",
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Rasmni o‘qib bo‘lmadi"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Rasm formatini o‘qib bo‘lmadi"));
    image.src = dataUrl;
  });
}

export async function compressImageFile(file, options = {}) {
  if (!file) return "";
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
    throw new Error("Faqat JPG, PNG yoki WEBP rasm yuklang");
  }

  const settings = { ...DEFAULT_OPTIONS, ...options };
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, settings.maxWidth / image.width, settings.maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return source;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL(settings.mimeType, settings.quality);
}

export function imageInitial(name = "") {
  return String(name || "Q").trim().slice(0, 1).toUpperCase() || "Q";
}

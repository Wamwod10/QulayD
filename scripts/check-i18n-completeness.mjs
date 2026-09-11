import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { translateRuntimeText } from "../src/i18n/translations.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const srcRoot = path.join(projectRoot, "src");
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name) && !full.endsWith(path.join("i18n", "translations.js"))) files.push(full);
  }
}

walk(srcRoot);

const candidates = new Map();
const textRegex = />\s*([^<{][^<{\n]{1,180}?)\s*</g;
const attrRegex = /(?:placeholder|title|aria-label|aria-description|alt|description|label)=(?:"([^"]+)"|'([^']+)')/g;
const objectTextRegex = /(?:label|title|description|placeholder|message|hint|eyebrow)\s*:\s*(?:"([^"]+)"|'([^']+)')/g;

function isTechnical(value) {
  const normalized = value.trim();
  if (!normalized) return true;
  if (/^(Qulay|Qulay AI|UZ · RU · TJ · KZ)$/i.test(normalized)) return true;
  if (/^(UZS|USD|EUR|RUB|GBP|CNY|AED|SKU|QR|GPS|EAN-13|CODE 128)$/i.test(normalized)) return true;
  if (/^(Ctrl|Alt|Shift|Esc|Enter|F\d+)(?:\s*\+?\s*[A-Z0-9]+)*$/i.test(normalized)) return true;
  if (/^[A-Z0-9_./:@#%+\-]{1,40}$/.test(normalized) && !/[a-z]/.test(normalized)) return true;
  if (/^(Yandex Maps|Yandex Navigator|Yandex Go|Google Maps|Apple Maps|Google Finance|WhatsApp)$/i.test(normalized)) return true;
  if (/^,\s*[A-Z0-9_]+:?$/.test(normalized)) return true;
  if (/[?]|&&|\|\||\bitem\.|\bline\.|\bchecked\b/.test(normalized)) return true;
  if (/^\d{2}\s+[A-Z]\s+\d{3}\s+[A-Z]{2}$/i.test(normalized)) return true;
  if (/^https?:\/\//i.test(normalized)) return true;
  if (/^\/[-\w/?:=&.]+$/.test(normalized)) return true;
  if (/^[0-9.,:%+\-–—/() ]+$/.test(normalized)) return true;
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+/i.test(normalized)) return true;
  if (/^[\w.-]+@[\w.-]+$/.test(normalized)) return true;
  if (/^\+?\d[\d ()-]{5,}$/.test(normalized)) return true;
  if (/\b(className|styles\.|event\.|currentTarget|target\.|window\.|document\.|localStorage|JSON\.|Math\.|Number\(|String\(|Date\(|console\.)/.test(normalized)) return true;
  if (/^[A-Za-z_$][\w$]*\([^)]*\)$/.test(normalized)) return true;
  if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/.test(normalized)) return true;
  if (/[{};=<>]/.test(normalized)) return true;
  return false;
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const regex of [textRegex, attrRegex, objectTextRegex]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      const value = (match[1] || match[2] || "").trim();
      if (!value || isTechnical(value)) continue;
      if (!/[A-Za-zА-Яа-яЁёҚқҒғҲҳҶҷӮӯІіӘәӨөҮүҰұʻ‘’ʼ]/u.test(value)) continue;
      if (!candidates.has(value)) candidates.set(value, []);
      candidates.get(value).push(path.relative(srcRoot, file));
    }
  }
}

const languages = ["ru", "tg", "kk"];
const missing = [];
for (const [value, refs] of candidates) {
  for (const language of languages) {
    const translated = translateRuntimeText(value, language);
    if (translated.trim() === value.trim()) {
      missing.push({ language, value, refs: refs.slice(0, 3) });
    }
  }
}

if (missing.length) {
  console.error(`i18n completeness: ${missing.length} missing translation result(s).`);
  for (const item of missing.slice(0, 1000)) {
    console.error(`[${item.language}] ${item.value} :: ${item.refs.join(", ")}`);
  }
  process.exit(1);
}

console.log(`i18n completeness: OK (${candidates.size} visible source strings checked across RU/TJ/KZ).`);

import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
}
walk(root);
const candidates = [];
const textRegex = />\s*([^<{][^<{\n]{2,120}?)\s*</g;
const attrRegex = /(?:placeholder|title|aria-label|description|label)=(?:"([^"]+)"|'([^']+)')/g;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const regex of [textRegex, attrRegex]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      const value = (match[1] || match[2] || "").trim();
      if (!value || /[<>{}=;$]/.test(value) || value.startsWith("http")) continue;
      if (/[A-Za-zА-Яа-яЁёҚқҒғҲҳҶҷӮӯІіӘәӨөҮүҰұ]/.test(value)) candidates.push(`${path.relative(root, file)} :: ${value}`);
    }
  }
}
console.log(`Visible string audit candidates: ${candidates.length}`);
console.log(candidates.slice(0, 400).join("\n"));

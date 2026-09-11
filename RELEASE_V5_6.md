# Qulay v5.6 — Owner Control Edition

Bu versiya Qulay konsepsiyasini biznes egasi markazidagi Business Control System modeliga soddalashtiradi.

## Asosiy o‘zgarishlar
- Employee role workspacelari, employee login/task acceptance oqimi runtime’dan chiqarildi.
- Xodimlar endi LocalDB’dagi biznes resurslari: agent, omborchi, haydovchi, manager va boshqa mas’ullar.
- Auth katalogi faqat Super Admin va biznes egasi/admin platforma hisoblarini saqlaydi; eski operational auth accountlar migration paytida chiqariladi.
- Order user-facing lifecycle 4 bosqichga soddalashtirildi: Yangi → Tayyorlanmoqda → Yetkazilmoqda → Yakunlandi; Muammoli exception alohida.
- Order detail’da Smart Next Action Ownerga faqat navbatdagi kerakli biznes amalini ko‘rsatadi.
- Operatsiyalar sahifasi compact split-view control center sifatida qayta ishlangan.
- Fulfillment Owner-controlled: mas’ul omborchi, yig‘ish, qadoqlash va tayyor holati bitta joyda.
- Delivery Owner-controlled: trip/driver/stops/map/status/proof/muammo boshqaruvi; native prompt custom modalga almashtirildi.
- POS `/sales/pos` global AppLayout’dan chiqarildi va alohida browser focus route sifatida ishlaydi. Bir xil `qulay-pos` window nomi takror tablar ochilishini kamaytiradi.
- Yordam markazi compact Knowledge Center ko‘rinishida; maqolalarda real platforma yo‘li va deep-link actionlar bor.
- Topbar contextual `?` help tegishli maqolaga olib boradi.
- Xodimlar va Agentlar yaratish login/parolsiz, yagona business employee source-of-truth orqali ishlaydi.
- Super Admin Company 360 xodimlar va platforma login hisoblarini alohida ko‘rsatadi; User 360 faqat Owner/Admin platforma hisoblariga qaratilgan.
- Super Admin signup va maintenance settinglari endi registration/login flow’da real enforce qilinadi.
- Windows filename collision tuzatildi: `AuthContext.jsx` provider va `authContextInstance.js` context object nomlari aniq ajratildi.
- Operations/Help Center va yangi owner-only komponentlarda compact spacing, semantic borders, responsive layout va missing style coverage to‘ldirildi.

## QA
- `npm run i18n:check`: OK — 1167 visible source string RU/TJ/KZ bo‘yicha tekshirildi.
- Relative import audit: 501 import, 0 missing.
- Named local import/export contract audit: 604 contract, 0 mismatch.
- Probable unused import audit: 0.
- Literal `qp-*` class style coverage: 0 missing style reference.
- Native `<select>`: 0. Native checkbox: 0.
- Case-insensitive filename collision: 0.
- Backend integrity: 341/341 fayl original v5.5 backend bilan bir xil.
- JS `node --check`: 62 JS file, 0 syntax error.

## Build/Lint eslatmasi
Ushbu containerda npm dependency tarball (`zod@3.25.76`) cache’da yo‘qligi va registry download timeout bo‘lgani sabab `npm ci`, shu bilan birga final `npm run lint` va `npm run build`ni bu muhitda bajarib bo‘lmadi. Known import/export va Windows AuthContext build xatosi static contract audit orqali tuzatildi.

Lokal kompyuterda final tekshiruv:
```bash
npm install
npm run lint
npm run build
npm run dev
```

# Qulay Premium Business OS v5.2 — Frontend release

Bu release faqat frontend prototipini kuchaytiradi. Backend yozilmagan va mavjud `backend/` strukturasiga tegilmagan.

## Asosiy yangilanishlar

- Global Light / Dark / System theme engine va tanlangan brand rangidan hosila ranglar.
- UZ / RU / TJ / KZ uchun kengaytirilgan tarjima qatlami va `npm run i18n:check` completeness tekshiruvi.
- Owner ↔ xodim workflow: real tasklar, notification, progress, approval va handoff.
- Agent, Sales Manager, Driver va Warehouse Worker uchun role-specific workspace'lar.
- Agent order lifecycle: tasdiq → rezerv → yig‘ish → qadoqlash → delivery → yakunlash.
- Salary & KPI mini-engine foundation.
- Super Admin control center: kompaniyalar, userlar, tariflar, global/company module access, broadcasts, audit, health va platform settings.
- Product master data: tannarx, avtomatik immutable SKU/EAN-13, barcode/QR, opening stock va stock adjustment.
- Inventory source-of-truth `balances` orqali; POS/kirim/delivery/adjustment movementlar bilan bog‘langan.
- Professional inventory count va fulfillment workflow.
- POS focus mode, scanner/search, savat va to‘lov UX yaxshilanishlari.
- Yandex Maps / route / LocationPicker va device-aware navigation app launcher.
- Delivery planning va driver handoff.
- Finance: invoice, payment allocation, debt va ledger oqimlari.
- Google Finance currency provider + UZS fallback/cache + header USD/EUR widget.
- Portal asosidagi Select va Row Actions — card/table overflow ichida kesilmaydi.
- Sidebar-aware dinamik content width, kattaroq typography va premium Control Bar.
- Reports boshqa modullarning source-of-truth ma’lumotidan foydalanadi va drill-down route'lar bilan bog‘langan.

## Mahalliy ishga tushirish

```bash
npm install
npm run lint
npm run i18n:check
npm run build
npm run dev
```

## Yandex Maps

`frontend/.env` yarating:

```env
VITE_YANDEX_MAPS_API_KEY=YOUR_KEY
```

Haqiqiy key `.env.example` yoki source code ichiga yozilmasin.

## Muhim

Hozirgi auth, tenant va biznes ma’lumotlar frontend prototip bosqichida LocalStorage orqali ishlaydi. Backend integratsiya bosqichida shu contract REST API + JWT/session + PostgreSQL/Prisma bilan almashtiriladi.

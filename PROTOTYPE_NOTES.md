# Qulay Premium Business OS v4 — frontend sinov versiyasi

Ushbu versiya mavjud Qulay loyiha strukturasini saqlaydi. Hozirgi prototipda biznes ma’lumotlari markazlashgan LocalStorage qatlamida saqlanadi; keyinchalik shu contractlar REST API/backend bilan almashtiriladi.

## Asosiy ishlaydigan yo‘nalishlar
- Bosh sahifa: aniq KPI va operatsion sonlar, muhim holatlar, kelajakdagi Qulay AI uchun ajratilgan markaz
- Savdo: professional Tezkor kassa fokus rejimi, buyurtmalar, sotuvlar, qaytarishlar
- Katalog: mahsulotlar, kategoriyalar, birliklar, narxlar, narx ro‘yxatlari, shtrix/QR ko‘rish va chop etish
- Ombor: qoldiq, kirim, harakat, rezerv, ko‘chirish, real inventarizatsiya workspace, adjustment va omborlar
- Hamkorlar: mijozlar, yetkazib beruvchilar va kontaktlar
- Agentlar: KPI, bugungi faoliyat, tashriflar va Yandex xarita workspace
- Marshrutlar: Yandex xarita markazidagi marshrutlar, reja va shablonlar
- Tayyorlash: prioritet navbati, picker, barcode yig‘ish, progress, qadoqlash va delivery handoff
- Yetkazib berish: rejalashtirish, reys, haydovchi, xarita, stoplar va tashqi navigatsiya ilovalari
- Moliya: hisob-faktura, to‘lov, allocation, qarzdorlik, ledger va valyuta kurslari
- Hisobotlar: boshqa modullarning real mahalliy ma’lumotlaridan agregatsiya va drill-down
- Sozlamalar: dizayn, tipografiya, modullar, savdo, POS, ombor, agent, delivery, moliya, xarita, valyuta va boshqa sozlamalar

## Bo‘limlar orasidagi muhim bog‘lanishlar
- Mahsulot → Katalog + POS + Ombor + Buyurtma
- Mijoz → Savdo + Agent + Marshrut + Moliya
- Kirim → Qoldiq + Inventory Movement
- Buyurtma → Rezerv + Tayyorlash
- Tayyorlash → Delivery uchun tayyor holat
- Delivery yakuni → real stock chiqimi + Sotuv + Hisob-faktura + Qarz + Ledger
- To‘lov → Invoice allocation + Qarz kamayishi + Ledger
- Hisobot → tegishli source modul ma’lumotlari
- Interfeys sozlamalari → butun platformadagi shared design tokenlar
- Valyuta tanlovi → faqat belgini emas, ko‘rinadigan summalarni kurs bo‘yicha konvertatsiya qiladi

## Mahalliy ma’lumotlar
Asosiy LocalStorage kaliti:
`qulay.prototype.db.v4`

Oldingi v1/v2/v3 ma’lumotlar mavjud bo‘lsa v4 schema bilan merge qilinadi.

## Ishga tushirish
```bash
npm install
npm run lint
npm run build
npm run dev
```

## Tashqi integratsiyalar
Yandex Maps va Google Finance bo‘yicha yo‘riqnoma uchun `INTEGRATION_SETUP.md` faylini ko‘ring.

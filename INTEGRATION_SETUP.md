# Qulay v5 — integratsiyalarni sozlash

## 1. Yandex Maps

Qulay ichidagi Agentlar, Marshrutlar va Yetkazib berish xaritalari Yandex Maps JavaScript API 2.1 uchun tayyorlangan.

`.env` fayl yarating:

```env
VITE_YANDEX_MAPS_API_KEY=BU_YERGA_YANDEX_MAPS_API_KEY
```

`.env.example` faqat namuna. Haqiqiy key aynan `frontend/.env` faylida turishi kerak.

API key bo‘lmasa platforma buzilmaydi: xarita o‘rnida fallback chiqadi va koordinatalar saqlanadi. Key qo‘yilgach interaktiv xarita avtomatik ishlaydi.

Tashqi navigatsiya variantlari:
- Yandex Navigator
- Yandex Maps
- Yandex Go
- Google Maps
- Apple Maps

Eslatma: Yandex Navigator URL orqali tijoriy/ko‘p marotaba ochilishda Yandex’ning alohida identifikatsiya/signature qoidalari qo‘llanishi mumkin. Production bosqichida shu credential backend orqali xavfsiz qo‘shiladi.

## 2. Google Finance kurslari

Frontend `/api/google-finance` endpointini chaqiradi. Vercel’da `frontend/api/google-finance.js` serverless function sifatida ishlaydi va Google Finance sahifalaridan UZS bazasidagi kurslarni oladi.

Qo‘llab-quvvatlanadigan ko‘rinish valyutalari:
- UZS
- USD
- EUR
- RUB
- GBP
- CNY
- AED

Kurs muvaffaqiyatli olinganda LocalStorage’da cache qilinadi. Google Finance vaqtincha ishlamasa oxirgi cache/fallback bilan UI ishlashda davom etadi va holat ko‘rsatiladi.

Developmentda Vite plugin `/api/google-finance` endpointini lokal ravishda taqlid qiladi.

Muhim: Google Finance uchinchi tomonlar uchun barqaror rasmiy FX REST API bermaydi. Shu sabab bu prototip server-side provider/scraping bridge ishlatadi. Productionda provider qatlamini o‘zgartirish oson bo‘lishi uchun currency service alohida yozilgan.

## 3. Vercel SPA + API

`vercel.json` avval real fayl va `/api/*` serverless functionlarni tekshiradi, undan keyin qolgan frontend route’larni `index.html`ga yuboradi. Shu sabab `/orders`, `/agents`, `/routes/today` kabi route’lar refresh qilinganda 404 bermaydi va `/api/google-finance` SPA rewrite ostida qolmaydi.

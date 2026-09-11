# Qulay Premium Business OS v5

## Asosiy yangi qatlamlar

- Owner registratsiyasi va telefon + parol orqali login.
- Owner yaratadigan xodim akkauntlari, vaqtinchalik parol va keyingi parol almashtirish.
- Bir xodimga bir nechta rol berish.
- Role-specific ish maydonlari: Savdo agenti, Savdo menejeri, Haydovchi, Omborchi.
- Salary & KPI mini-engine.
- Tasdiqlash oqimi va Owner/Solo fallback.
- Kompaniya bo‘yicha LocalStorage tenant isolation.
- Super Admin boshqaruv paneli foundation.
- O‘zbek/Rus/Tojik/Qozoq runtime localization qatlami.
- Light / Dark / System theme va sozlanadigan brand rangidan hosila design tokenlar.
- Yandex Maps/location/navigation foundation va device-aware tashqi navigatorlar.
- Google Finance asosidagi kurs provider + cache/fallback.

## Muhim prototip eslatmasi

Bu versiya backend ulanmagan frontend prototipdir. Login-parollar va kompaniya ma’lumotlari hozir LocalStorage orqali ishlaydi. Production backend bosqichida:

- parollar serverda kuchli hash bilan saqlanadi;
- JWT access/refresh session ishlaydi;
- tenant isolation backend/repository darajasida tekshiriladi;
- permission va approval serverda majburiy tekshiriladi;
- audit log serverda yoziladi;
- LocalStorage faqat UI cache/offline qatlam sifatida qoladi.

## Ishga tushirish

```bash
npm install
npm run lint
npm run build
npm run dev
```

Yandex Maps uchun `frontend/.env` ichida quyidagini kiriting:

```env
VITE_YANDEX_MAPS_API_KEY=YOUR_KEY
```

Haqiqiy keyni `.env.example` yoki Git repository ichiga yozmang.

export const HELP_CATEGORIES = [
  {
    id: "start", title: "Boshlash", description: "Qulay’ni birinchi kundan to‘g‘ri sozlash.",
    articles: [
      { id:"first-setup", title:"Birinchi sozlash", summary:"Kompaniya, ombor, til va modullarni tayyorlash.", steps:[{title:"Kompaniya sozlamalarini oching",path:"/settings/general",pathLabel:"Sozlamalar → Umumiy"},{title:"Asosiy omborni tekshiring",path:"/warehouses",pathLabel:"Ombor → Omborlar"},{title:"Til va valyutani tanlang",path:"/settings/locale",pathLabel:"Sozlamalar → Til va hudud"},{title:"Kerakli modullarni yoqing",path:"/settings/modules",pathLabel:"Sozlamalar → Modullar"}], body:["Qulay owner uchun boshqaruv tizimi. Xodimlar platformaga kirmaydi; ular operatsiyalarda mas’ul shaxs sifatida tanlanadi."] },
      { id:"first-product", title:"Birinchi mahsulot", summary:"Katalogga mahsulot va boshlang‘ich qoldiq qo‘shish.", steps:[{title:"Mahsulotlar bo‘limini oching",path:"/products",pathLabel:"Katalog → Mahsulotlar"},{title:"Yangi mahsulotni bosing",path:"/products",pathLabel:"+ Mahsulot"},{title:"Ombor va boshlang‘ich qoldiqni kiriting",path:"/inventory",pathLabel:"Ombor → Qoldiqlar"}] },
      { id:"first-employee", title:"Xodim qo‘shish", summary:"Agent, haydovchi yoki omborchini mas’ul resurs sifatida yaratish.", steps:[{title:"Xodimlar bo‘limini oching",path:"/users",pathLabel:"Sozlamalar → Xodimlar"},{title:"Xodim qo‘shishni bosing",path:"/users",pathLabel:"+ Xodim qo‘shish"},{title:"Turi, hudud, ombor va oylikni kiriting",path:"/users",pathLabel:"Xodim formasi"}], body:["Xodimga login yoki parol berilmaydi. Owner buyurtma, marshrut, ombor yoki reysda shu xodimni mas’ul qilib tanlaydi."] },
    ],
  },
  {
    id:"sales", title:"Savdo va buyurtmalar", description:"Buyurtmani kam harakat bilan boshidan oxirigacha olib borish.",
    articles:[
      { id:"first-order", title:"Buyurtma yaratish", summary:"Mijoz va mahsulot tanlab buyurtmani tez yaratish.", process:["Yangi","Tayyorlanmoqda","Yetkazilmoqda","Yakunlandi"], steps:[{title:"Buyurtmalarni oching",path:"/orders",pathLabel:"Savdo → Buyurtmalar"},{title:"Yangi buyurtmani bosing",path:"/orders/new",pathLabel:"+ Yangi buyurtma"},{title:"Mijoz, ombor va mahsulotlarni tanlang",path:"/orders/new",pathLabel:"Buyurtma formasi"},{title:"Saqlang",path:"/orders",pathLabel:"Tayyorlash avtomatik boshlanadi"}], body:["Qulay texnik substatuslarni ichkarida saqlaydi, lekin Ownerga faqat to‘rtta asosiy bosqichni ko‘rsatadi."] },
      { id:"order-flow", title:"Buyurtma jarayoni", summary:"Owner uchun soddalashtirilgan 4 bosqich.", process:["Yangi","Tayyorlanmoqda","Yetkazilmoqda","Yakunlandi"], steps:[{title:"Yangi buyurtmani yarating",path:"/orders/new",pathLabel:"Savdo → Yangi buyurtma"},{title:"Tayyorlash jarayonini kuzating",path:"/fulfillment",pathLabel:"Tayyorlash → Tayyorlash markazi"},{title:"Tayyor buyurtmani reysga qo‘shing",path:"/deliveries/planning",pathLabel:"Yetkazib berish → Rejalashtirish"},{title:"Yetkazish holatini boshqaring",path:"/deliveries",pathLabel:"Yetkazib berish → Markaz"}] },
      { id:"pos", title:"Tezkor kassa", summary:"POS alohida brauzer oynasida ishlaydi.", steps:[{title:"Savdo menyusidan Tezkor kassani bosing",path:"/sales/pos",pathLabel:"Savdo → Tezkor kassa"},{title:"Yangi POS oynasida savdoni bajaring",path:"/sales/pos",pathLabel:"Alohida focus mode"}], body:["Asosiy Qulay oynasi ochiq qoladi; POS alohida tab/oynada ishlaydi."] },
    ],
  },
  {
    id:"inventory", title:"Ombor va tayyorlash", description:"Qoldiq, band qilish, yig‘ish va inventarizatsiya.",
    articles:[
      { id:"reserved-stock", title:"Band qilingan va sotish mumkin", summary:"Qoldiq ustunlari nimani anglatadi?", steps:[{title:"Qoldiqlarni oching",path:"/inventory",pathLabel:"Ombor → Qoldiqlar"}], body:["Haqiqiy qoldiq — omborda real turgan miqdor.","Band qilingan — buyurtmalar uchun ajratilgan miqdor.","Sotish mumkin — haqiqiy qoldiq minus band qilingan miqdor."] },
      { id:"goods-receipt", title:"Mahsulot kirimi", summary:"Yetkazib beruvchidan kelgan mahsulotni omborga kirim qilish.", steps:[{title:"Mahsulot kirimini oching",path:"/inventory/receipts",pathLabel:"Ombor → Mahsulot kirimi"},{title:"Yetkazib beruvchi va omborni tanlang",path:"/inventory/receipts",pathLabel:"Yangi kirim"},{title:"Mahsulotlar va tannarxni kiriting",path:"/inventory/receipts",pathLabel:"Kirim pozitsiyalari"}] },
      { id:"fulfillment", title:"Tayyorlash markazi", summary:"Owner picking va packing holatini bir joydan boshqaradi.", steps:[{title:"Tayyorlash markazini oching",path:"/fulfillment",pathLabel:"Tayyorlash → Tayyorlash markazi"},{title:"Buyurtmani tanlang",path:"/fulfillment",pathLabel:"Ish navbati"},{title:"Omborchi va progressni boshqaring",path:"/fulfillment",pathLabel:"Tanlangan buyurtma"}] },
      { id:"inventory-count", title:"Inventarizatsiya", summary:"Tizim qoldig‘ini real sanalgan miqdor bilan solishtirish.", steps:[{title:"Inventarizatsiyani oching",path:"/inventory/counts",pathLabel:"Ombor → Inventarizatsiya"},{title:"Yangi sanashni boshlang",path:"/inventory/counts",pathLabel:"+ Yangi inventarizatsiya"}] },
    ],
  },
  {
    id:"delivery", title:"Yetkazib berish", description:"Reys, haydovchi, stoplar va Yandex marshrutlari.",
    articles:[
      { id:"delivery-flow", title:"Yetkazib berish jarayoni", summary:"Tayyor buyurtmani reysga qo‘shish va yakunlash.", process:["Tayyor","Reys yaratildi","Yetkazilmoqda","Yetkazildi"], steps:[{title:"Rejalashtirishni oching",path:"/deliveries/planning",pathLabel:"Yetkazib berish → Rejalashtirish"},{title:"Tayyor buyurtmalarni tanlang",path:"/deliveries/planning",pathLabel:"Tayyor buyurtmalar"},{title:"Haydovchi va mashinani tanlang",path:"/deliveries/planning",pathLabel:"Reys ma’lumotlari"},{title:"Reysni yarating",path:"/deliveries",pathLabel:"Yetkazib berish markazi"}] },
      { id:"maps", title:"Yandex Maps va navigatsiya", summary:"Agent, mijoz, reys va yo‘nalishlarni xaritada ko‘rish.", steps:[{title:"Agentlar xaritasini oching",path:"/agents",pathLabel:"Agentlar → Agentlar"},{title:"Yetkazish xaritasini oching",path:"/deliveries",pathLabel:"Yetkazib berish → Markaz"}] },
    ],
  },
  {
    id:"finance", title:"Moliya va hisobotlar", description:"Invoice, payment, qarz va rahbar hisobotlari.",
    articles:[
      { id:"debt", title:"Qarzdorlik", summary:"Ochiq invoice va paymentlar asosidagi real qarz.", steps:[{title:"Qarzdorlikni oching",path:"/debt",pathLabel:"Moliya → Qarzdorlik"},{title:"Mijoz hisobini ko‘ring",path:"/ledger",pathLabel:"Moliya → Mijoz hisoboti"}] },
      { id:"payment", title:"To‘lov qabul qilish", summary:"Mijoz to‘lovini invoice’larga taqsimlash.", steps:[{title:"To‘lovlarni oching",path:"/payments",pathLabel:"Moliya → To‘lovlar"},{title:"Mijoz va summani kiriting",path:"/payments",pathLabel:"+ To‘lov"}] },
      { id:"reports", title:"Hisobotlardan foydalanish", summary:"KPI, filter va drill-down bilan boshqaruv qarorlarini tez olish.", steps:[{title:"Hisobotlarni oching",path:"/reports",pathLabel:"Hisobotlar → Umumiy hisobot"},{title:"Kerakli ko‘rsatkichni tanlang",path:"/reports",pathLabel:"KPI va drill-down"}] },
    ],
  },
  {
    id:"settings", title:"Sozlamalar va tizim", description:"Theme, modullar, valyuta, Yandex va ma’lumotlar.",
    articles:[
      { id:"modules", title:"Modullarni boshqarish", summary:"Keraksiz bo‘limni o‘chirib, platformani soddalashtirish.", steps:[{title:"Modullarni oching",path:"/settings/modules",pathLabel:"Sozlamalar → Modullar"}], body:["Modul o‘chirilsa sidebar, route, search va quick actionlardan yashiriladi. Tarixiy data saqlanadi."] },
      { id:"appearance", title:"Interfeys va dark mode", summary:"Rang, dark/light, density va ko‘rinishni boshqarish.", steps:[{title:"Interfeys sozlamalarini oching",path:"/settings/appearance",pathLabel:"Sozlamalar → Interfeys va dizayn"}] },
      { id:"shortcuts", title:"Tezkor klaviatura", summary:"Kam click bilan ko‘proq ish qilish uchun shortcutlar.", body:["Ctrl+K — global qidiruv.","Shortcutlar faqat faol modul va mavjud actionlar uchun ko‘rsatiladi."] },
    ],
  },
];

export function allHelpArticles(){return HELP_CATEGORIES.flatMap((category)=>category.articles.map((article)=>({...article,categoryId:category.id,categoryTitle:category.title})));}

export const navigationConfig = [
  {
    key: "dashboard",
    label: "Bosh sahifa",
    icon: "dashboard",
    to: "/dashboard",
    description: "Biznesning qisqa holati va kelajakdagi Qulay AI markazi",
  },
  {
    key: "operations",
    label: "Operatsiyalar",
    icon: "operations",
    to: "/operations",
    description: "Owner uchun jonli buyurtma va xodim jarayonlari nazorat markazi",
  },
  {
    key: "sales",
    label: "Savdo",
    icon: "sales",
    children: [
      { label: "Tezkor kassa", description: "Kassada tez sotuv va to‘lov", to: "/sales/pos" },
      { label: "Buyurtmalar", description: "Barcha savdo buyurtmalari", to: "/orders" },
      { label: "Yangi buyurtma", description: "Yangi savdo buyurtmasi yaratish", to: "/orders/new" },
      { label: "Sotuvlar", description: "Amalga oshgan haqiqiy sotuvlar", to: "/sales" },
      { label: "Qaytarishlar", description: "Mijozdan qaytgan mahsulotlar", to: "/returns" },
    ],
  },
  {
    key: "catalog",
    label: "Katalog",
    icon: "catalog",
    children: [
      { label: "Mahsulotlar", description: "Yagona mahsulotlar katalogi", to: "/products" },
      { label: "Kategoriyalar", description: "Mahsulot guruhlari", to: "/categories" },
      { label: "O‘lchov birliklari", description: "Dona, quti, kilogramm va boshqalar", to: "/units" },
      { label: "Narxlar", description: "Mahsulot narxlarini boshqarish", to: "/pricing" },
      { label: "Narx ro‘yxatlari", description: "Chakana, ulgurji va maxsus narxlar", to: "/price-lists" },
    ],
  },
  {
    key: "inventory",
    label: "Ombor",
    icon: "inventory",
    children: [
      { label: "Qoldiqlar", description: "Haqiqiy, band qilingan va sotish mumkin bo‘lgan qoldiq", to: "/inventory" },
      { label: "Mahsulot kirimi", description: "Omborga mahsulot qabul qilish", to: "/inventory/receipts" },
      { label: "Harakatlar", description: "Barcha kirim va chiqimlar tarixi", to: "/inventory/movements" },
      { label: "Band qilingan mahsulotlar", description: "Buyurtmalar uchun ajratilgan qoldiq", to: "/inventory/reservations" },
      { label: "Omborlararo ko‘chirish", description: "Omborlar orasida mahsulot ko‘chirish", to: "/inventory/transfers" },
      { label: "Inventarizatsiya", description: "Tizim va haqiqiy qoldiqni solishtirish", to: "/inventory/counts" },
      { label: "Qoldiq tuzatish", description: "Vakolatli qoldiq tuzatish amallari", to: "/inventory/adjustments" },
      { label: "Omborlar", description: "Omborlarni boshqarish", to: "/warehouses" },
    ],
  },
  {
    key: "partners",
    label: "Hamkorlar",
    icon: "partners",
    children: [
      { label: "Mijozlar", description: "Mijozlar va savdo nuqtalari", to: "/customers" },
      { label: "Yetkazib beruvchilar", description: "Mahsulot yetkazib beruvchilar", to: "/suppliers" },
      { label: "Kontaktlar", description: "Hamkorlarning aloqa shaxslari", to: "/partners/contacts" },
    ],
  },
  {
    key: "agents",
    label: "Agentlar",
    icon: "agents",
    children: [
      { label: "Agentlar ro‘yxati", description: "Savdo agentlari va ularning holati", to: "/agents" },
      { label: "Hududlar", description: "Agentlarga biriktirilgan hududlar", to: "/agents/territories" },
      { label: "Tashriflar", description: "Mijozlarga tashriflar va natijalar", to: "/visits" },
      { label: "Bugungi faoliyat", description: "Agentlarning bugungi ko‘rsatkichlari", to: "/agents/today" },
    ],
  },
  {
    key: "routes",
    label: "Marshrutlar",
    icon: "routes",
    children: [
      { label: "Bugungi marshrutlar", description: "Bugungi agent yo‘nalishlari", to: "/routes/today" },
      { label: "Marshrut rejalari", description: "Sana bo‘yicha rejalashtirilgan yo‘nalishlar", to: "/routes/plans" },
      { label: "Marshrut shablonlari", description: "Takrorlanuvchi doimiy marshrutlar", to: "/routes/templates" },
    ],
  },
  {
    key: "fulfillment",
    label: "Tayyorlash",
    icon: "fulfillment",
    children: [
      { label: "Tayyorlash markazi", description: "Tasdiqlangan buyurtmalar holati", to: "/fulfillment" },
      { label: "Yig‘ish varaqalari", description: "Omborchi uchun yig‘ish topshiriqlari", to: "/fulfillment/pick-lists" },
      { label: "Yig‘ish", description: "Mahsulotlarni buyurtma bo‘yicha yig‘ish", to: "/fulfillment/picking" },
      { label: "Qadoqlash", description: "Yig‘ilgan buyurtmalarni qadoqlash", to: "/fulfillment/packing" },
      { label: "Tayyor buyurtmalar", description: "Yetkazib berishga tayyor buyurtmalar", to: "/fulfillment/ready" },
    ],
  },
  {
    key: "delivery",
    label: "Yetkazib berish",
    icon: "delivery",
    children: [
      { label: "Yetkazib berish markazi", description: "Xarita, reyslar va nuqtalar boshqaruvi", to: "/deliveries" },
      { label: "Rejalashtirish", description: "Tayyor buyurtmalardan yangi reys tuzish", to: "/deliveries/planning" },
      { label: "Reyslar", description: "Haydovchi va reyslar ro‘yxati", to: "/delivery-trips" },
      { label: "Topshiriqlar", description: "Haydovchilarga berilgan topshiriqlar", to: "/deliveries/assignments" },
    ],
  },
  {
    key: "finance",
    label: "Moliya",
    icon: "finance",
    children: [
      { label: "Umumiy", description: "Moliya bo‘yicha asosiy ko‘rsatkichlar", to: "/finance" },
      { label: "Hisob-fakturalar", description: "Mijozlarga chiqarilgan hisob-fakturalar", to: "/invoices" },
      { label: "To‘lovlar", description: "Qabul qilingan to‘lovlar", to: "/payments" },
      { label: "Qarzdorlik", description: "Mijozlarning joriy qarzi", to: "/debt" },
      { label: "Mijoz hisoboti", description: "Mijoz bo‘yicha moliyaviy harakatlar", to: "/ledger" },
      { label: "Valyuta kurslari", description: "Google Finance kurslari va konverter", to: "/currency-rates" },
    ],
  },
  {
    key: "reports",
    label: "Hisobotlar",
    icon: "reports",
    children: [
      { label: "Umumiy hisobot", description: "Asosiy ko‘rsatkichlar markazi", to: "/reports" },
      { label: "Savdo hisoboti", description: "Savdo natijalari tahlili", to: "/reports/sales" },
      { label: "Ombor hisoboti", description: "Qoldiq va harakat tahlili", to: "/reports/inventory" },
      { label: "Agentlar hisoboti", description: "Agentlar samaradorligi", to: "/reports/agents" },
      { label: "Qarzdorlik hisoboti", description: "Qarz holati tahlili", to: "/reports/debt" },
      { label: "Yetkazib berish hisoboti", description: "Yetkazib berish samaradorligi", to: "/reports/delivery" },
    ],
  },
  {
    key: "help",
    label: "Yordam markazi",
    icon: "help",
    to: "/help",
    description: "Platforma qo‘llanmasi, jarayonlar va yangi foydalanuvchilar uchun yordam",
  },
  {
    key: "settings",
    label: "Sozlamalar",
    icon: "settings",
    children: [
      { label: "Umumiy", description: "Kompaniya va platforma sozlamalari", to: "/settings/general" },
      { label: "Interfeys va dizayn", description: "Rang, o‘lcham, qalinlik va ko‘rinish", to: "/settings/appearance" },
      { label: "Modullar", description: "Platforma bo‘limlarini yoqish yoki o‘chirish", to: "/settings/modules" },
      { label: "Savdo", description: "Buyurtma va chegirma qoidalari", to: "/settings/sales" },
      { label: "Tezkor kassa", description: "Kassa va to‘lov sozlamalari", to: "/settings/pos" },
      { label: "Ombor", description: "Qoldiq va band qilish qoidalari", to: "/settings/inventory" },
      { label: "Agentlar", description: "Hudud, xarita va agent boshqaruvi", to: "/settings/agents" },
      { label: "Yetkazib berish", description: "Yetkazib berish tasdig‘i va qoidalari", to: "/settings/delivery" },
      { label: "Moliya", description: "Qarz va to‘lov qoidalari", to: "/settings/finance" },
      { label: "Hujjatlar", description: "Raqamlash va chop etish sozlamalari", to: "/settings/documents" },
      { label: "Bildirishnomalar", description: "Ogohlantirish va bildirishnoma qoidalari", to: "/settings/notifications" },
      { label: "Xarita va navigatsiya", description: "Yandex Maps va navigatsiya ilovalari", to: "/settings/maps" },
      { label: "Xodimlar", description: "Kompaniya jamoasi va mas’ul xodimlar", to: "/users" },
      { label: "Til va hudud", description: "Til, vaqt mintaqasi va formatlar", to: "/settings/locale" },
      { label: "Mobil ilova", description: "PWA, kamera skaneri, PIN va mobil qurilma sozlamalari", to: "/settings/mobile" },
      { label: "Ma’lumotlar", description: "Import, eksport, zaxira va tiklash", to: "/settings/data" },
      { label: "Tizim", description: "Versiya, jurnal va sinxronlash holati", to: "/settings/system" },
    ],
  },
];

export function flatNavigation() {
  return navigationConfig.flatMap((item) =>
    item.to
      ? [{ label: item.label, description: item.description, to: item.to, group: item.label, key: item.key }]
      : item.children.map((child) => ({ ...child, group: item.label, key: item.key })),
  );
}

export function findNavigationSection(pathname) {
  return navigationConfig.find((item) => {
    if (item.to) return pathname === item.to;
    return item.children?.some(
      (child) => pathname === child.to || (child.to !== "/" && pathname.startsWith(`${child.to}/`)),
    );
  });
}

export function findNavigationPage(pathname) {
  const section = findNavigationSection(pathname);
  if (!section) return null;
  if (section.to) return section;
  const exact = section.children.find((child) => pathname === child.to);
  if (exact) return exact;
  return [...section.children]
    .sort((a, b) => b.to.length - a.to.length)
    .find((child) => child.to !== "/" && pathname.startsWith(`${child.to}/`)) || null;
}

export function getNavigationDefaultPath(item) {
  if (!item) return "/dashboard";
  if (item.to) return item.to;
  if (item.key === "sales") return item.children?.find((child) => child.to === "/orders")?.to || item.children?.[0]?.to || "/dashboard";
  return item.children?.[0]?.to || "/dashboard";
}

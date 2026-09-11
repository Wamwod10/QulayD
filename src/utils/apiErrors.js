const STATUS_MESSAGES = {
  400: "So‘rov ma’lumotlarini tekshiring.",
  401: "Sessiya tugagan. Qayta kiring.",
  403: "Bu amal uchun ruxsat yetarli emas.",
  404: "So‘ralgan ma’lumot topilmadi.",
  409: "Ma’lumot boshqa yozuv bilan to‘qnashdi.",
  422: "Kiritilgan ma’lumotlarni tekshiring.",
  429: "Juda ko‘p so‘rov yuborildi. Biroz kuting.",
  500: "Serverda vaqtinchalik muammo yuz berdi.",
};

export function getApiErrorMessage(error, fallback = "Amalni bajarib bo‘lmadi.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return error.data?.message || error.response?.data?.message || error.message || STATUS_MESSAGES[error.status] || fallback;
}

export function normalizeApiError(error) {
  const status = Number(error?.status || error?.response?.status || 0) || null;
  return { status, message: getApiErrorMessage(error, status ? STATUS_MESSAGES[status] : undefined), details: error?.data?.details || error?.response?.data?.details || null };
}

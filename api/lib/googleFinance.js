const SUPPORTED = ["USD", "EUR", "RUB", "GBP", "CNY", "AED"];

function parseGoogleNumber(text) {
  const normalized = String(text || "")
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, "");
  const value = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(value) ? value : null;
}

async function fetchOne(currency) {
  const response = await fetch(`https://www.google.com/finance/quote/${currency}-UZS?hl=en`, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; QulayBusinessOS/1.0)",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`${currency}: Google Finance ${response.status}`);
  const html = await response.text();
  const patterns = [
    /class="YMlKec fxKbKc"[^>]*>([^<]+)</,
    /data-last-price="([^"]+)"/,
    /"price":\{"currencyCode":"UZS","units":"([^"]+)"/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = parseGoogleNumber(match?.[1]);
    if (value && value > 0) return value;
  }
  throw new Error(`${currency}: Google Finance qiymati topilmadi`);
}

export async function getGoogleFinanceRates(requested = SUPPORTED) {
  const currencies = [...new Set(requested.filter((item) => SUPPORTED.includes(item)))];
  const settled = await Promise.allSettled(currencies.map(async (currency) => [currency, await fetchOne(currency)]));
  const rates = { UZS: 1 };
  const errors = {};
  settled.forEach((result, index) => {
    const currency = currencies[index];
    if (result.status === "fulfilled") rates[result.value[0]] = result.value[1];
    else errors[currency] = result.reason?.message || "Kurs olinmadi";
  });
  return {
    source: "Google Finance",
    base: "UZS",
    rates,
    errors,
    updatedAt: new Date().toISOString(),
  };
}

export { SUPPORTED };

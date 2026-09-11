import { getGoogleFinanceRates, SUPPORTED } from "./lib/googleFinance.js";

export default async function handler(req, res) {
  try {
    const requested = String(req.query?.currencies || "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const data = await getGoogleFinanceRates(requested.length ? requested : SUPPORTED);
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json(data);
  } catch (error) {
    res.status(502).json({ success: false, message: error?.message || "Google Finance kurslari olinmadi" });
  }
}

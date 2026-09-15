import { API_BASE_URL } from "../services/baseApi";

export function resolveMediaUrl(value, apiBaseUrl = API_BASE_URL) {
  const url = String(value || "").trim();
  if (!url || !url.startsWith("/uploads/")) return url;

  try {
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(url, new URL(apiBaseUrl, browserOrigin).origin).toString();
  } catch {
    return url;
  }
}

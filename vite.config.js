import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

import { getGoogleFinanceRates, SUPPORTED } from "./api/lib/googleFinance.js";

function googleFinanceDevApi() {
  return {
    name: "qulay-google-finance-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/google-finance", async (req, res) => {
        try {
          const requestUrl = new URL(req.url || "", "http://localhost");
          const requested = String(requestUrl.searchParams.get("currencies") || "")
            .split(",")
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean);
          const data = await getGoogleFinanceRates(requested.length ? requested : SUPPORTED);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(data));
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ success: false, message: error?.message || "Google Finance kurslari olinmadi" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      manifest: false,
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png", "apple-touch-icon.png"],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
    }),
    googleFinanceDevApi(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});

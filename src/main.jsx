import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import AppProviders from "./app/providers";

import "./styles/globals.scss";
import "./styles/premium-theme.scss";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element "#root" topilmadi.');
}

createRoot(rootElement).render(
  createElement(
    StrictMode,
    null,
    createElement(AppProviders, null, createElement(App)),
  ),
);

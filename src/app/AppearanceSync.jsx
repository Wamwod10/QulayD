import { useEffect, useState } from "react";

import { useLocalDb } from "../services/localDb";

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return { r: 34, g: 180, b: 85 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}
function toHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
}
function mix(a, b, amount) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return toHex({ r: x.r + (y.r - x.r) * amount, g: x.g + (y.g - x.g) * amount, b: x.b + (y.b - x.b) * amount });
}

function contrastText(hex) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? "#1c1c1c" : "#ffffff";
}

function AppearanceSync() {
  const appearance = useLocalDb((db) => db.settings.appearance);
  const [systemDark, setSystemDark] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const handler = (event) => setSystemDark(event.matches);
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mode = appearance.themeMode || "light";
    const dark = mode === "dark" || (mode === "system" && systemDark);

    // Qulay premium palette. Legacy green defaults are migrated visually to the
    // new navy identity without breaking a genuinely custom company brand color.
    const configuredBrand = String(appearance.primaryColor || "").toLowerCase();
    const usesQulayDefault = !configuredBrand || configuredBrand === "#22b455" || configuredBrand === "#0a2a43" || configuredBrand === "#1e3a5f";
    const brand = usesQulayDefault ? (dark ? "#1e3a5f" : "#0a2a43") : appearance.primaryColor;
    const customBrand = !usesQulayDefault;
    const accent = customBrand ? brand : (dark ? "#e0b84b" : "#c9a227");
    const info = customBrand ? brand : (dark ? "#62a8ff" : "#2563a8");

    const brandHover = mix(brand, dark ? "#ffffff" : "#000000", dark ? 0.10 : 0.08);
    const brandStrong = mix(brand, dark ? "#ffffff" : "#000000", dark ? 0.18 : 0.16);
    const brandSoft = dark
      ? mix(brand, "#161b22", 0.68)
      : mix(brand, "#ffffff", 0.91);
    const brandBorder = dark
      ? mix(brand, "#2a2f3a", 0.52)
      : mix(brand, "#ffffff", 0.72);
    const accentHover = mix(accent, dark ? "#ffffff" : "#000000", 0.08);
    const accentSoft = customBrand
      ? (dark ? mix(accent, "#161b22", 0.72) : mix(accent, "#ffffff", 0.88))
      : (dark ? "#2b2617" : "#f8f0cf");
    const accentBorder = customBrand
      ? (dark ? mix(accent, "#2a2f3a", 0.46) : mix(accent, "#ffffff", 0.64))
      : (dark ? "#66572d" : "#e7d38b");
    const infoSoft = customBrand
      ? (dark ? mix(info, "#161b22", 0.74) : mix(info, "#ffffff", 0.90))
      : (dark ? "#172b45" : "#eaf2fb");
    const onBrand = contrastText(brand);
    const onAccent = contrastText(accent);

    const configuredPage = String(appearance.pageBackground || "").toLowerCase();
    const usesDefaultPage = !configuredPage || ["#f5f8f6", "#f7f9f8", "#faf9f6"].includes(configuredPage);
    const configuredSurface = String(appearance.surfaceColor || "").toLowerCase();
    const usesDefaultSurface = !configuredSurface || configuredSurface === "#ffffff";

    const palette = dark ? {
      app: "#0d1117",
      surface: "#161b22",
      elevated: "#1b222c",
      mutedSurface: "#1c232c",
      inset: "#11161d",
      text: "#f0f0f0",
      text2: "#a0a0a0",
      text3: "#838b96",
      muted: "#747d89",
      border: "#2a2f3a",
      borderSoft: "#222833",
      borderStrong: "#353c49",
      overlay: "rgba(4,7,11,.78)",
      shadow: "0 18px 50px rgba(0,0,0,.30)",
    } : {
      app: usesDefaultPage ? "#faf9f6" : appearance.pageBackground,
      surface: usesDefaultSurface ? "#ffffff" : appearance.surfaceColor,
      elevated: "#ffffff",
      mutedSurface: "#f6f4ef",
      inset: "#f1efe9",
      text: "#1c1c1c",
      text2: "#5c5c5c",
      text3: "#77746e",
      muted: "#8a867f",
      border: "#e5e2db",
      borderSoft: "#eeeae3",
      borderStrong: "#d8d3c9",
      overlay: "rgba(17,22,27,.40)",
      shadow: appearance.cardShadow === "none" ? "none" : appearance.cardShadow === "soft" ? "0 4px 18px rgba(10,42,67,.045)" : "0 12px 36px rgba(10,42,67,.075)",
    };

    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.themeMode = mode;
    root.style.colorScheme = dark ? "dark" : "light";
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute("content", dark ? "#0d1117" : brand);

    const variables = {
      "--qp-brand-primary": brand,
      "--qp-brand-hover": brandHover,
      "--qp-brand-strong": brandStrong,
      "--qp-brand-soft": brandSoft,
      "--qp-brand-border": brandBorder,
      "--qp-primary": brand,
      "--qp-primary-hover": brandHover,
      "--qp-primary-dark": brandStrong,
      "--qp-primary-soft": brandSoft,
      "--qp-primary-border": brandBorder,
      "--qp-accent": accent,
      "--qp-accent-hover": accentHover,
      "--qp-accent-soft": accentSoft,
      "--qp-accent-border": accentBorder,
      "--qp-accent-text": onAccent,
      "--qp-cta": accent,
      "--qp-cta-hover": accentHover,
      "--qp-cta-text": onAccent,
      "--qp-focus-ring": `color-mix(in srgb, ${brand} ${dark ? 34 : 22}%, transparent)`,
      "--qp-bg-app": palette.app,
      "--qp-bg-surface": palette.surface,
      "--qp-bg-elevated": palette.elevated,
      "--qp-bg-muted": palette.mutedSurface,
      "--qp-bg-inset": palette.inset,
      "--qp-bg": palette.app,
      "--qp-surface": palette.surface,
      "--qp-surface-2": palette.mutedSurface,
      "--qp-text-primary": palette.text,
      "--qp-text-secondary": palette.text2,
      "--qp-text-tertiary": palette.text3,
      "--qp-text-muted": palette.muted,
      "--qp-text": palette.text,
      "--qp-text-2": palette.text2,
      "--qp-text-3": palette.text3,
      "--qp-muted": palette.muted,
      "--qp-border": palette.border,
      "--qp-border-subtle": palette.borderSoft,
      "--qp-border-soft": palette.borderSoft,
      "--qp-border-strong": palette.borderStrong,
      "--qp-page-bg": palette.app,
      "--qp-on-brand": onBrand,
      "--qp-on-accent": onAccent,
      "--qp-shadow-sm": dark ? "0 5px 18px rgba(0,0,0,.18)" : "0 5px 18px rgba(10,42,67,.05)",
      "--qp-shadow-lg": dark ? "0 24px 64px rgba(0,0,0,.38)" : "0 22px 60px rgba(10,42,67,.12)",
      "--qp-overlay": palette.overlay,
      "--qp-card-shadow": palette.shadow,
      "--qp-success": dark ? "#67d391" : "#18794e",
      "--qp-success-soft": dark ? "#173127" : "#e9f6ef",
      "--qp-warning": dark ? "#e0b84b" : "#a56d00",
      "--qp-warning-soft": dark ? "#332b18" : "#fff5dc",
      "--qp-danger": dark ? "#ff7d7d" : "#d64545",
      "--qp-danger-soft": dark ? "#381f24" : "#fff0f0",
      "--qp-info": info,
      "--qp-info-soft": infoSoft,
      "--qp-base-size": `${appearance.baseFontSize || 15}px`,
      "--qp-heading-size": `${appearance.headingSize || 31}px`,
      "--qp-heading-weight": String(appearance.headingWeight || 720),
      "--qp-card-radius": `${appearance.cardRadius || 16}px`,
      "--qp-control-radius": `${appearance.controlRadius || 10}px`,
      "--qp-sidebar-width": `${appearance.sidebarWidth || 236}px`,
      "--qp-sidebar-collapsed-width": "76px",
      "--qp-topbar-height": `${appearance.topbarHeight || 68}px`,
    };
    Object.entries(variables).forEach(([key, value]) => root.style.setProperty(key, value));

    root.dataset.motion = appearance.motion || "subtle";
    root.dataset.tableDensity = appearance.tableDensity || "comfortable";
    root.dataset.sidebarDensity = appearance.sidebarDensity || "comfortable";
    root.dataset.contentWidth = appearance.contentWidth || "fluid";
    root.dataset.showDescriptions = appearance.showDescriptions === false ? "off" : "on";
    root.dataset.showBreadcrumbs = appearance.showBreadcrumbs === false ? "off" : "on";
    root.dataset.stickySectionNavigation = appearance.stickySectionNavigation === false ? "off" : "on";
    root.dataset.showTableSummary = appearance.showTableSummary === false ? "off" : "on";
  }, [appearance, systemDark]);

  return null;
}

export default AppearanceSync;

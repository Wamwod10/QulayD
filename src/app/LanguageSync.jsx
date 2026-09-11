import { useEffect } from "react";

import i18n, { translateRuntimeText } from "../i18n";
import { useLocalDb } from "../services/localDb";

const textState = new WeakMap();
const attrState = new WeakMap();
const TRANSLATED_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-description", "alt"];

function shouldSkip(node) {
  const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return parent?.closest?.("[data-no-translate='true'],script,style,code,pre") != null;
}

function translateTextNode(node, language) {
  if (shouldSkip(node)) return;
  const current = node.nodeValue || "";
  const state = textState.get(node) || { original: current, translated: null };

  // React bir xil text-node ichidagi qiymatni yangilasa, yangi qiymatni source sifatida qabul qilamiz.
  if (state.translated !== null && current !== state.translated && current !== state.original) {
    state.original = current;
  }

  const translated = translateRuntimeText(state.original, language);
  state.translated = translated;
  textState.set(node, state);
  if (current !== translated) node.nodeValue = translated;
}

function translateElementAttributes(element, language) {
  if (shouldSkip(element)) return;
  const stored = attrState.get(element) || {};

  TRANSLATED_ATTRIBUTES.forEach((name) => {
    if (!element.hasAttribute?.(name)) return;
    const current = element.getAttribute(name) || "";
    const state = stored[name] || { original: current, translated: null };
    if (state.translated !== null && current !== state.translated && current !== state.original) {
      state.original = current;
    }
    const translated = translateRuntimeText(state.original, language);
    state.translated = translated;
    stored[name] = state;
    if (current !== translated) element.setAttribute(name, translated);
  });

  attrState.set(element, stored);
}

function translateTree(root, language) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language);
    return;
  }
  if (root.nodeType === Node.ELEMENT_NODE) translateElementAttributes(root, language);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
    else translateElementAttributes(node, language);
    node = walker.nextNode();
  }
}

function LanguageSync() {
  const language = useLocalDb((db) => db.settings.locale?.language || db.settings.company?.language || "uz");

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language === "tg" ? "tg" : language;
    translateTree(document.body, language);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target, language);
          return;
        }
        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target, language);
          return;
        }
        mutation.addedNodes.forEach((node) => translateTree(node, language));
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATED_ATTRIBUTES,
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}

export default LanguageSync;

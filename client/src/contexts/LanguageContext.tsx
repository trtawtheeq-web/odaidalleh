import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AR_EN, translate, type Lang } from "@/lib/i18n";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (s: string) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE"]);
const ATTRS = ["placeholder", "title", "alt", "aria-label"];
const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();

function translated(value: string): string | null {
  const key = value.trim();
  if (!key) return null;
  const en = AR_EN[key];
  if (!en || en === key) return null;
  const at = value.indexOf(key);
  return value.slice(0, at) + en + value.slice(at + key.length);
}

function collectText(root: Node, out: Text[]): void {
  if (root.nodeType === 3) {
    const parent = (root as Text).parentElement;
    if (!parent || !SKIP.has(parent.tagName)) out.push(root as Text);
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = (node as Text).parentElement;
    if (parent && !SKIP.has(parent.tagName)) out.push(node as Text);
    node = walker.nextNode();
  }
}

function collectElements(root: Node, out: Element[]): void {
  if (root.nodeType !== 1) return;
  const el = root as Element;
  out.push(el);
  el.querySelectorAll("*").forEach((child) => out.push(child));
}

function applyAttributes(el: Element): void {
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const en = translated(value);
    if (!en) continue;
    let stored = attrOriginals.get(el);
    if (!stored) {
      stored = new Map();
      attrOriginals.set(el, stored);
    }
    if (!stored.has(attr)) stored.set(attr, value);
    el.setAttribute(attr, en);
  }
}

export function translateTree(root: Node): void {
  const nodes: Text[] = [];
  collectText(root, nodes);
  for (const node of nodes) {
    const raw = node.nodeValue || "";
    const en = translated(raw);
    if (!en) continue;
    textOriginals.set(node, raw);
    node.nodeValue = en;
  }
  const elements: Element[] = [];
  collectElements(root, elements);
  elements.forEach(applyAttributes);
}

export function restoreTree(root: Node): void {
  const nodes: Text[] = [];
  collectText(root, nodes);
  for (const node of nodes) {
    const original = textOriginals.get(node);
    if (original == null) continue;
    if (node.nodeValue === translated(original)) node.nodeValue = original;
  }
  const elements: Element[] = [];
  collectElements(root, elements);
  for (const el of elements) {
    const stored = attrOriginals.get(el);
    if (stored) stored.forEach((value, attr) => el.setAttribute(attr, value));
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return localStorage.getItem("lang") === "en" ? "en" : "ar";
    } catch {
      return "ar";
    }
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("lang", next);
    } catch {
    }
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === "ar" ? "en" : "ar";
      try {
        localStorage.setItem("lang", next);
      } catch {
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const rootEl = document.documentElement;
    (window as unknown as { __lang: Lang }).__lang = lang;
    rootEl.lang = lang;
    rootEl.dir = lang === "ar" ? "rtl" : "ltr";
    if (lang !== "en") {
      restoreTree(document.body);
      return;
    }
    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target);
        else mutation.addedNodes.forEach((node) => translateTree(node));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || !target.closest) return;
      const button = target.closest("button, a");
      if (!button) return;
      const label = (button.textContent || "").trim();
      if (label === "English" || label === "العربية") {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [toggle]);

  const t = useCallback((value: string) => translate(value, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AR_EN, translate, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; toggle: () => void; t: (s: string) => string };
const CtxObj = createContext<Ctx | null>(null);

const ATTRS = ["placeholder", "title", "alt", "aria-label"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
const origText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Map<string, string>>();
const ARABIC = /[\u0600-\u06FF]/;

function trValue(v: string): string | null {
  const key = v.trim();
  const en = key ? AR_EN[key] : undefined;
  if (!en || en === key) return null;
  const i = v.indexOf(key);
  return v.slice(0, i) + en + v.slice(i + key.length);
}

function trNode(n: Text) {
  if (n.parentElement && SKIP.has(n.parentElement.tagName)) return;
  const v = n.nodeValue;
  if (!v) return;
  const out = trValue(v);
  if (!out) return;
  if (!origText.has(n)) origText.set(n, v);
  if (v !== out) n.nodeValue = out;
}

function trAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const out = trValue(v);
    if (!out) continue;
    let m = origAttr.get(el);
    if (!m) { m = new Map(); origAttr.set(el, m); }
    if (!m.has(a)) m.set(a, v);
    el.setAttribute(a, out);
  }
}

function walk(root: Node, fn: (n: Text) => void) {
  if (root.nodeType === 3) return fn(root as Text);
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (SKIP.has(el.tagName)) return;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode())) fn(n as Text);
}

function trTree(root: Node) {
  if (root.nodeType === 1) {
    trAttrs(root as Element);
    (root as Element).querySelectorAll("*").forEach(trAttrs);
  }
  walk(root, trNode);
}

function restoreTree(root: Node) {
  walk(root, (n) => {
    const o = origText.get(n);
    if (o && n.nodeValue !== o) n.nodeValue = o;
  });
  const els = root.nodeType === 1 ? [root as Element, ...(root as Element).querySelectorAll("*")] : [];
  for (const el of els) {
    const m = origAttr.get(el);
    if (m) m.forEach((v, a) => el.setAttribute(a, v));
  }
}

function collectMissing(root: Node) {
  const miss = new Set<string>();
  walk(root, (n) => {
    const v = n.nodeValue?.trim();
    if (v && ARABIC.test(v) && !AR_EN[v]) miss.add(v);
  });
  if (miss.size) console.info("[i18n] untranslated:", Array.from(miss));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "ar");

  const toggle = useCallback(() => {
    setLang((p) => {
      const next = p === "ar" ? "en" : "ar";
      localStorage.setItem("lang", next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const root = document.getElementById("root");
    if (!root) return;
    if (lang === "en") {
      trTree(root);
      if (import.meta.env.DEV) collectMissing(root);
    } else restoreTree(root);
  }, [lang]);

  useEffect(() => {
    if (lang !== "en") return;
    const root = document.getElementById("root");
    if (!root) return;
    const ob = new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") trNode(m.target as Text);
        else m.addedNodes.forEach(trTree);
      }
    });
    ob.observe(root, { childList: true, subtree: true, characterData: true });
    return () => ob.disconnect();
  }, [lang]);

  const t = (s: string) => translate(s, lang);

  return <CtxObj.Provider value={{ lang, toggle, t }}>{children}</CtxObj.Provider>;
}

export const useLanguage = () => {
  const c = useContext(CtxObj);
  if (!c) throw new Error("useLanguage must be used inside LanguageProvider");
  return c;
};

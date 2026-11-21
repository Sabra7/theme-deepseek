"use strict";

/* ============================================================
   Mishkat Theme Studio — application
   ============================================================ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const clone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const rand = (min, max) => min + Math.random() * (max - min);
const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

const STORAGE_KEY = "mishkat-theme-studio/v1";
const SECTIONS = ["direction", "palette", "type", "icons", "form", "brief"];
const SECTION_META = {
  direction: { numAr: "٠١", numEn: "01", titleAr: "الاتجاه", titleEn: "Direction", hintAr: "الهوية، الاسم، والستايل العام.", hintEn: "Identity, name, and the overall style." },
  palette: { numAr: "٠٢", numEn: "02", titleAr: "اللوحة", titleEn: "Palette", hintAr: "السطح والحبر والتمييز. عدّل القيمة أو اشتقّها.", hintEn: "Surface, ink, and accent. Tune or derive every value." },
  type: { numAr: "٠٣", numEn: "03", titleAr: "الخطوط", titleEn: "Typography", hintAr: "عربي + لاتيني + كود، وأحجام القراءة.", hintEn: "Arabic + Latin + code, and reading sizes." },
  icons: { numAr: "٠٤", numEn: "04", titleAr: "الأيقونات", titleEn: "Icons", hintAr: "مكتبة حقيقية، وزن، وحواف. تُستبدل أيقونات DSH فقط عند اختيارها.", hintEn: "A real library, weight, and corners. DSH product icons are replaced only when selected." },
  form: { numAr: "٠٥", numEn: "05", titleAr: "الشكل", titleEn: "Form", hintAr: "الزجاج، الحواف، الظل، الكثافة، والخلفية.", hintEn: "Glass, edges, shadow, density, and backdrop." },
  brief: { numAr: "٠٦", numEn: "06", titleAr: "البريف", titleEn: "Brief", hintAr: "الملخص النهائي وما سأبنيه من أجلك.", hintEn: "The final summary and what I will build for you." }
};

let state;
let saveTimer = null;
let outputTimer = null;
let savedOnLoad = false;
let lastFocused = null;

/* ---------------- language ---------------- */

const L = (ar, en) => (state && state.lang === "en" ? en : ar);
const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeComment = (value) => String(value == null ? "" : value).replace(/\*\//g, "* /").replace(/[\r\n]+/g, " ");
const ico = (name, size = 16) => `<svg class="i" viewBox="0 0 24 24" style="width:${size}px;height:${size}px" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* ---------------- colour math ---------------- */

function parseHex(input) {
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

function toHex({ r, g, b }) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return a;
  const w = clamp(t, 0, 1);
  return toHex({ r: A.r + (B.r - A.r) * w, g: A.g + (B.g - A.g) * w, b: A.b + (B.b - A.b) * w });
}

function rgba(hex, alpha) {
  const c = parseHex(hex);
  if (!c) return `rgba(0,0,0,${alpha})`;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${round(alpha, 3)})`;
}

function luminance(hex) {
  const c = parseHex(hex);
  if (!c) return 0;
  const channel = (v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

function contrast(a, b) {
  const A = luminance(a);
  const B = luminance(b);
  const light = Math.max(A, B);
  const dark = Math.min(A, B);
  return (light + 0.05) / (dark + 0.05);
}

function pickOn(bg) {
  return contrast("#ffffff", bg) >= contrast("#071521", bg) ? "#ffffff" : "#071521";
}

function ensureContrast(fg, bg, min = 4.5) {
  if (contrast(fg, bg) >= min) return fg;
  const target = luminance(bg) > 0.4 ? "#000000" : "#ffffff";
  let best = fg;
  for (let i = 1; i <= 24; i += 1) {
    best = mix(fg, target, i / 24);
    if (contrast(best, bg) >= min) return best;
  }
  return target;
}

function rotateHue(hex, degrees) {
  const c = parseHex(hex);
  if (!c) return hex;
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = (h + degrees / 360 + 1) % 1;
  const hue = (p, q, t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  let out;
  if (s === 0) out = { r: l * 255, g: l * 255, b: l * 255 };
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    out = { r: hue(p, q, h + 1 / 3) * 255, g: hue(p, q, h) * 255, b: hue(p, q, h - 1 / 3) * 255 };
  }
  return toHex(out);
}

/* ---------------- state ---------------- */

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return clone(patch === undefined ? base : patch);
  if (base && patch && typeof base === "object" && typeof patch === "object") {
    const out = { ...base };
    for (const key of Object.keys(patch)) out[key] = deepMerge(base[key], patch[key]);
    return out;
  }
  return patch === undefined ? base : patch;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    const merged = deepMerge(clone(DEFAULT_STATE), parsed);
    merged.lang = merged.lang === "en" ? "en" : "ar";
    merged.target = ["dsh", "web", "vencord"].includes(merged.target) ? merged.target : "dsh";
    merged.section = SECTIONS.includes(merged.section) ? merged.section : "direction";
    merged.preset = PRESETS[merged.preset] ? merged.preset : "fayruz";
    merged.paletteMode = merged.paletteMode === "light" ? "light" : "dark";
    merged.preview = merged.preview || {};
    merged.preview.mode = merged.preview.mode === "light" ? "light" : "dark";
    merged.preview.lang = merged.preview.lang === "en" ? "en" : "ar";
    merged.preview.view = ["chat", "settings", "components"].includes(merged.preview.view) ? merged.preview.view : "chat";
    merged.preview.mobile = Boolean(merged.preview.mobile);
    merged.meta = { ...clone(DEFAULT_STATE.meta), ...(merged.meta && typeof merged.meta === "object" ? merged.meta : {}) };
    if (!Array.isArray(merged.meta.tags)) merged.meta.tags = [];
    if (typeof merged.meta.notes !== "string") merged.meta.notes = "";
    merged.meta.slug = slugify(merged.meta.slug || merged.meta.nameEn || "theme");
    merged.colors = merged.colors && typeof merged.colors === "object" ? merged.colors : clone(DEFAULT_STATE.colors);
    merged.colors.light = merged.colors.light && typeof merged.colors.light === "object" ? { ...PRESETS.fayruz.light, ...merged.colors.light } : { ...PRESETS.fayruz.light };
    merged.colors.dark = merged.colors.dark && typeof merged.colors.dark === "object" ? { ...PRESETS.fayruz.dark, ...merged.colors.dark } : { ...PRESETS.fayruz.dark };
    merged.icons = merged.icons || {};
    merged.icons.selected = Array.isArray(merged.icons.selected) ? merged.icons.selected.filter((id) => ICON_META.some((m) => m.id === id)) : ICON_META.map((m) => m.id);
    merged.overrides = merged.overrides || { light: {}, dark: {} };
    merged.overrides.light = merged.overrides.light || {};
    merged.overrides.dark = merged.overrides.dark || {};
    merged.targetOptions = merged.targetOptions || clone(DEFAULT_STATE.targetOptions);
    merged.targetOptions.dsh = { ...DEFAULT_STATE.targetOptions.dsh, ...(merged.targetOptions.dsh || {}) };
    merged.targetOptions.web = { ...DEFAULT_STATE.targetOptions.web, ...(merged.targetOptions.web || {}) };
    merged.targetOptions.vencord = { ...DEFAULT_STATE.targetOptions.vencord, ...(merged.targetOptions.vencord || {}) };
    savedOnLoad = true;
    return merged;
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function scheduleSave() {
  setSaveState(L("يحفظ…", "Saving…"));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 320);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveState(L("يُحفظ محليًا", "Saved locally"));
  } catch {
    setSaveState(L("هذه الجلسة فقط", "Session only"));
  }
}

function setSaveState(text) {
  const el = $("#save-state");
  if (!el) return;
  el.textContent = text;
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== "object") cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

function slugify(value) {
  const out = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return out || "theme";
}

/* ---------------- palette ---------------- */

const ANCHOR_KEYS = new Set(["bg", "surface", "text", "accent", "accentText", "sidebar", "code", "warn", "error", "success"]);

function makePalette(mode) {
  const a = state.colors[mode] || state.colors.dark;
  const dark = mode === "dark";
  const borderStrength = Number(state.form.borderStrength ?? 55);
  const borderAlpha = 0.03 + (borderStrength / 100) * 0.17;
  const surfaceAlt = mix(a.surface, a.text, dark ? 0.1 : 0.055);
  const text2 = mix(a.text, a.bg, dark ? 0.3 : 0.28);
  const text3 = mix(a.text, a.bg, dark ? 0.5 : 0.46);
  const border = rgba(a.text, borderAlpha);
  const accentHover = dark ? mix(a.accent, "#ffffff", 0.16) : mix(a.accent, "#000000", 0.13);
  const accentText = state.autoAccent ? pickOn(a.accent) : (a.accentText || pickOn(a.accent));
  const code = a.code || mix(a.bg, a.surface, 0.55);
  const codeBanner = mix(code, a.text, 0.06);
  const sidebar = a.sidebar || mix(a.bg, a.surface, 0.55);
  const bubble = mix(a.surface, a.accent, 0.055);
  const menu = mix(a.surface, a.bg, 0.1);
  const edge = dark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.72)";
  const edgeSoft = dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.3)";
  return {
    mode, ...a, surfaceAlt, text2, text3, border, accentHover, accentText, code, codeBanner, sidebar, bubble, menu,
    borderStrength,
    accentSoft: rgba(a.accent, dark ? 0.16 : 0.12),
    accentGlow: rgba(a.accent, dark ? 0.28 : 0.2),
    successSoft: rgba(a.success, 0.14),
    warnSoft: rgba(a.warn, 0.16),
    errorSoft: rgba(a.error, 0.14),
    glass: rgba(a.surface, dark ? 0.56 : 0.7),
    glass2: rgba(a.surface, dark ? 0.72 : 0.84),
    edge,
    edgeSoft,
    scrollbar: rgba(a.text, 0.2),
    appBg: state.backdrop.kind === "none" ? a.bg : `linear-gradient(180deg, ${rgba(a.bg, 0.18)}, ${rgba(a.bg, 0.56)})`,
    wallScrim: state.backdrop.kind === "none" ? "transparent" : `linear-gradient(180deg, ${rgba(a.bg, 0.06)}, ${rgba(a.bg, 0.36)})`
  };
}

function getPalette(mode) {
  const base = makePalette(mode);
  const ov = state.overrides[mode] || {};
  for (const key of Object.keys(ov)) {
    if (typeof ov[key] === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(ov[key])) base[key] = ov[key];
  }
  if (state.autoAccent) base.accentText = pickOn(base.accent);
  return base;
}

function getFont(list, name) {
  return list.find((f) => f.name === name) || list[0];
}

function firstFamily(stack) {
  return stack.split(",")[0].trim();
}

function fontStack(lang) {
  const ar = getFont(ARABIC_FONTS, state.type.arabic);
  const la = getFont(LATIN_FONTS, state.type.latin);
  if (lang === "en") return `${firstFamily(la.stack)}, ${firstFamily(ar.stack)}, "Segoe UI", Arial, sans-serif`;
  return `${firstFamily(ar.stack)}, ${firstFamily(la.stack)}, "Segoe UI", Tahoma, sans-serif`;
}

function codeStack() {
  const code = getFont(CODE_FONTS, state.type.code);
  return `${firstFamily(code.stack)}, Consolas, "SFMono-Regular", monospace`;
}

const GENERIC_FONT_FAMILIES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "-apple-system", "blinkmacsystemfont"]);

function cssFontList(names) {
  return names.map((n) => (GENERIC_FONT_FAMILIES.has(String(n).toLowerCase()) ? n : `"${n}"`)).join(", ");
}

function settingsFontList() {
  return [state.type.arabic, state.type.latin, "Segoe UI", "Tahoma", "sans-serif"].join(", ");
}

function settingsCodeList() {
  return [state.type.code, "Consolas", "monospace"].join(", ");
}

/* ---------------- icon rendering ---------------- */

function applyIconStyle(svg) {
  if (!svg) return "";
  let out = svg;
  const pack = state.icons.pack;
  const stroke = Number(state.icons.stroke) || 1.75;
  if (pack === "lucide" || pack === "tabler" || pack === "hero") {
    out = out.replace(/stroke-width="[^"]*"/g, `stroke-width="${stroke}"`);
    if (state.icons.corner === "square") {
      out = out.replace(/stroke-linecap="round"/g, 'stroke-linecap="square"').replace(/stroke-linejoin="round"/g, 'stroke-linejoin="miter"');
    }
  }
  return out;
}

function iconSvg(concept) {
  const pack = state.icons.pack;
  const data = ICON_DATA[concept] || {};
  return applyIconStyle(data[pack] || data.lucide || "");
}

/* ---------------- preview ---------------- */

function wallpaperValue(mode) {
  const b = state.backdrop;
  if (b.kind === "image" && sanitizeImageUrl(b.url)) return `url("${sanitizeImageUrl(b.url)}")`;
  if (b.kind === "preset" && BACKDROPS[b.preset]) return BACKDROPS[b.preset][mode] || BACKDROPS[b.preset].dark;
  return "none";
}

function sanitizeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value || /["'\\\n\r]/.test(value)) return "";
  if (!/^(https?:\/\/|data:image\/)/i.test(value)) return "";
  return value;
}

function applyPreview() {
  const mode = state.preview.mode;
  const p = getPalette(mode);
  const pv = $("#preview");
  if (!pv) return;

  pv.dataset.target = state.target;
  pv.dataset.mode = mode;
  pv.dataset.plang = state.preview.lang;
  pv.dataset.view = state.preview.view;
  pv.dataset.mobile = String(state.preview.mobile);
  pv.dataset.texture = state.form.texture || "none";
  pv.dataset.density = state.form.density || "comfortable";
  pv.dataset.border = state.form.border || "hairline";
  pv.lang = state.preview.lang;
  pv.dir = state.preview.lang === "ar" ? "rtl" : "ltr";
  if (!state.form.glassEdges) {
    p.edge = "transparent";
    p.edgeSoft = "transparent";
  }

  const radius = Number(state.form.radius) || 0;
  const vars = {
    "--pv-bg": p.bg,
    "--pv-surface": p.surface,
    "--pv-surface-alt": p.surfaceAlt,
    "--pv-text": p.text,
    "--pv-text2": p.text2,
    "--pv-text3": p.text3,
    "--pv-border": p.border,
    "--pv-accent": p.accent,
    "--pv-accent-text": p.accentText,
    "--pv-accent-hover": p.accentHover,
    "--pv-accent-soft": p.accentSoft,
    "--pv-accent-glow": p.accentGlow,
    "--pv-sidebar": p.sidebar,
    "--pv-bubble": p.bubble,
    "--pv-code": p.code,
    "--pv-code-banner": p.codeBanner,
    "--pv-warn": p.warn,
    "--pv-warn-soft": p.warnSoft,
    "--pv-error": p.error,
    "--pv-success": p.success,
    "--pv-success-soft": p.successSoft,
    "--pv-glass": p.glass,
    "--pv-glass-2": p.glass2,
    "--pv-edge": p.edge,
    "--pv-edge-soft": p.edgeSoft,
    "--pv-scrollbar": p.scrollbar,
    "--pv-app-bg": p.appBg,
    "--pv-wall": wallpaperValue(mode),
    "--pv-wall-scrim": p.wallScrim,
    "--pv-dim": state.backdrop.kind === "none" ? "1" : String(state.backdrop.dim),
    "--pv-radius": `${radius}px`,
    "--pv-radius-sm": `${Math.max(2, radius - 6)}px`,
    "--pv-blur": `${Number(state.form.blur) || 0}px`,
    "--pv-saturate": `${Number(state.form.saturate) || 100}%`,
    "--pv-shadow": SHADOWS[state.form.shadow] || SHADOWS.soft,
    "--pv-font": fontStack(state.preview.lang),
    "--pv-font-code": codeStack(),
    "--pv-size": `${Number(state.type.size) || 15}px`,
    "--pv-leading": String(Number(state.type.leading) || 1.85),
    "--pv-weight": String(Number(state.type.weight) || 600),
    "--pv-motion": `${MOTION_MS[state.form.motion] ?? 220}ms`
  };
  for (const [key, value] of Object.entries(vars)) pv.style.setProperty(key, value);

  updateFontLink();
  renderPreviewContent();
  renderStage();
  renderContrast();
  if (state.section === "palette") updateContrastPanel();
}

function updateFontLink() {
  const link = $("#studio-fonts");
  if (!link) return;
  const base = [
    "IBM+Plex+Sans+Arabic:wght@300;400;500;600;700",
    "Space+Grotesk:wght@400;500;600;700",
    "IBM+Plex+Mono:wght@400;500"
  ];
  const families = [...base];
  if (state.type.loadFonts) {
    const ar = getFont(ARABIC_FONTS, state.type.arabic);
    const la = getFont(LATIN_FONTS, state.type.latin);
    const code = getFont(CODE_FONTS, state.type.code);
    for (const f of [ar, la, code]) {
      if (f && f.google && !families.includes(f.google)) families.push(f.google);
    }
  }
  const url = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
  if (link.getAttribute("href") !== url) link.setAttribute("href", url);
}

function renderPreviewContent() {
  const ar = state.preview.lang === "ar";
  const target = state.target;
  const p = getPalette(state.preview.mode);

  const brand = target === "vencord" ? "ClearVision" : target === "web" ? "Mishkat Studio" : "DeepSeek Harness";
  setText("#pv-brand-name", brand);
  setText("#pv-new-label", ar ? (target === "vencord" ? "قناة جديدة" : target === "web" ? "مشروع جديد" : "محادثة جديدة") : (target === "vencord" ? "New channel" : target === "web" ? "New project" : "New chat"));
  setText("#pv-search-label", ar ? (target === "vencord" ? "ابحث في القنوات" : target === "web" ? "ابحث في الصفحات" : "ابحث في المحادثات") : (target === "vencord" ? "Search channels" : target === "web" ? "Search pages" : "Search chats"));
  setText("#pv-user-name", ar ? "محمد" : "Moham");
  setText("#pv-user-status", ar ? "متصل" : "Online");
  setText("#pv-head-eyebrow", ar ? (target === "vencord" ? "قناة نصية" : target === "web" ? "مساحة التصميم" : "مساحة العمل") : (target === "vencord" ? "TEXT CHANNEL" : target === "web" ? "DESIGN SPACE" : "WORKSPACE"));
  setText("#pv-head-title", ar ? (target === "vencord" ? "قناة التصميم" : target === "web" ? "استوديو مشكاة" : "استوديو الثيم") : (target === "vencord" ? "#design" : target === "web" ? "Mishkat Studio" : "Theme Atelier"));
  setText("#pv-model-chip", target === "vencord" ? "ClearVision" : target === "web" ? (ar ? "نظام التصميم" : "Design system") : "DeepSeek Flash");

  const listLabels = ar ? { dsh: "المحادثات", web: "الصفحات", vencord: "القنوات" } : { dsh: "CHATS", web: "PAGES", vencord: "CHANNELS" };
  const items = target === "vencord"
    ? (ar ? [["#design", "chat"], ["#typography", "type"], ["#icons", "grid"], ["#feedback", "bell"]] : [["#design", "chat"], ["#typography", "type"], ["#icons", "grid"], ["#feedback", "bell"]])
    : target === "web"
      ? (ar ? [["الرئيسية", "home"], ["الأعمال", "grid"], ["عن الاستوديو", "user"], ["اتصل", "chat"]] : [["Home", "home"], ["Work", "grid"], ["About", "user"], ["Contact", "chat"]])
      : (ar ? [["استوديو الثيم", "chat"], ["زجاج فيروزي", "droplet"], ["مراجعة الواجهة", "eye"], ["الخط العربي", "type"], ["ملاحظات الإصدار", "file"]] : [["Theme Atelier", "chat"], ["Aquamarine glass", "droplet"], ["Interface review", "eye"], ["Arabic type", "type"], ["Release notes", "file"]]);
  $("#pv-list").innerHTML = `<div class="pv-list-label"><span>${esc(listLabels[target])}</span><span>${items.length}</span></div>` + items.map(([label, icon], i) => `<div class="pv-item${i === 0 ? " active" : ""}">${ico(icon, 13)}<span dir="auto">${esc(label)}</span>${i === 2 ? '<i class="pv-item-dot"></i>' : ""}</div>`).join("");

  $("#pv-members").innerHTML = `<div class="pv-list-label"><span>${ar ? "الأعضاء" : "MEMBERS"}</span><span>5</span></div>` +
    (ar ? [["محمد", "م", ""], ["ليان", "ل", ""], ["نورة", "ن", "idle"], ["عبدالله", "ع", "off"], ["سارة", "س", ""]] : [["Moham", "M", ""], ["Layan", "L", ""], ["Noura", "N", "idle"], ["Abdullah", "A", "off"], ["Sara", "S", ""]])
      .map(([name, letter, status]) => `<div class="pv-member"><div class="pv-avatar">${esc(letter)}</div><b>${esc(name)}</b><span class="status ${status}"></span></div>`).join("");

  const userMsg = ar
    ? (target === "vencord" ? "خلّ الزجاج يبان، بس لا يصرخ." : target === "web" ? "مساحة هادئة للفكرة قبل أن تصبح كودًا." : "أريد واجهة هادئة تشبه ضوء البحر قبل الغروب، وتُقرأ فيها العربية طويلًا بلا تعب.")
    : (target === "vencord" ? "Let the glass show, but don't let it shout." : target === "web" ? "A quiet room for an idea before it becomes code." : "I want a quiet interface like sea light before sunset — and Arabic that reads comfortably for a long time.");
  const aiMsg = ar
    ? (target === "vencord" ? "طبقة زجاج واحدة، حدّ مضيء، ولهجة فيروزية. الخلفية تبقى حادة خلف الرسالة." : target === "web" ? "ابدأ بأرض دافئة، لهجة باردة واحدة، وزوج خطوط يحمل اللغتين." : "سأبدأ من طبقة زجاج واحدة: سطح شفاف، حبر دافئ، ولمسة فيروزية واحدة. القراءة أولًا، ثم الأثر.")
    : (target === "vencord" ? "One blur, one lit edge, one aquamarine note. The wallpaper stays sharp behind the message." : target === "web" ? "Start with a warm ground, one cool accent, and a type pair that can carry both languages." : "I'd start with one glass layer: a translucent surface, warm ink, and a single aquamarine note. Reading first, then the effect.");
  setText("#pv-user-msg", userMsg);
  setText("#pv-ai-msg", aiMsg);
  setText("#pv-time", ar ? "الآن" : "Now");
  setText("#pv-tool-title", ar ? (target === "vencord" ? "قرأ ١٢ رسالة" : "قرأ ١٢ ملفًا") : (target === "vencord" ? "Read 12 messages" : "Read 12 files"));
  setText("#pv-tool-sub", ar ? "استخرج ٣ أنماط من الواجهة" : "Extracted 3 UI patterns");
  setText("#pv-tool-badge", ar ? "تم" : "Done");
  setText("#pv-copy-label", ar ? "نسخ" : "Copy");
  setText("#pv-retry-label", ar ? "إعادة" : "Retry");

  const codeLine = target === "vencord"
    ? `<span class="tok-key">--main-color</span>: <span class="tok-val">${esc(p.accent)}</span>;`
    : target === "web"
      ? `<span class="tok-key">--mk-bg</span>: <span class="tok-val">${esc(p.bg)}</span>;`
      : `<span class="tok-key">--dsw-alias-bg-base</span>: <span class="tok-val">${esc(p.bg)}</span>;`;
  $("#pv-code").innerHTML = codeLine;

  setText("#pv-settings-title", ar ? "المظهر" : "Appearance");
  setText("#pv-settings-sub", ar ? "اختر الوضع، الخط، ونغمة السطح." : "Choose the mode, the type, and the surface tone.");
  setText("#pv-setting-mode", ar ? "الوضع" : "Mode");
  setText("#pv-setting-mode-sub", ar ? "داكن · متوافق مع النظام" : "Dark · follows system");
  setText("#pv-setting-font", ar ? "الخط" : "Typeface");
  setText("#pv-font-label", `${state.type.arabic} · ${state.type.size}px`);
  setText("#pv-setting-tokens", ar ? "ألوان الثيم" : "Theme colours");
  setText("#pv-setting-tokens-sub", ar ? "السطح، الحبر، التمييز" : "Surface, ink, accent");
  $$("#pv-settings .pv-cube").forEach((cube) => {
    cube.classList.toggle("active", cube.dataset.cube === state.preview.mode);
    const label = cube.querySelector("span");
    if (label) label.textContent = cube.dataset.cube === "light" ? (ar ? "فاتح" : "Light") : (ar ? "داكن" : "Dark");
  });
  const fontSample = $("#pv-font-sample");
  if (fontSample) {
    fontSample.textContent = ar ? "ضوءٌ هادئ على ماءٍ عميق." : "A quiet light over deep water.";
    fontSample.innerHTML += `<small>${esc(state.type.arabic)} · ${state.type.size}px · ${state.type.leading}</small>`;
  }
  const swatches = [["bg", p.bg], ["surface", p.surface], ["accent", p.accent], ["sidebar", p.sidebar], ["code", p.code], ["text", p.text]];
  $("#pv-swatches").innerHTML = swatches.map(([name, value]) => `<div class="pv-swatch" style="background:${esc(value)}" title="${name}"><span>${esc(value.replace("#", ""))}</span></div>`).join("");

  setText("#pv-components-title", ar ? "عناصر الواجهة" : "Interface components");
  setText("#pv-btn-save", ar ? "حفظ" : "Save");
  setText("#pv-btn-cancel", ar ? "إلغاء" : "Cancel");
  setText("#pv-btn-try", ar ? "تجربة" : "Try");
  setText("#pv-badge-ok", ar ? "نشط" : "Active");
  setText("#pv-badge-warn", ar ? "مسودة" : "Draft");
  setText("#pv-badge-acc", ar ? "ثيم" : "Theme");
  setText("#pv-card1-title", ar ? "سطح زجاجي" : "Glass surface");
  setText("#pv-card1-sub", ar ? "طبقة واحدة، حدود مضيئة، وظل عميق." : "One layer, lit edges, deep shadow.");
  setText("#pv-card2-title", ar ? "حبر دافئ" : "Warm ink");
  setText("#pv-card2-sub", ar ? "تباين مريح للقراءة الطويلة." : "Comfortable contrast for long reading.");
  const inputDemo = $("#pv-input-demo");
  if (inputDemo) inputDemo.placeholder = ar ? "اكتب رسالة…" : "Write a message…";
  const composer = $("#pv-composer-placeholder");
  if (composer) composer.placeholder = ar ? (target === "vencord" ? "رسالة إلى \u2066#design\u2069" : "اكتب رسالة…") : (target === "vencord" ? "Message #design" : "Write a message…");
  const headTitle = $("#pv-head-title");
  if (headTitle) headTitle.dir = target === "vencord" ? "ltr" : "auto";
  const componentIcons = state.icons.selected.slice(0, 8);
  $("#pv-component-icons").innerHTML = componentIcons.map((id) => `<span class="pv-icon" title="${esc(id)}">${iconSvg(id)}</span>`).join("");
}

function setText(selector, text) {
  const el = $(selector);
  if (el) el.textContent = text;
}

function renderStage() {
  const ar = state.lang === "ar";
  const targetLabel = state.target === "dsh" ? "DSH" : state.target === "web" ? "WEB" : "VENCORD";
  const viewLabel = ar
    ? (state.preview.view === "chat" ? "واجهة المحادثة" : state.preview.view === "settings" ? "الإعدادات" : "عناصر الواجهة")
    : (state.preview.view === "chat" ? "Chat surface" : state.preview.view === "settings" ? "Settings" : "Components");
  setText("#stage-target-label", targetLabel);
  setText("#stage-view-label", viewLabel);
  setText("#stage-sub", ar
    ? (state.target === "dsh" ? "عدّل أي شيء وشاهده يتنفس في واجهة DSH." : state.target === "web" ? "عدّل أي شيء وشاهده في واجهة ويب حقيقية." : "عدّل أي شيء وشاهده في واجهة Discord زجاجية.")
    : (state.target === "dsh" ? "Change anything and watch it breathe inside DSH." : state.target === "web" ? "Change anything and see it in a real web surface." : "Change anything and see it in a glass Discord surface."));
  const url = state.target === "dsh" ? "dsh://workspace/harnes-learn" : state.target === "vencord" ? "discord://ClearVision/design" : "https://mishkat.studio";
  setText("#frame-url", url);
  const presetName = state.preset === "custom" ? (ar ? "مخصص" : "Custom") : (ar ? PRESETS[state.preset]?.nameAr : PRESETS[state.preset]?.nameEn) || "—";
  setText("#pv-preset", presetName);
  setText("#status-target", targetLabel);
  setText("#status-preset", presetName);
  setText("#status-mode", ar ? (state.preview.mode === "dark" ? "داكن" : "فاتح") : (state.preview.mode === "dark" ? "Dark" : "Light"));
  const note = state.preset === "fayruz"
    ? (ar ? `مستوحى من ClearVision V7 Blur · زجاج ${state.form.blur}px` : `Inspired by ClearVision V7 Blur · glass ${state.form.blur}px`)
    : (ar ? `زجاج ${state.form.blur}px · نصف قطر ${state.form.radius}px` : `Glass ${state.form.blur}px · radius ${state.form.radius}px`);
  setText("#stage-note", note);
  $$(".target-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.target === state.target));
  $$("[data-preview-view]").forEach((btn) => btn.classList.toggle("active", btn.dataset.previewView === state.preview.view));
  $$("[data-preview-lang]").forEach((btn) => btn.classList.toggle("active", btn.dataset.previewLang === state.preview.lang));
  $$("[data-preview-mode]").forEach((btn) => btn.classList.toggle("active", btn.dataset.previewMode === state.preview.mode));
  $("#mobile-toggle")?.classList.toggle("active", state.preview.mobile);
  $("#preview-frame")?.classList.toggle("mobile", state.preview.mobile);
}

function contrastReport(mode) {
  const p = getPalette(mode);
  return {
    body: { ratio: contrast(p.text, p.bg), label: L("نص", "Text") },
    secondary: { ratio: contrast(p.text2, p.surface), label: L("ثانوي", "Secondary") },
    accent: { ratio: contrast(p.accentText, p.accent), label: L("تمييز", "Accent") },
    p
  };
}

function grade(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

function renderContrast() {
  const report = contrastReport(state.preview.mode);
  const items = [["body", report.body], ["secondary", report.secondary], ["accent", report.accent]];
  const badges = items.map(([key, item]) => {
    const ok = item.ratio >= 4.5;
    return `<span class="badge ${ok ? "pass" : "fail"}" title="${esc(grade(item.ratio))}"><span class="badge-dot"></span><span>${esc(item.label)} ${round(item.ratio, 1)}</span></span>`;
  }).join("");
  const holder = $("#contrast-badges");
  if (holder) holder.innerHTML = badges;
  const status = $("#status-contrast");
  if (status) {
    const allOk = items.every(([, item]) => item.ratio >= 4.5);
    status.innerHTML = `<span class="badge ${allOk ? "pass" : "fail"}"><span class="badge-dot"></span><span>${allOk ? "AA" : "Fix"}</span></span>`;
  }
}

function updateContrastPanel() {
  const holder = $("#contrast-lines");
  if (!holder) return;
  const report = contrastReport(state.paletteMode);
  const rows = [["body", report.body], ["secondary", report.secondary], ["accent", report.accent]];
  holder.innerHTML = rows.map(([, item]) => {
    const ok = item.ratio >= 4.5;
    return `<div class="contrast-line"><span>${esc(item.label)}</span><span><b>${round(item.ratio, 1)}:1</b> <span class="contrast-status ${ok ? "ok" : "no"}"><span class="dot"></span>${ok ? "AA" : "Fix"}</span></span></div>`;
  }).join("");
}

/* ---------------- inspector templates ---------------- */

function presetCard(id) {
  const p = PRESETS[id];
  const name = state.lang === "ar" ? p.nameAr : p.nameEn;
  const tag = state.lang === "ar" ? p.tagAr : p.tagEn;
  return `<button type="button" class="preset-card${state.preset === id ? " active" : ""}" data-preset="${id}" style="--p-bg:${p.dark.bg};--p-surface:${p.dark.surface};--p-accent:${p.dark.accent};--p-sidebar:${p.dark.sidebar}">
    <span class="preset-prev"><span class="pp-side"></span><span class="pp-dot"></span></span>
    <span class="preset-meta"><span class="preset-name">${esc(name)}</span><svg class="preset-check" viewBox="0 0 24 24"><use href="#i-check"/></svg></span>
    <span class="preset-tag">${esc(tag)}</span>
  </button>`;
}

function textField(labelAr, labelEn, path, value, placeholderAr, placeholderEn, hintAr, hintEn, mono = false) {
  const label = state.lang === "ar" ? labelAr : labelEn;
  const hint = state.lang === "ar" ? hintAr : hintEn;
  const placeholder = state.lang === "ar" ? placeholderAr : placeholderEn;
  return `<label class="field"><span class="field-head"><span class="field-label">${esc(label)}</span></span><input class="input ${mono ? "mono" : ""}" type="text" data-text="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}" spellcheck="false">${hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}</label>`;
}

function colorRow(mode, key, labelAr, labelEn, hintAr, hintEn) {
  const p = getPalette(mode);
  const value = p[key] || "#000000";
  const isDerived = !ANCHOR_KEYS.has(key);
  const hasOverride = Boolean(state.overrides[mode]?.[key]);
  const label = state.lang === "ar" ? labelAr : labelEn;
  const hint = state.lang === "ar" ? hintAr : hintEn;
  const isAutoAccent = key === "accentText" && state.autoAccent;
  return `<div class="color-row">
    <span class="color-meta"><span class="color-name">${esc(label)}${isDerived ? '<i class="derived" title="derived"></i>' : ""}</span><span class="color-hint">${esc(hint || (isDerived ? (state.lang === "ar" ? "مشتق · عدّله لتثبيته" : "Derived · edit to pin") : ""))}</span></span>
    <span class="color-controls">
      ${isDerived && hasOverride ? `<button type="button" class="color-reset" data-color-reset="${mode}.${key}" title="Reset derived" aria-label="Reset derived">${ico("reset", 11)}</button>` : ""}
      <span class="swatch" style="--sw:${esc(value)}"><input type="color" data-color="${mode}.${key}" value="${esc(value)}" aria-label="${esc(label)}" ${isAutoAccent ? "disabled" : ""}></span>
      <input class="hex" type="text" data-hex="${mode}.${key}" value="${esc(value)}" aria-label="${esc(label)} hex" spellcheck="false" ${isAutoAccent ? "disabled" : ""}>
    </span>
  </div>`;
}

function rangeField(labelAr, labelEn, path, min, max, step, value, unit = "", hintAr = "", hintEn = "") {
  const label = state.lang === "ar" ? labelAr : labelEn;
  const hint = state.lang === "ar" ? hintAr : hintEn;
  const progress = ((Number(value) - min) / (max - min)) * 100;
  return `<div class="range-field">
    <div class="range-top"><span class="field-label">${esc(label)}</span><span class="range-val" data-range-value="${path}">${value}${unit}</span></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${path}" data-unit="${unit}" style="--range-progress:${progress}%" aria-label="${esc(label)}">
    ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}
  </div>`;
}

function switchRow(labelAr, labelEn, path, value, hintAr = "", hintEn = "") {
  const label = state.lang === "ar" ? labelAr : labelEn;
  const hint = state.lang === "ar" ? hintAr : hintEn;
  return `<div class="switch-row"><span class="switch-copy"><b>${esc(label)}</b>${hint ? `<span>${esc(hint)}</span>` : ""}</span><button type="button" class="switch ${value ? "on" : ""}" data-switch="${path}" aria-pressed="${value}" aria-label="${esc(label)}"></button></div>`;
}

function segField(labelAr, labelEn, path, options, value) {
  const label = state.lang === "ar" ? labelAr : labelEn;
  return `<div class="field"><span class="field-label">${esc(label)}</span><div class="seg block">${options.map((o) => `<button type="button" class="${o.value === value ? "active" : ""}" data-setpath="${path}" data-value="${o.value}">${state.lang === "ar" ? o.ar : o.en}</button>`).join("")}</div></div>`;
}

function selectField(labelAr, labelEn, path, options, value, specimen = "") {
  const label = state.lang === "ar" ? labelAr : labelEn;
  return `<label class="font-field"><span class="field-label">${esc(label)}</span><select class="select" data-select="${path}" aria-label="${esc(label)}">${options.map((o) => `<option value="${esc(o.name)}" ${o.name === value ? "selected" : ""}>${esc(state.lang === "ar" ? (o.labelAr || o.name) : o.name)}</option>`).join("")}</select>${specimen}</label>`;
}

function renderDirection() {
  const ar = state.lang === "ar";
  const t = state.target;
  return `<div class="stack">
    <div class="section-label">${ar ? "الستايل" : "STYLE"}</div>
    <div class="preset-grid">${Object.keys(PRESETS).map(presetCard).join("")}</div>
    ${state.preset === "fayruz" ? `<div class="preset-note">${ico("spark", 12)}<span>${ar ? "المرجع: ClearVision V7 Blur — زجاج، حواف مضيئة، وضوء بارد." : "Reference: ClearVision V7 Blur — glass, lit edges, cool light."}</span></div>` : ""}
    <div class="divider"></div>
    <div class="grid-2">
      ${textField("الاسم العربي", "Arabic name", "meta.nameAr", state.meta.nameAr, "فيروز", "Fayruz")}
      ${textField("الاسم الإنجليزي", "English name", "meta.nameEn", state.meta.nameEn, "Fayruz", "Fayruz")}
    </div>
    ${textField("المعرّف", "Slug", "meta.slug", state.meta.slug, "fayruz", "fayruz", ar ? "أحرف صغيرة وأرقام وشرطات فقط." : "Lowercase letters, numbers, and hyphens only.", "", true)}
    <div class="grid-2">
      ${textField("الوصف العربي", "Arabic description", "meta.descAr", state.meta.descAr, "وصف قصير…", "Short description…")}
      ${textField("الوصف الإنجليزي", "English description", "meta.descEn", state.meta.descEn, "Short description…", "Short description…")}
    </div>
    ${textField("الكلمات المفتاحية", "Mood tags", "meta.tagsText", (state.meta.tags || []).join(ar ? "، " : ", "), "هادئ، مائي، زجاجي", "quiet, aquatic, glass", ar ? "افصل بفاصلة." : "Comma separated.")}
    <div class="callout">${ico("info", 13)}<span><b>${ar ? "كيف يعمل" : "How it works"}</b><br>${ar ? "اختر ستايلًا كنقطة بداية، ثم عدّل أي شيء. لا شيء نهائي." : "Pick a style as a starting point, then change anything. Nothing is final."}</span></div>
    <div class="section-label">${ar ? "الهدف" : "TARGET"}</div>
    <div class="card tight">
      ${t === "dsh" ? `<div class="stack-sm">
        ${segField("المخرجات", "Output", "targetOptions.dsh.selector", [{ value: "always", ar: "دائم", en: "Always on" }, { value: "named", ar: "ثيم مسمّى", en: "Named" }], state.targetOptions.dsh.selector)}
        ${switchRow("تثبيت حجم الخط", "Lock type size", "targetOptions.dsh.lockType", state.targetOptions.dsh.lockType, ar ? "إن فعّلته، يتجاوز إعداد حجم الخط في DSH." : "Overrides the DSH font-size setting when on.")}
        ${switchRow("تضمين استبدال الأيقونات", "Include icon replacements", "targetOptions.dsh.iconReplacements", state.targetOptions.dsh.iconReplacements, ar ? "يُبنى كبلجن ثيم أصلي." : "Built as a native theme plugin.")}
      </div>` : t === "web" ? `<div class="stack-sm">
        <div class="field"><span class="field-label">${ar ? "بادئة المتغيرات" : "Token prefix"}</span><input class="input mono" data-text="targetOptions.web.prefix" value="${esc(state.targetOptions.web.prefix)}" maxlength="12" spellcheck="false"><span class="field-hint">${ar ? "مثال: mk → --mk-bg" : "Example: mk → --mk-bg"}</span></div>
        ${switchRow("تضمين مكوّنات أساسية", "Include component starter", "targetOptions.web.components", state.targetOptions.web.components, ar ? "أزرار، حقول، أسطح، وزجاج." : "Buttons, fields, surfaces, and glass.")}
      </div>` : `<div class="stack-sm">
        ${switchRow("استيراد ClearVision الأساسي", "Import ClearVision base", "targetOptions.vencord.importBase", state.targetOptions.vencord.importBase, ar ? "سطرَا @import في أعلى الملف." : "Two @import lines at the top.")}
        ${rangeField("نصف قطر صندوق الرسالة", "Message box radius", "targetOptions.vencord.messageRadius", 6, 40, 1, state.targetOptions.vencord.messageRadius, "px")}
        ${rangeField("فراغ صندوق الرسالة", "Message box gap", "targetOptions.vencord.messageGap", 0, 28, 1, state.targetOptions.vencord.messageGap, "px")}
        ${textField("أيقونة الرئيسية (URL)", "Home icon (URL)", "targetOptions.vencord.homeIcon", state.targetOptions.vencord.homeIcon, "https://…/icon.svg", "https://…/icon.svg", ar ? "اختياري، رابط HTTPS." : "Optional, HTTPS URL.")}
      </div>`}
    </div>
    <div class="callout">${ico("file", 13)}<span>${ar ? "سأحوّل هذه الخيارات إلى ملف جاهز: CSS لـ DSH، أو توكنز ويب، أو ثيم Vencord." : "I will turn these choices into a ready file: DSH CSS, web tokens, or a Vencord theme."}</span></div>
  </div>`;
}

function renderPalette() {
  const ar = state.lang === "ar";
  const mode = state.paletteMode;
  const p = getPalette(mode);
  const reset = (key) => (state.overrides[mode]?.[key] ? `<button type="button" class="color-reset" data-color-reset="${mode}.${key}" title="Reset">${ico("reset", 11)}</button>` : "");
  const color = (key, arLabel, enLabel, arHint = "", enHint = "") => colorRow(mode, key, arLabel, enLabel, arHint, enHint);
  return `<div class="stack">
    <div class="mode-tabs">
      <button type="button" class="mode-tab ${mode === "light" ? "active" : ""}" data-mode-tab="light">${ico("sun", 12)} ${ar ? "فاتح" : "Light"}</button>
      <button type="button" class="mode-tab ${mode === "dark" ? "active" : ""}" data-mode-tab="dark">${ico("moon", 12)} ${ar ? "داكن" : "Dark"}</button>
    </div>
    <div class="card tight">
      <div class="color-list">
        ${color("bg", "الخلفية", "Canvas", "أرض التطبيق", "Application ground")}
        ${color("surface", "السطح", "Surface", "البطاقات والحقول", "Cards and fields")}
        ${color("surfaceAlt", "سطح ثانوي", "Surface alt", "طبقة داخلية", "Nested layer")}
        ${color("text", "الحبر", "Ink", "نص أساسي", "Primary text")}
        ${color("text2", "نص ثانوي", "Secondary ink", "", "")}
        ${color("text3", "نص ثالث", "Tertiary ink", "", "")}
        ${color("accent", "التمييز", "Accent", "الفيروز / البراند", "Brand / aquamarine")}
        ${color("accentText", "نص التمييز", "Accent text", state.autoAccent ? (ar ? "تلقائي" : "Auto") : "", state.autoAccent ? (ar ? "تلقائي" : "Auto") : "")}
        ${color("sidebar", "الشريط الجانبي", "Sidebar", "", "")}
        ${color("code", "الكود", "Code", "", "")}
        ${color("bubble", "فقاعة الرسالة", "Bubble", "", "")}
        ${color("menu", "القوائم", "Menus", "", "")}
      </div>
    </div>
    ${switchRow("نص تمييز تلقائي", "Auto accent text", "autoAccent", state.autoAccent, ar ? "اختر الأبيض أو الداكن حسب التباين." : "Picks white or dark ink by contrast.")}
    <div class="card tight">
      ${rangeField("قوة الحدود", "Border strength", "form.borderStrength", 0, 100, 1, state.form.borderStrength, "%", ar ? "أقل = هادئ، أكثر = محدد." : "Lower = quieter, higher = more defined.")}
      <div class="section-label">${ar ? "الحالات" : "STATES"}</div>
      <div class="color-list">
        ${color("warn", "تحذير", "Warning")}
        ${color("error", "خطأ", "Error")}
        ${color("success", "نجاح", "Success")}
      </div>
    </div>
    <div class="card tight">
      <div class="field-label" style="margin-bottom:6px">${ar ? "التباين" : "Contrast"}</div>
      <div class="contrast-panel" id="contrast-lines"></div>
      <button type="button" class="btn" data-action="fix-contrast" style="margin-top:8px;width:100%;height:32px;font-size:11px">${ico("check", 13)} ${ar ? "إصلاح التباين" : "Fix contrast"}</button>
    </div>
    <div class="callout">${ico("info", 13)}<span>${ar ? "القيم المشتقة تتبع الخلفية والسطح والحبر. عدّل واحدة لتثبيتها، أو اضغط ↺ لإرجاعها." : "Derived values follow the canvas, surface, and ink. Edit one to pin it, or press ↺ to release it."}</span></div>
  </div>`;
}

function renderType() {
  const ar = state.lang === "ar";
  const arabic = getFont(ARABIC_FONTS, state.type.arabic);
  const latin = getFont(LATIN_FONTS, state.type.latin);
  const code = getFont(CODE_FONTS, state.type.code);
  return `<div class="stack">
    ${selectField("الخط العربي", "Arabic typeface", "type.arabic", ARABIC_FONTS, state.type.arabic, `<span class="font-preview"><span class="fp-main" style="font-family:${esc(arabic.stack)}">ضوءٌ هادئ على ماءٍ عميق.</span><span class="fp-aux">${esc(arabic.name)}</span></span>`)}
    ${selectField("الخط اللاتيني", "Latin typeface", "type.latin", LATIN_FONTS, state.type.latin, `<span class="font-preview"><span class="fp-main" style="font-family:${esc(latin.stack)}">A quiet light over deep water.</span><span class="fp-aux">${esc(latin.name)}</span></span>`)}
    ${selectField("خط الكود", "Code typeface", "type.code", CODE_FONTS, state.type.code, `<span class="font-preview"><span class="fp-main mono" style="font-family:${esc(code.stack)};font-size:13px">--dsw-alias-bg-base: #06121e;</span><span class="fp-aux">${esc(code.name)}</span></span>`)}
    <div class="section-label">${ar ? "أزواج مقترحة" : "PAIRINGS"}</div>
    <div class="pair-chips">${PAIRS.map((p, i) => `<button type="button" class="pair-chip" data-pair="${i}">${esc(ar ? p.labelAr : p.labelEn)}</button>`).join("")}</div>
    <div class="grid-2">
      ${rangeField("حجم النص", "Text size", "type.size", 12, 20, 1, state.type.size, "px")}
      ${rangeField("حجم الكود", "Code size", "type.codeSize", 10, 16, 1, state.type.codeSize, "px")}
    </div>
    ${rangeField("ارتفاع السطر", "Line height", "type.leading", 1.4, 2.1, 0.05, state.type.leading, "")}
    ${segField("وزن العناوين", "Heading weight", "type.weight", [{ value: 400, ar: "عادي", en: "Regular" }, { value: 500, ar: "وسط", en: "Medium" }, { value: 600, ar: "نصف", en: "Semibold" }, { value: 700, ar: "عريض", en: "Bold" }], state.type.weight)}
    ${switchRow("تحميل الخطوط من Google", "Load Google Fonts", "type.loadFonts", state.type.loadFonts, ar ? "يحتاج اتصالًا. البديل: خطوط النظام." : "Needs a connection. Fallback: system fonts.")}
    <div class="type-sample">
      <div class="ts-ar" style="font-family:${esc(arabic.stack)}">ضوءٌ هادئ، وماءٌ عميق، ونصٌّ عربيٌّ يقرأ طويلًا.</div>
      <div class="ts-en" style="font-family:${esc(latin.stack)}">A quiet light, deep water, and a line of type that can carry both languages.</div>
      <div class="ts-code" style="font-family:${esc(code.stack)}">--dsh-font-family-text: "${esc(state.type.arabic)}", "${esc(state.type.latin)}";</div>
    </div>
    <div class="callout">${ico("info", 13)}<span>${ar ? "DSH يقبل أسماء الخطوط المثبتة على الجهاز. إن لم يكن الخط مثبتًا، سيرجع إلى الخط التالي في القائمة." : "DSH accepts locally installed family names. If a face is missing, it falls back to the next family."}</span></div>
  </div>`;
}

function renderIcons() {
  const ar = state.lang === "ar";
  const p = ICON_PACKS.find((x) => x.id === state.icons.pack) || ICON_PACKS[0];
  const strokeDisabled = state.icons.pack === "ph" || state.icons.pack === "heroSolid";
  return `<div class="stack">
    <div class="pack-grid">${ICON_PACKS.map((pack) => `<button type="button" class="pack-card${pack.id === state.icons.pack ? " active" : ""}" data-pack="${pack.id}">
      <span class="pack-icon">${applyIconStyle((ICON_DATA.sparkle || {})[pack.id] || "")}</span>
      <span class="pack-meta"><b>${esc(pack.name)}</b><small>${esc(pack.license)} · ${esc(ar ? pack.noteAr : pack.noteEn)}</small></span>
    </button>`).join("")}</div>
    ${rangeField("السُمك", "Stroke", "icons.stroke", 1, 2.5, 0.05, state.icons.stroke, "", strokeDisabled ? (ar ? "هذه المكتبة ممتلئة؛ السُمك لا يؤثر." : "This pack is filled; stroke has no effect.") : (ar ? "يعمل مع Lucide وTabler وHeroicons." : "Works with Lucide, Tabler, and Heroicons."))}
    ${segField("الحواف", "Corners", "icons.corner", [{ value: "round", ar: "دائرية", en: "Round" }, { value: "square", ar: "حادة", en: "Square" }], state.icons.corner)}
    <div class="card tight">
      <div class="field-head" style="margin-bottom:6px"><span class="field-label">${ar ? "أيقونات DSH" : "DSH icons"}</span><span class="field-value" id="icon-summary">${state.icons.selected.length} / ${ICON_META.length}</span></div>
      <div class="icon-grid">${ICON_META.map((meta) => `<button type="button" class="icon-cell${state.icons.selected.includes(meta.id) ? " active" : ""}" data-icon="${meta.id}" aria-pressed="${state.icons.selected.includes(meta.id)}"><span class="ic">${iconSvg(meta.id)}</span><span class="ic-label">${esc(ar ? meta.ar : meta.en)}</span></button>`).join("")}</div>
      <div class="icon-summary"><span>${ar ? "المحدد فقط يُستبدل؛ الباقي يبقى افتراضيًا." : "Only selected icons are replaced; the rest stay default."}</span><span class="icon-dots">${ICON_META.map((m) => `<i style="opacity:${state.icons.selected.includes(m.id) ? 0.85 : 0.18}"></i>`).join("")}</span></div>
    </div>
    ${state.target === "dsh" ? `<div class="callout">${ico("info", 13)}<span>${ar ? "DSH يسمح باستبدال أيقونات المنتج فقط (٢٠٢ رمز). الأيقونات المحددة تُصدَّر كـ SVG كامل مع viewBox، بلا style أو script." : "DSH replaces product icons only (202 symbols). Selected icons export as complete SVGs with a viewBox, no style or script."}</span></div>` : `<div class="callout">${ico("info", 13)}<span>${ar ? "في Vencord لا تُستبدل أيقونات Discord؛ تُسجّل المكتبة كاختيار تصميم. في الويب تُصدَّر كـ SVG." : "Vencord does not replace Discord icons; the pack is recorded as a design choice. On the web, it exports as SVG."}</span></div>`}
  </div>`;
}

function renderForm() {
  const ar = state.lang === "ar";
  return `<div class="stack">
    ${rangeField("نصف القطر", "Corner radius", "form.radius", 0, 28, 1, state.form.radius, "px")}
    <div class="section-label">${ar ? "الظل" : "SHADOW"}</div>
    <div class="visual-grid">${[["none", ar ? "بلا" : "None", "none"], ["soft", ar ? "ناعم" : "Soft", "soft"], ["deep", ar ? "عميق" : "Deep", "deep"], ["glow", ar ? "توهج" : "Glow", "glow"]].map(([id, label, cls]) => `<button type="button" class="visual-card${state.form.shadow === id ? " active" : ""}" data-shadow="${id}"><span class="visual-sample ${cls}"></span><b>${label}</b><small>${id === "none" ? (ar ? "مسطح" : "Flat") : id === "soft" ? (ar ? "ورق" : "Paper") : id === "deep" ? (ar ? "زجاج" : "Glass") : (ar ? "ضوء" : "Light")}</small></button>`).join("")}</div>
    <div class="grid-2">
      ${rangeField("الضباب", "Blur", "form.blur", 0, 24, 1, state.form.blur, "px")}
      ${rangeField("التشبع", "Saturation", "form.saturate", 100, 160, 1, state.form.saturate, "%")}
    </div>
    ${segField("الكثافة", "Density", "form.density", [{ value: "compact", ar: "مضغوط", en: "Compact" }, { value: "comfortable", ar: "مريح", en: "Comfortable" }, { value: "airy", ar: "واسع", en: "Airy" }], state.form.density)}
    ${segField("الحركة", "Motion", "form.motion", [{ value: "none", ar: "بلا", en: "None" }, { value: "calm", ar: "هادئة", en: "Calm" }, { value: "snappy", ar: "سريعة", en: "Snappy" }], state.form.motion)}
    ${segField("الحدود", "Borders", "form.border", [{ value: "hairline", ar: "شعرة", en: "Hairline" }, { value: "crisp", ar: "واضحة", en: "Crisp" }], state.form.border)}
    ${rangeField("قوة الحدود", "Border strength", "form.borderStrength", 0, 100, 1, state.form.borderStrength, "%")}
    ${switchRow("حواف زجاجية مضيئة", "Lit glass edges", "form.glassEdges", state.form.glassEdges, ar ? "خط ضوء رقيق أعلى السطح." : "A thin light line along the top edge.")}
    <div class="section-label">${ar ? "الملمس" : "TEXTURE"}</div>
    <div class="visual-grid">${[["none", ar ? "نظيف" : "Clean"], ["grain", ar ? "حبيبات" : "Grain"], ["paper", ar ? "ورق" : "Paper"], ["scan", ar ? "مسح" : "Scan"]].map(([id, label]) => `<button type="button" class="visual-card${state.form.texture === id ? " active" : ""}" data-texture="${id}"><span class="visual-sample ${id === "none" ? "none" : id === "paper" ? "cut" : "soft"}" style="${id === "scan" ? "background:repeating-linear-gradient(0deg,rgba(255,255,255,.18) 0 1px,transparent 1px 4px)" : ""}"></span><b>${label}</b><small>${id === "none" ? (ar ? "بلا إضافة" : "No overlay") : (ar ? "طبقة خفيفة" : "A light layer")}</small></button>`).join("")}</div>
    <div class="section-label">${ar ? "الخلفية" : "BACKDROP"}</div>
    <div class="backdrop-swatches">${Object.keys(BACKDROPS).map((id) => `<button type="button" class="backdrop-swatch${state.backdrop.kind === "preset" && state.backdrop.preset === id ? " active" : ""}" data-backdrop="${id}" style="background:${esc(BACKDROPS[id].dark)}" title="${esc(ar ? BACKDROPS[id].ar : BACKDROPS[id].en)}"><span>${esc(ar ? BACKDROPS[id].ar : BACKDROPS[id].en)}</span></button>`).join("")}</div>
    ${textField("صورة الخلفية (URL)", "Backdrop image (URL)", "backdrop.url", state.backdrop.url, "https://…/image.jpg", "https://…/image.jpg", ar ? "اختياري. يُستخدم بدل التدرج." : "Optional. Replaces the gradient.")}
    ${rangeField("تعتيم الخلفية", "Backdrop dim", "backdrop.dim", 0.2, 1.1, 0.01, state.backdrop.dim, "", ar ? "أقل = أغمق." : "Lower = darker.")}
    ${state.target === "dsh" ? `<div class="callout">${ico("info", 13)}<span>${ar ? "أسطح DSH معتمة؛ الزجاج يُطبَّق على القوائم والنوافذ. صورة الخلفية تحتاج بلجن ثيم أصلي." : "DSH surfaces are opaque; glass applies to menus and popovers. A backdrop image needs a native theme plugin."}</span></div>` : ""}
  </div>`;
}

function renderBrief() {
  const ar = state.lang === "ar";
  const pL = getPalette("light");
  const pD = getPalette("dark");
  const presetName = state.preset === "custom" ? (ar ? "مخصص" : "Custom") : (ar ? PRESETS[state.preset]?.nameAr : PRESETS[state.preset]?.nameEn) || "—";
  const targetName = state.target === "dsh" ? "DSH" : state.target === "web" ? (ar ? "ويب" : "Web") : "Vencord";
  const reportL = contrastReport("light");
  const reportD = contrastReport("dark");
  const checks = [
    ["contrast", ar ? `تباين ${round(reportD.body.ratio, 1)}:1` : `Contrast ${round(reportD.body.ratio, 1)}:1`],
    ["type", `${state.type.arabic} + ${state.type.latin}`],
    ["icons", `${ICON_PACKS.find((x) => x.id === state.icons.pack)?.name || ""} · ${state.icons.selected.length}`],
    ["form", `${state.form.radius}px · ${state.form.blur}px`]
  ];
  return `<div class="stack">
    <div class="mini-summary">
      <div class="ms-item"><b>${esc(state.meta.nameAr)}</b><span>${esc(state.meta.nameEn)} · ${esc(state.meta.slug)}</span></div>
      <div class="ms-item"><b>${esc(targetName)}</b><span>${esc(presetName)} · ${ar ? "الوضع" : "mode"} ${state.preview.mode === "dark" ? (ar ? "داكن" : "dark") : (ar ? "فاتح" : "light")}</span></div>
    </div>
    <div class="card tight">
      <div class="field-label">${ar ? "اللوحة الداكنة" : "Dark palette"}</div>
      <div class="summary-swatches">${[pD.bg, pD.surface, pD.accent, pD.sidebar, pD.code, pD.text].map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</div>
      <div class="field-label" style="margin-top:8px">${ar ? "اللوحة الفاتحة" : "Light palette"}</div>
      <div class="summary-swatches">${[pL.bg, pL.surface, pL.accent, pL.sidebar, pL.code, pL.text].map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</div>
    </div>
    <div class="card tight">
      <div class="ds-checks">${checks.map(([key, label]) => `<div class="ds-check">${ico(key === "contrast" ? "check" : key === "type" ? "type" : key === "icons" ? "grid" : "sliders", 12)}<span>${esc(label)}</span></div>`).join("")}</div>
    </div>
    <label class="field"><span class="field-label">${ar ? "ملاحظات للبناء" : "Build notes"}</span><textarea class="textarea" data-text="meta.notes" placeholder="${ar ? "أي تفاصيل إضافية…" : "Anything else I should know…"}">${esc(state.meta.notes)}</textarea></label>
    <button type="button" class="btn btn-primary" data-action="open-drawer" style="width:100%;height:38px">${ico("file", 15)} ${ar ? "افتح الموجز الكامل" : "Open the full brief"}</button>
    <div class="callout">${ico("spark", 13)}<span>${ar ? "الملخص يحتوي كل ما أحتاجه. انسخه والصقه في المحادثة، وسأبني الملفات وأتحقق منها." : "The brief contains everything I need. Copy it into the chat and I will build and verify the files."}</span></div>
  </div>`;
}

/* ---------------- inspector shell ---------------- */

function renderInspector() {
  const meta = SECTION_META[state.section] || SECTION_META.direction;
  const ar = state.lang === "ar";
  setText("#sec-num", ar ? meta.numAr : meta.numEn);
  setText("#sec-title", ar ? meta.titleAr : meta.titleEn);
  setText("#sec-hint", ar ? meta.hintAr : meta.hintEn);
  const progress = $("#sec-progress");
  if (progress) progress.innerHTML = SECTIONS.map((s) => `<i class="${s === state.section ? "on" : ""}"></i>`).join("");
  const templates = { direction: renderDirection, palette: renderPalette, type: renderType, icons: renderIcons, form: renderForm, brief: renderBrief };
  const body = $("#inspector-body");
  body.innerHTML = (templates[state.section] || renderDirection)();
  $$(".inspector-body input[type=range]").forEach(paintRange);
  if (state.section === "palette") updateContrastPanel();
  const index = SECTIONS.indexOf(state.section);
  const prev = $("#prev-btn");
  const next = $("#next-btn");
  if (prev) prev.disabled = index <= 0;
  if (next) {
    const label = index >= SECTIONS.length - 1 ? (ar ? "افتح الموجز" : "Open brief") : (ar ? "التالي" : "Next");
    next.innerHTML = `${label} ${index >= SECTIONS.length - 1 ? ico("file", 14) : ico("arrow", 14)}`;
  }
}

function paintRange(el) {
  const min = Number(el.min) || 0;
  const max = Number(el.max) || 100;
  const value = Number(el.value);
  const pct = ((value - min) / (max - min)) * 100;
  el.style.setProperty("--range-progress", `${pct}%`);
}

function renderRail() {
  $$(".rail-item").forEach((item) => item.classList.toggle("active", item.dataset.section === state.section));
}

/* ---------------- output ---------------- */

function slots(p) {
  return {
    bg: p.bg,
    surface: p.surface,
    surfaceAlt: p.surfaceAlt,
    text: p.text,
    text2: p.text2,
    text3: p.text3,
    border: p.border,
    accent: p.accent,
    accentText: p.accentText,
    accentHover: p.accentHover,
    code: p.code,
    codeBanner: p.codeBanner,
    sidebar: p.sidebar,
    warn: p.warn,
    error: p.error,
    success: p.success
  };
}

function shadowCss(p) {
  const mode = p.mode === "dark";
  if (state.form.shadow === "none") return "none";
  if (state.form.shadow === "glow") return `0 0 0 1px ${rgba(p.accent, 0.22)}, 0 0 26px ${rgba(p.accent, 0.26)}`;
  if (state.form.shadow === "deep") return `0 10px 30px ${rgba(mode ? "#000000" : "#0b2236", mode ? 0.42 : 0.16)}`;
  return `0 2px 6px ${rgba(mode ? "#000000" : "#0b2236", mode ? 0.24 : 0.08)}`;
}

function dshTokens(p) {
  const dark = p.mode === "dark";
  const glassy = Number(state.form.blur) > 0;
  const t = {
    "--dsw-alias-bg-base": p.bg,
    "--dsw-alias-bg-document-preview": p.bg,
    "--dsw-alias-bg-document-selection": rgba(p.accent, 0.35),
    "--dsw-alias-bg-layer-1": p.surface,
    "--dsw-alias-bg-layer-2": p.surface,
    "--dsw-alias-bg-layer-3": p.surfaceAlt,
    "--dsw-alias-bg-layer-4": p.surfaceAlt,
    "--dsw-alias-bg-mask-1": dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.24)",
    "--dsw-alias-bg-mask-2": dark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.12)",
    "--dsw-alias-bg-mask-3": "rgba(0,0,0,0.48)",
    "--dsw-alias-bg-mask-photo": "rgba(0,0,0,0.88)",
    "--dsw-alias-bg-mask-drop": dark ? "rgba(39,39,48,0.7)" : "rgba(255,255,255,0.7)",
    "--dsw-alias-bg-module-platform": p.surfaceAlt,
    "--dsw-alias-bg-multi-select": p.surfaceAlt,
    "--dsw-alias-bg-overlay": p.surfaceAlt,
    "--dsw-alias-bg-skeleton": rgba(p.text, 0.06),
    "--dsw-alias-border-inverted": rgba(p.text, 0.08),
    "--dsw-alias-border-inverted2": rgba(p.text, 0.08),
    "--dsw-alias-border-l1": rgba(p.text, 0.055),
    "--dsw-alias-border-l2": p.border,
    "--dsw-alias-border-l2-darkmode-thin": p.border,
    "--dsw-alias-border-l3": rgba(p.text, 0.16),
    "--dsw-alias-border-l4": rgba(p.text, 0.22),
    "--dsw-alias-border-selected": p.accent,
    "--dsw-alias-brand-primary": p.accent,
    "--dsw-alias-brand-primary-invert": p.text,
    "--dsw-alias-brand-primary-new-colorprimary-new-color": p.accent,
    "--dsw-alias-brand-text": p.text,
    "--dsw-alias-button-contrast-fill": p.text,
    "--dsw-alias-button-elevated-fill": p.surface,
    "--dsw-alias-button-floating-fill": p.surface,
    "--dsw-alias-button-floating-hover": p.surfaceAlt,
    "--dsw-alias-button-ghost-active-border": p.text3,
    "--dsw-alias-button-ghost-active-fill": p.surfaceAlt,
    "--dsw-alias-button-ghost-active-hover": p.surfaceAlt,
    "--dsw-alias-button-info-fill": p.accent,
    "--dsw-alias-button-info-hover": p.accentHover,
    "--dsw-alias-button-primary-dimmed": rgba(p.accent, 0.14),
    "--dsw-alias-button-primary-fill": p.accent,
    "--dsw-alias-button-primary-hover": p.accentHover,
    "--dsw-alias-button-tool-bar-fill": rgba(p.text, 0.18),
    "--dsw-alias-button-tool-bar-fill-invisible": rgba(p.text, 0.1),
    "--dsw-alias-button-tool-bar-hover": rgba(p.text, 0.28),
    "--dsw-alias-card-fill": p.surface,
    "--dsw-alias-card-fill-hover": p.surfaceAlt,
    "--dsw-alias-card-tile-fill": p.surfaceAlt,
    "--dsw-alias-chart-messages": p.accent,
    "--dsw-alias-chart-system": p.text3,
    "--dsw-alias-chart-tools": dark ? "#a78bfa" : "#7c3aed",
    "--dsw-alias-code-diff-added": rgba(p.success, 0.1),
    "--dsw-alias-code-diff-deleted": rgba(p.error, 0.1),
    "--dsw-alias-file-diff-added-bg": rgba(p.success, 0.14),
    "--dsw-alias-file-diff-added-gutter": rgba(p.success, 0.09),
    "--dsw-alias-file-diff-added-marker": p.success,
    "--dsw-alias-file-diff-deleted-bg": rgba(p.error, 0.14),
    "--dsw-alias-file-diff-deleted-gutter": rgba(p.error, 0.09),
    "--dsw-alias-file-diff-deleted-marker": p.error,
    "--dsw-alias-interactive-bg-active": rgba(p.text, dark ? 0.14 : 0.1),
    "--dsw-alias-interactive-bg-hover": rgba(p.text, dark ? 0.08 : 0.06),
    "--dsw-alias-interactive-bg-hover-accent": rgba(p.accent, 0.12),
    "--dsw-alias-interactive-bg-hover-danger": rgba(p.error, 0.08),
    "--dsw-alias-interactive-bg-hover-solid": p.surfaceAlt,
    "--dsw-alias-label-caption": p.text3,
    "--dsw-alias-label-dimmed": rgba(p.text, 0.45),
    "--dsw-alias-label-document-preview": p.text2,
    "--dsw-alias-label-error": p.error,
    "--dsw-alias-label-on-color": p.accentText,
    "--dsw-alias-label-primary": p.text,
    "--dsw-alias-label-primary-bluish": p.text,
    "--dsw-alias-label-primary-dimmed": p.text,
    "--dsw-alias-label-primary-foreground": p.accentText,
    "--dsw-alias-label-primary-inverted": p.bg,
    "--dsw-alias-label-secondary": p.text2,
    "--dsw-alias-label-tertiary": p.text3,
    "--dsw-alias-link": p.accent,
    "--dsw-alias-markdown-citation": p.surfaceAlt,
    "--dsw-alias-markdown-code-block": p.code,
    "--dsw-alias-markdown-code-block-banner": p.codeBanner,
    "--dsw-alias-markdown-code-segment-selected": p.codeBanner,
    "--dsw-alias-markdown-code-segment-unselected": p.code,
    "--dsw-alias-markdown-inline-code": p.code,
    "--dsw-alias-markdown-placeholder": p.surfaceAlt,
    "--dsw-alias-markdown-tag": p.surfaceAlt,
    "--dsw-alias-menu-group-header-fill": glassy ? rgba(p.menu, 0.94) : p.menu,
    "--dsw-alias-menu-icon": p.text2,
    "--dsw-alias-scrollbar-bg-l1": rgba(p.text, 0.12),
    "--dsw-alias-scrollbar-bg-l2": rgba(p.text, 0.12),
    "--dsw-alias-scrollbar-hover-l1": rgba(p.text, 0.22),
    "--dsw-alias-scrollbar-hover-l2": rgba(p.text, 0.22),
    "--dsw-alias-settings-card-fill": p.surface,
    "--dsw-alias-settings-card-stroke": p.border,
    "--dsw-alias-state-business-primary": p.accent,
    "--dsw-alias-state-business-tertiary": rgba(p.accent, 0.14),
    "--dsw-alias-state-done-primary": dark ? "#a78bfa" : "#7c3aed",
    "--dsw-alias-state-error-primary": p.error,
    "--dsw-alias-state-error-secondary": rgba(p.error, 0.75),
    "--dsw-alias-state-idle-primary": rgba(p.text, 0.25),
    "--dsw-alias-state-success-primary": p.success,
    "--dsw-alias-state-success-secondary": p.success,
    "--dsw-alias-state-success-tertiary": rgba(p.success, 0.14),
    "--dsw-alias-state-warn-label": p.warn,
    "--dsw-alias-state-warn-primary": p.warn,
    "--dsw-alias-state-warn-secondary": p.warn,
    "--dsw-alias-state-warn-tertiary": rgba(p.warn, 0.16),
    "--dsw-alias-switch-thumb": dark ? p.text2 : "#ffffff",
    "--dsw-alias-toast-action": p.accent,
    "--dsw-alias-toast-bg": dark ? p.surfaceAlt : p.text,
    "--dsw-alias-toast-label": dark ? p.text : p.bg,
    "--dsw-alias-tooltip-bg": dark ? p.surfaceAlt : p.text,
    "--dsw-alias-tooltip-key-bg": mix(p.text, p.bg, 0.18),
    "--dsw-alias-tooltip-label": dark ? p.text : p.bg,
    "--dsw-alias-trajectory-accent": p.accent,
    "--dsw-alias-turn-trigger-bg": p.code,
    "--dsw-alias-turn-trigger-bg-hover": rgba(p.text, 0.06),
    "--dsw-specific-bubble": p.bubble,
    "--dsw-specific-bubble-highlight": rgba(p.accent, 0.18),
    "--dsw-specific-file-upload-track": rgba(p.text, 0.08),
    "--dsw-specific-guide-hero": p.surfaceAlt,
    "--dsw-specific-input-major": p.surface,
    "--dsw-specific-login-input": p.surfaceAlt,
    "--dsw-specific-menu": glassy ? rgba(p.menu, dark ? 0.64 : 0.7) : p.menu,
    "--dsw-specific-selector": p.surfaceAlt,
    "--dsw-specific-sidebar-fill": p.sidebar,
    "--dsw-specific-sidebar-nav-item-active": rgba(p.accent, 0.12),
    "--dsw-specific-sidebar-nav-item-active-accent": rgba(p.accent, 0.18),
    "--dsw-specific-sidebar-nav-item-hover": rgba(p.text, 0.05),
    "--dsw-specific-sidebar-right-flash": p.accent,
    "--dsw-specific-tip": p.surfaceAlt,
    "--dsw-menu-surface-fill": glassy ? rgba(p.menu, dark ? 0.64 : 0.7) : p.menu,
    "--dsw-linear-gradient-think": `linear-gradient(180deg, ${p.bg} 20.19%, ${rgba(p.bg, 0)} 100%)`,
    "--dsw-linear-think-select": `linear-gradient(180deg, ${p.surfaceAlt} 20.19%, ${rgba(p.surfaceAlt, 0)} 100%)`,
    "--dsw-shadow-lv1": shadowCss(p),
    "--dsw-shadow-lv1-blur": shadowCss(p),
    "--dsw-shadow-lv2": shadowCss(p),
    "--dsw-shadow-lv3": shadowCss(p),
    "--dsw-elevation-stroke-color": rgba(p.text, 0.14)
  };
  return t;
}

function fontCommonTokens() {
  const ar = getFont(ARABIC_FONTS, state.type.arabic);
  const la = getFont(LATIN_FONTS, state.type.latin);
  const code = getFont(CODE_FONTS, state.type.code);
  const latinFallback = firstFamily(la.stack);
  const textStack = /,\s*(sans-serif|serif|system-ui)\s*$/u.test(ar.stack)
    ? ar.stack.replace(/,\s*(sans-serif|serif|system-ui)\s*$/u, `, ${latinFallback}, $1`)
    : `${ar.stack}, ${latinFallback}`;
  return {
    "--dsh-font-family-text": textStack,
    "--dsh-font-family-code": code.stack,
    "--dsw-font-family": textStack,
    "--ds-font-family-code": code.stack,
    "--dsw-font-family-brand": la.stack,
    "--dsw-font-markdown-h1-font-weight": String(state.type.weight),
    "--dsw-font-markdown-h2-font-weight": String(state.type.weight),
    "--dsw-font-markdown-h3-font-weight": String(state.type.weight),
    "--dsw-font-markdown-h4-font-weight": String(Math.max(500, state.type.weight - 100)),
    "--dsw-radius-xs": `${Math.max(2, Number(state.form.radius) - 8)}px`,
    "--dsw-radius-sm": `${Math.max(4, Number(state.form.radius) - 6)}px`,
    "--dsw-radius-md": `${Number(state.form.radius)}px`,
    "--dsw-radius-lg": `${Number(state.form.radius) + 4}px`,
    "--dsw-radius-xl": `${Number(state.form.radius) + 8}px`,
    "--dsw-radius-panel": `${Number(state.form.radius) + 12}px`,
    "--ds-transition-duration": `${MOTION_MS[state.form.motion] ?? 220}ms`,
    "--ds-transition-duration-fast": `${Math.max(0.01, (MOTION_MS[state.form.motion] ?? 220) / 2)}ms`,
    "--ds-transition-duration-slow": `${(MOTION_MS[state.form.motion] ?? 220) + 80}ms`,
    "--dsw-menu-backdrop-filter": Number(state.form.blur) > 0 ? `blur(${state.form.blur}px) saturate(${state.form.saturate}%)` : "none",
    "--dsw-mask-blur": "none"
  };
}

function block(selector, tokens, indent = "  ") {
  const body = Object.entries(tokens).map(([key, value]) => `${indent}${key}: ${value};`).join("\n");
  return `${selector} {\n${body}\n}`;
}

function dshCss() {
  const pL = getPalette("light");
  const pD = getPalette("dark");
  const slug = state.meta.slug || "theme";
  const named = state.targetOptions.dsh.selector === "named";
  const sel = named ? `body[data-dsh-theme="${slug}"]` : "body";
  const darkSel = named ? `${sel}[data-ds-dark-theme]` : `${sel}[data-ds-dark-theme]`;
  const common = fontCommonTokens();
  if (state.targetOptions.dsh.lockType) {
    common["--dsh-content-font-size"] = `${state.type.size}px !important`;
    common["--dsh-code-font-size"] = `${state.type.codeSize}px !important`;
  }
  const lines = [
    "/* ============================================================",
    `   ${safeComment(state.meta.nameEn)} — Mishkat theme for DeepSeek Harness`,
    `   ${safeComment(state.meta.nameAr)}`,
    "   Generated by Mishkat Theme Studio",
    named ? `   Activate with: document.body.dataset.dshTheme = "${slug}"` : "   Apply: Settings → General → custom CSS (dsh-custom-css-lite)",
    "   ============================================================ */",
    "",
    block(sel, common),
    "",
    `/* ${pL.mode} palette — ${Object.keys(dshTokens(pL)).length} tokens */`,
    block(sel, dshTokens(pL)),
    "",
    `/* ${pD.mode} palette */`,
    block(darkSel, dshTokens(pD)),
    "",
    "/* Reading rhythm requested in the brief. */",
    `${sel} [data-chat-flow] p, ${sel} [data-chat-flow] li, ${sel} [data-chat-flow] blockquote {`,
    `  line-height: ${state.type.leading} !important;`,
    "}",
    "",
    "@media (prefers-reduced-motion: reduce) {",
    `  ${sel} { --ds-transition-duration: 0.01ms; --ds-transition-duration-fast: 0.01ms; --ds-transition-duration-slow: 0.01ms; }`,
    "}",
    "",
    "/* Optional: DSH's own shell is opaque by design. The glass above applies to menus,",
    "   popovers, and composer surfaces through official tokens. A body-wide wallpaper",
    "   needs a native theme plugin, not token CSS. */"
  ];
  return lines.join("\n");
}

function webTokens(p, prefix) {
  return {
    [`--${prefix}-bg`]: p.bg,
    [`--${prefix}-surface`]: p.surface,
    [`--${prefix}-surface-alt`]: p.surfaceAlt,
    [`--${prefix}-text`]: p.text,
    [`--${prefix}-text-2`]: p.text2,
    [`--${prefix}-text-3`]: p.text3,
    [`--${prefix}-border`]: p.border,
    [`--${prefix}-accent`]: p.accent,
    [`--${prefix}-accent-ink`]: p.accentText,
    [`--${prefix}-accent-hover`]: p.accentHover,
    [`--${prefix}-sidebar`]: p.sidebar,
    [`--${prefix}-bubble`]: p.bubble,
    [`--${prefix}-code`]: p.code,
    [`--${prefix}-code-banner`]: p.codeBanner,
    [`--${prefix}-menu`]: p.menu,
    [`--${prefix}-warn`]: p.warn,
    [`--${prefix}-error`]: p.error,
    [`--${prefix}-success`]: p.success,
    [`--${prefix}-glass`]: p.glass,
    [`--${prefix}-glass-2`]: p.glass2,
    [`--${prefix}-edge`]: p.edge,
    [`--${prefix}-radius`]: `${state.form.radius}px`,
    [`--${prefix}-radius-sm`]: `${Math.max(2, Number(state.form.radius) - 6)}px`,
    [`--${prefix}-shadow`]: shadowCss(p),
    [`--${prefix}-blur`]: `${state.form.blur}px`,
    [`--${prefix}-saturate`]: `${state.form.saturate}%`,
    [`--${prefix}-font-ar`]: getFont(ARABIC_FONTS, state.type.arabic).stack,
    [`--${prefix}-font-en`]: getFont(LATIN_FONTS, state.type.latin).stack,
    [`--${prefix}-font-mono`]: getFont(CODE_FONTS, state.type.code).stack,
    [`--${prefix}-size`]: `${state.type.size}px`,
    [`--${prefix}-leading`]: String(state.type.leading)
  };
}

function webCss() {
  const prefixRaw = String(state.targetOptions.web.prefix || "mk").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const prefix = prefixRaw || "mk";
  const pL = getPalette("light");
  const pD = getPalette("dark");
  const wall = state.backdrop.kind === "preset" ? BACKDROPS[state.backdrop.preset]?.dark : state.backdrop.kind === "image" ? `url("${sanitizeImageUrl(state.backdrop.url)}")` : "none";
  const googleFamilies = [getFont(ARABIC_FONTS, state.type.arabic), getFont(LATIN_FONTS, state.type.latin), getFont(CODE_FONTS, state.type.code)]
    .map((f) => f && f.google)
    .filter(Boolean)
    .map((f) => `family=${f}`)
    .join("&");
  const fontImport = state.type.loadFonts && googleFamilies
    ? `/* Optional Google Fonts import:\n   @import url("https://fonts.googleapis.com/css2?${googleFamilies}&display=swap"); */`
    : "/* System fonts only. */";
  const light = webTokens(pL, prefix);
  const dark = webTokens(pD, prefix);
  const base = [
    `body {`,
    `  background: var(--${prefix}-wallpaper, var(--${prefix}-bg));`,
    `  color: var(--${prefix}-text);`,
    `  font-family: var(--${prefix}-font-en), var(--${prefix}-font-ar);`,
    `  font-size: var(--${prefix}-size);`,
    `  line-height: var(--${prefix}-leading);`,
    `}`,
    ``,
    `.${prefix}-surface, .${prefix}-card {`,
    `  background: var(--${prefix}-surface);`,
    `  border: 1px solid var(--${prefix}-border);`,
    `  border-radius: var(--${prefix}-radius-sm);`,
    `}`,
    ``,
    `.${prefix}-glass {`,
    `  background: var(--${prefix}-glass);`,
    `  border: 1px solid var(--${prefix}-border);`,
    `  border-radius: var(--${prefix}-radius);`,
    `  box-shadow: var(--${prefix}-shadow);`,
    `  -webkit-backdrop-filter: blur(var(--${prefix}-blur)) saturate(var(--${prefix}-saturate));`,
    `  backdrop-filter: blur(var(--${prefix}-blur)) saturate(var(--${prefix}-saturate));`,
    `}`,
    ``,
    `.${prefix}-button {`,
    `  background: var(--${prefix}-accent);`,
    `  color: var(--${prefix}-accent-ink);`,
    `  border: 0;`,
    `  border-radius: calc(var(--${prefix}-radius-sm) - 2px);`,
    `  padding: 0.55em 0.9em;`,
    `  font-weight: 600;`,
    `}`,
    ``,
    `.${prefix}-input {`,
    `  background: var(--${prefix}-surface-alt);`,
    `  color: var(--${prefix}-text);`,
    `  border: 1px solid var(--${prefix}-border);`,
    `  border-radius: calc(var(--${prefix}-radius-sm) - 2px);`,
    `  padding: 0.55em 0.7em;`,
    `}`
  ].join("\n");
  return [
    "/* ============================================================",
    `   ${state.meta.nameEn} — web token sheet`,
    `   ${state.meta.nameAr}`,
    "   Generated by Mishkat Theme Studio",
    "   ============================================================ */",
    fontImport,
    "",
    ":root, [data-theme=\"light\"] {",
    `  color-scheme: light;`,
    ...Object.entries(light).map(([k, v]) => `  ${k}: ${v};`),
    `  --${prefix}-wallpaper: ${wall};`,
    `}`,
    "",
    "[data-theme=\"dark\"] {",
    `  color-scheme: dark;`,
    ...Object.entries(dark).map(([k, v]) => `  ${k}: ${v};`),
    `  --${prefix}-wallpaper: ${wall};`,
    `}`,
    "",
    `@media (prefers-color-scheme: dark) {`,
    `  :root:not([data-theme]) {`,
    ...Object.entries(dark).map(([k, v]) => `    ${k}: ${v};`),
    `    --${prefix}-wallpaper: ${wall};`,
    `  }`,
    `}`,
    "",
    state.targetOptions.web.components ? base : "/* Component starter disabled. Enable it in Direction → Target. */"
  ].join("\n");
}

function vencordShadow(p) {
  if (state.form.shadow === "none") return "0 0 0 rgba(0,0,0,0)";
  if (state.form.shadow === "glow") return `0 0 26px ${rgba(p.accent, 0.26)}`;
  if (state.form.shadow === "deep") return "0 18px 44px rgba(0,0,0,0.42)";
  return "0 8px 24px rgba(0,0,0,0.22)";
}

function vencordCss() {
  const pL = getPalette("light");
  const pD = getPalette("dark");
  const ar = getFont(ARABIC_FONTS, state.type.arabic).stack;
  const la = getFont(LATIN_FONTS, state.type.latin).stack;
  const code = getFont(CODE_FONTS, state.type.code).stack;
  const backdropImage = sanitizeImageUrl(state.backdrop.url);
  const wall = state.backdrop.kind === "image" && backdropImage
    ? `url("${backdropImage}")`
    : state.backdrop.kind === "preset"
      ? BACKDROPS[state.backdrop.preset]?.[state.preview.mode] || BACKDROPS[state.backdrop.preset]?.dark || "none"
      : "none";
  const imports = state.targetOptions.vencord.importBase
    ? `@import url("https://clearvision.github.io/ClearVision-v7/main.css");\n@import url("https://clearvision.github.io/ClearVision-v7/betterdiscord.css");`
    : `/* ClearVision base import disabled. Add main.css and betterdiscord.css yourself. */`;
  const home = sanitizeImageUrl(state.targetOptions.vencord.homeIcon);
  const vars = {
    "--main-color": pD.accent,
    "--hover-color": pD.accentHover,
    "--success-color": pD.success,
    "--danger-color": pD.error,
    "--online-color": pD.success,
    "--idle-color": pD.warn,
    "--dnd-color": pD.error,
    "--streaming-color": "#8b5cf6",
    "--offline-color": pD.text3,
    "--background-image": wall,
    "--background-position": "center",
    "--background-size": "cover",
    "--background-attachment": "fixed",
    "--background-dim": String(state.backdrop.dim),
    "--background-filter": `saturate(${state.form.saturate}%) brightness(${state.backdrop.dim})`,
    "--main-font": `${la}, ${ar}`,
    "--code-font": code,
    "--focus-color": pD.accent,
    "--glass-blur": `${state.form.blur}px`,
    "--glass-saturate": `${state.form.saturate}%`,
    "--glass-radius": `${state.form.radius}px`,
    "--glass-edge": pD.edge,
    "--glass-edge-soft": pD.edgeSoft,
    "--glass-sheen": rgba(pD.accent, 0.1),
    "--glass-shadow": vencordShadow(pD),
    "--message-box-radius": `${state.targetOptions.vencord.messageRadius}px`,
    "--message-box-gap": `${state.targetOptions.vencord.messageGap}px`,
    "--text-accent": pD.accent,
    "--text-accent-hover": pD.accentHover,
    "--chat-text-shadow": "0 1px 2px rgba(0,0,0,0.75)",
    "--channel-normal": pD.text2,
    "--channel-muted": pD.text3,
    "--channel-hover": pD.text,
    "--channel-selected": pD.accentText,
    "--channel-selected-bg": pD.accent,
    "--channel-unread": pD.accent,
    "--channel-unread-hover": pD.accentHover
  };
  if (home) vars["--home-icon"] = `url("${home}")`;
  const lightVars = {
    "--main-color": pL.accent,
    "--hover-color": pL.accentHover,
    "--success-color": pL.success,
    "--danger-color": pL.error,
    "--background-image": state.backdrop.kind === "preset" ? (BACKDROPS[state.backdrop.preset]?.light || wall) : wall,
    "--background-shading": "rgba(255,255,255,0.12)",
    "--card-shading": "rgba(255,255,255,0.3)",
    "--popout-shading": "rgba(255,255,255,0.72)",
    "--modal-shading": "rgba(255,255,255,0.72)",
    "--input-shading": "rgba(0,0,0,0.06)",
    "--normal-text": pL.text,
    "--muted-text": pL.text2,
    "--text-accent": pL.accent,
    "--text-accent-hover": pL.accentHover,
    "--chat-text-shadow": "none",
    "--glass-edge": pL.edge,
    "--glass-edge-soft": pL.edgeSoft,
    "--glass-shadow": vencordShadow(pL)
  };
  const darkVars = {
    "--background-shading": "rgba(0,0,0,0.2)",
    "--card-shading": "rgba(0,0,0,0.2)",
    "--popout-shading": "rgba(0,0,0,0.6)",
    "--modal-shading": "rgba(0,0,0,0.4)",
    "--input-shading": "rgba(255,255,255,0.05)",
    "--normal-text": pD.text,
    "--muted-text": pD.text2,
    "--text-accent": pD.accent,
    "--text-accent-hover": pD.accentHover
  };
  const darkerVars = {
    "--background-shading": "rgba(0,0,0,0.35)",
    "--card-shading": "rgba(0,0,0,0.3)",
    "--popout-shading": "rgba(0,0,0,0.7)",
    "--modal-shading": "rgba(0,0,0,0.5)",
    "--normal-text": pD.text,
    "--muted-text": pD.text2
  };
  const onyxVars = {
    "--background-shading": "rgba(0,0,0,0.3)",
    "--card-shading": "rgba(0,0,0,0)",
    "--popout-shading": "rgba(0,0,0,0.8)",
    "--modal-shading": "rgba(0,0,0,0)",
    "--normal-text": "#ffffff",
    "--muted-text": pD.text2
  };
  const varsBlock = (sel, obj) => `${sel} {\n${Object.entries(obj).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
  const glass = `/* FROSTED GLASS */
[class*="sidebar_"],
[class*="membersWrap_"],
[class*="channelTextArea_"],
[role="menu"],
[role="listbox"],
[class*="autocomplete_"],
[role="dialog"],
[class*="layerContainer_"] [class*="popout"],
[class*="standardSidebarView_"] {
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}

/* LIQUID GLASS EDGES */
[class*="sidebar_"],
[class*="membersWrap_"],
[class*="channelTextArea_"],
[role="menu"],
[role="listbox"],
[class*="autocomplete_"],
[role="dialog"] {
  border-radius: var(--glass-radius) !important;
  box-shadow:
    inset 0 1px 0 0 var(--glass-edge),
    inset 0 0 0 1px var(--glass-edge-soft),
    inset 0 40px 60px -40px var(--glass-sheen),
    var(--glass-shadow) !important;
}

/* MESSAGE BOX */
[class*="chatContent_"] > form {
  margin-left: var(--message-box-gap);
  margin-right: var(--message-box-gap);
}
[class*="channelTextArea_"],
[class*="channelTextArea_"] > [class*="scrollableContainer_"] {
  border-radius: var(--message-box-radius) !important;
}
[class*="channelTextArea_"]:focus-within {
  box-shadow:
    inset 0 1px 0 0 var(--glass-edge),
    inset 0 0 0 1px var(--glass-edge-soft),
    inset 0 40px 60px -40px var(--glass-sheen),
    0 0 2px 2px var(--main-color),
    var(--glass-shadow) !important;
}

/* READABLE ACCENT TEXT */
:is(.theme-light, .theme-dark, .theme-darker, .theme-midnight) {
  --text-link: var(--text-accent) !important;
  --text-brand: var(--text-accent) !important;
}
[class*="privateChannelsHeaderContainer_"],
[class*="sectionLabel_"],
[class*="membersGroup_"],
[class*="containerDefault_"],
[class*="lookLink_"] {
  --hsl-main-color: var(--text-accent);
  --hsl-hover-color: var(--text-accent-hover);
}
[class*="chatContent_"],
[class*="messageContent_"] {
  text-shadow: var(--chat-text-shadow);
}`;
  return [
    "/**",
    ` * @name ${safeComment(state.meta.nameEn)} — Mishkat`,
    " * @author Mishkat Theme Studio",
    " * @version 1.0.0",
    ` * @description ${safeComment(state.meta.descEn)}`,
    " * @source https://clearvision.github.io",
    " */",
    imports,
    "",
    `/* SETTINGS */`,
    `:root {`,
    ...Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`),
    `}`,
    "",
    `/* LIGHT */`,
    varsBlock(":is(.theme-light, .theme-dark .theme-light)", lightVars),
    "",
    `/* ASH */`,
    varsBlock(":is(.theme-dark, .theme-light .theme-dark)", darkVars),
    "",
    `/* DARKER */`,
    varsBlock(":is(.theme-darker, .theme-light .theme-darker)", darkerVars),
    "",
    `/* ONYX */`,
    varsBlock(":is(.theme-midnight, .theme-light .theme-midnight)", onyxVars),
    "",
    glass
  ].join("\n");
}

function buildCss() {
  if (state.target === "web") return webCss();
  if (state.target === "vencord") return vencordCss();
  return dshCss();
}

function themeMeta() {
  return {
    nameAr: state.meta.nameAr,
    nameEn: state.meta.nameEn,
    slug: state.meta.slug,
    descAr: state.meta.descAr,
    descEn: state.meta.descEn,
    preset: state.preset,
    target: state.target,
    tags: state.meta.tags || [],
    notes: state.meta.notes || ""
  };
}

function buildJson() {
  if (state.target === "web") {
    const prefix = String(state.targetOptions.web.prefix || "mk").toLowerCase().replace(/[^a-z0-9-]/g, "") || "mk";
    return JSON.stringify({
      schema: "mishkat/web-tokens/v1",
      meta: themeMeta(),
      tokens: { light: webTokens(getPalette("light"), prefix), dark: webTokens(getPalette("dark"), prefix) },
      typography: { ...state.type },
      icons: { pack: state.icons.pack, stroke: state.icons.stroke, selected: state.icons.selected },
      form: { ...state.form },
      backdrop: { ...state.backdrop }
    }, null, 2);
  }
  if (state.target === "vencord") {
    return JSON.stringify({
      schema: "mishkat/vencord-theme/v1",
      meta: themeMeta(),
      variables: {
        mainColor: getPalette("dark").accent,
        hoverColor: getPalette("dark").accentHover,
        glassBlur: state.form.blur,
        glassRadius: state.form.radius,
        messageRadius: state.targetOptions.vencord.messageRadius,
        messageGap: state.targetOptions.vencord.messageGap,
        background: state.backdrop.preset,
        backdropUrl: state.backdrop.url,
        font: state.type.latin,
        codeFont: state.type.code
      },
      form: { ...state.form },
      backdrop: { ...state.backdrop }
    }, null, 2);
  }
  return JSON.stringify({
    schema: "mishkat/dsh-theme/v1",
    target: "dsh",
    theme: {
      id: state.meta.slug,
      name: state.meta.nameEn,
      nameZh: state.meta.nameAr,
      desc: state.meta.descEn,
      descZh: state.meta.descAr,
      tags: state.meta.tags || [],
      light: slots(getPalette("light")),
      dark: slots(getPalette("dark"))
    },
    typography: { ...state.type },
    icons: {
      pack: state.icons.pack,
      stroke: state.icons.stroke,
      corner: state.icons.corner,
      selected: state.icons.selected,
      note: "Product icons only. Complete SVG documents with viewBox; no style or script."
    },
    form: { ...state.form },
    backdrop: { ...state.backdrop },
    apply: state.targetOptions.dsh.selector === "named"
      ? `document.body.dataset.dshTheme = "${state.meta.slug}"`
      : "Settings → General → custom CSS (dsh-custom-css-lite)"
  }, null, 2);
}

function buildIconsJson() {
  const pack = ICON_PACKS.find((x) => x.id === state.icons.pack) || ICON_PACKS[0];
  const iconReplacementEnabled = state.target !== "dsh" || state.targetOptions.dsh.iconReplacements;
  const selected = iconReplacementEnabled ? ICON_META.filter((m) => state.icons.selected.includes(m.id)) : [];
  if (state.target === "dsh") {
    const symbols = {};
    for (const meta of selected) {
      const svg = iconSvg(meta.id);
      symbols[`dsw-icon-${meta.dsh}-regular`] = svg;
      symbols[`dsw-icon-${meta.dsh}-medium`] = svg;
    }
    return JSON.stringify({
      schema: "mishkat/dsh-icons/v1",
      pack: pack.name,
      license: pack.license,
      stroke: state.icons.stroke,
      corner: state.icons.corner,
      enabled: state.targetOptions.dsh.iconReplacements,
      note: state.targetOptions.dsh.iconReplacements
        ? "Keys are DSH ICON_SYMBOLS ids. Each value is a complete SVG document. Replacements are trusted like plugin code."
        : "Icon replacements are disabled for this brief. Re-enable them in Direction → Target.",
      symbols
    }, null, 2);
  }
  if (state.target === "vencord") {
    return JSON.stringify({
      schema: "mishkat/vencord-icons/v1",
      pack: pack.name,
      license: pack.license,
      note: "Vencord uses Discord's icon set. Only the home icon URL is a theme variable.",
      homeIcon: sanitizeImageUrl(state.targetOptions.vencord.homeIcon) || null,
      designPack: selected.map((m) => ({ name: m.en, dsh: m.dsh }))
    }, null, 2);
  }
  const icons = {};
  for (const meta of selected) icons[meta.id] = iconSvg(meta.id);
  return JSON.stringify({
    schema: "mishkat/web-icons/v1",
    pack: pack.name,
    license: pack.license,
    stroke: state.icons.stroke,
    icons
  }, null, 2);
}

function ratioText(value) {
  return `${round(value, 1)}:1 (${grade(value)})`;
}

function buildBrief() {
  const ar = state.lang === "ar";
  const pL = getPalette("light");
  const pD = getPalette("dark");
  const target = state.target === "dsh" ? "DeepSeek Harness" : state.target === "web" ? (ar ? "واجهة ويب" : "Web interface") : "Vencord / Discord";
  const preset = state.preset === "custom" ? (ar ? "مخصص" : "Custom") : ar ? PRESETS[state.preset]?.nameAr : PRESETS[state.preset]?.nameEn;
  const reportL = contrastReport("light");
  const reportD = contrastReport("dark");
  const pack = ICON_PACKS.find((x) => x.id === state.icons.pack) || ICON_PACKS[0];
  const ARABIC_RE = /[\u0600-\u06FF]/;
  const iso = (value) => {
    const text = String(value);
    return ARABIC_RE.test(text) ? text : `\u2066${text}\u2069`;
  };
  const line = (label, value) => `${label}: ${iso(value)}`;
  const rows = [];
  rows.push(ar ? "موجز الثيم — مشكاة / MISHKAT THEME BRIEF" : "MISHKAT THEME BRIEF");
  rows.push(ar ? "الإصدار: 1" : "Version: 1");
  rows.push(line(ar ? "الهدف" : "Target", target));
  rows.push(line(ar ? "الاسم" : "Name", `${state.meta.nameAr} · ${state.meta.nameEn}`));
  rows.push(line(ar ? "المعرّف" : "Slug", state.meta.slug));
  rows.push(line(ar ? "الستايل" : "Style", preset || "—"));
  rows.push(line(ar ? "المزاج" : "Mood", (state.meta.tags || []).join(ar ? " · " : " · ")));
  rows.push(line(ar ? "الوصف" : "Description", ar ? state.meta.descAr : state.meta.descEn));
  if (state.preset === "fayruz") rows.push(line(ar ? "المرجع" : "Reference", "ClearVision V7 Blur (ClearVision Team)"));
  rows.push("");
  rows.push(ar ? "— اللوحة —" : "— PALETTE —");
  const paletteBlock = (label, p) => {
    rows.push(label);
    rows.push(`  ${line(ar ? "الخلفية" : "bg", p.bg)}`);
    rows.push(`  ${line(ar ? "السطح" : "surface", p.surface)}`);
    rows.push(`  ${line(ar ? "سطح ثانوي" : "surfaceAlt", p.surfaceAlt)}`);
    rows.push(`  ${line(ar ? "الحبر" : "text", p.text)}`);
    rows.push(`  ${line(ar ? "نص ثانوي" : "text2", p.text2)}`);
    rows.push(`  ${line(ar ? "نص ثالث" : "text3", p.text3)}`);
    rows.push(`  ${line(ar ? "التمييز" : "accent", p.accent)}`);
    rows.push(`  ${line(ar ? "نص التمييز" : "accentText", p.accentText)}`);
    rows.push(`  ${line(ar ? "الشريط" : "sidebar", p.sidebar)}`);
    rows.push(`  ${line(ar ? "الكود" : "code", p.code)}`);
    rows.push(`  ${line(ar ? "شريط الكود" : "codeBanner", p.codeBanner)}`);
    rows.push(`  ${line(ar ? "الفقاعة" : "bubble", p.bubble)}`);
    rows.push(`  ${line(ar ? "القوائم" : "menu", p.menu)}`);
    rows.push(`  ${line(ar ? "تحذير" : "warn", p.warn)}`);
    rows.push(`  ${line(ar ? "خطأ" : "error", p.error)}`);
    rows.push(`  ${line(ar ? "نجاح" : "success", p.success)}`);
    rows.push(`  ${line(ar ? "الحدود" : "border", `${p.borderStrength}% · ${p.border}`)}`);
    rows.push("");
  };
  paletteBlock(ar ? "فاتح" : "Light", pL);
  paletteBlock(ar ? "داكن" : "Dark", pD);
  rows.push(ar ? "— التباين —" : "— CONTRAST —");
  rows.push(`  light: ${ar ? "نص" : "text"} ${iso(ratioText(reportL.body.ratio))} · ${ar ? "ثانوي" : "secondary"} ${iso(ratioText(reportL.secondary.ratio))} · ${ar ? "تمييز" : "accent"} ${iso(ratioText(reportL.accent.ratio))}`);
  rows.push(`  dark:  ${ar ? "نص" : "text"} ${iso(ratioText(reportD.body.ratio))} · ${ar ? "ثانوي" : "secondary"} ${iso(ratioText(reportD.secondary.ratio))} · ${ar ? "تمييز" : "accent"} ${iso(ratioText(reportD.accent.ratio))}`);
  rows.push("");
  rows.push(ar ? "— الخطوط —" : "— TYPOGRAPHY —");
  rows.push(line(ar ? "عربي" : "Arabic", state.type.arabic));
  rows.push(line(ar ? "لاتيني" : "Latin", state.type.latin));
  rows.push(line(ar ? "كود" : "Code", state.type.code));
  rows.push(line(ar ? "الحجم" : "Size", `text ${state.type.size}px · code ${state.type.codeSize}px · leading ${state.type.leading} · weight ${state.type.weight}`));
  rows.push(line(ar ? "التحميل" : "Loading", state.type.loadFonts ? "Google Fonts + local fallback" : "system / local fonts only"));
  rows.push("");
  rows.push(ar ? "— الأيقونات —" : "— ICONS —");
  rows.push(line(ar ? "المكتبة" : "Pack", `${pack.name} (${pack.license})`));
  rows.push(line(ar ? "السُمك" : "Stroke", state.icons.stroke));
  rows.push(line(ar ? "الحواف" : "Corners", state.icons.corner === "round" ? "round" : "square"));
  rows.push(line(ar ? "المستبدل" : "Replaced", state.target === "dsh" && !state.targetOptions.dsh.iconReplacements
    ? (ar ? "معطّل لهذا الموجز" : "disabled for this brief")
    : `${state.icons.selected.length} / ${ICON_META.length}: ${ICON_META.filter((m) => state.icons.selected.includes(m.id)).map((m) => (ar ? m.ar : m.en)).join("، ")}`));
  rows.push("");
  rows.push(ar ? "— الشكل —" : "— FORM —");
  rows.push(line(ar ? "نصف القطر" : "Radius", `${state.form.radius}px`));
  rows.push(line(ar ? "الظل" : "Shadow", state.form.shadow));
  rows.push(line(ar ? "الزجاج" : "Glass", `${state.form.blur}px blur · ${state.form.saturate}% saturate · ${state.form.glassEdges ? (ar ? "حواف مضيئة" : "lit edges") : (ar ? "بلا حواف مضيئة" : "no lit edges")}`));
  rows.push(line(ar ? "الكثافة" : "Density", state.form.density));
  rows.push(line(ar ? "الحركة" : "Motion", state.form.motion));
  rows.push(line(ar ? "الحدود" : "Borders", `${state.form.border} · ${state.form.borderStrength}%`));
  rows.push(line(ar ? "الملمس" : "Texture", state.form.texture));
  rows.push(line(ar ? "الخلفية" : "Backdrop", state.backdrop.kind === "image" ? state.backdrop.url : state.backdrop.kind === "preset" ? (ar ? BACKDROPS[state.backdrop.preset]?.ar : BACKDROPS[state.backdrop.preset]?.en) : (ar ? "بلا" : "none")));
  rows.push("");
  rows.push(ar ? "— ماذا تبني —" : "— WHAT TO BUILD —");
  if (state.target === "dsh") {
    rows.push(ar ? "1) CSS جاهز للصق في DSH → الإعدادات → عام → CSS مخصص، أو" : "1) Ready CSS for DSH → Settings → General → custom CSS, or");
    rows.push(ar ? "2) بلجن ثيم أصلي (client) يستخدم ctx.theme.register / overrideTokens، مع استبدال الأيقونات المحددة." : "2) A native client theme plugin using ctx.theme.register / overrideTokens, with the selected icon replacements.");
    rows.push(ar ? `المحدد: ${state.targetOptions.dsh.selector === "named" ? "ثيم مسمّى" : "دائم"}${state.targetOptions.dsh.lockType ? " · حجم الخط مثبّت" : ""}.` : `Selector: ${state.targetOptions.dsh.selector === "named" ? "named theme" : "always on"}${state.targetOptions.dsh.lockType ? " · type size locked" : ""}.`);
  } else if (state.target === "web") {
    rows.push(ar ? "ورقة تصميم (design tokens) + مكوّنات أساسية: أسطح، أزرار، حقول، زجاج." : "A design-token sheet + component starter: surfaces, buttons, fields, glass.");
    rows.push(ar ? `بادئة المتغيرات: ${state.targetOptions.web.prefix}` : `Token prefix: ${state.targetOptions.web.prefix}`);
  } else {
    rows.push(ar ? "ملف `.theme.css` لـ Vencord، مبني على ClearVision V7:" : "A `.theme.css` for Vencord, built on ClearVision V7:");
    rows.push(ar ? `نصف قطر صندوق الرسالة ${state.targetOptions.vencord.messageRadius}px · الفراغ ${state.targetOptions.vencord.messageGap}px · استيراد الأساس ${state.targetOptions.vencord.importBase ? "مفعّل" : "متوقف"}.` : `Message box ${state.targetOptions.vencord.messageRadius}px · gap ${state.targetOptions.vencord.messageGap}px · base import ${state.targetOptions.vencord.importBase ? "on" : "off"}.`);
  }
  rows.push("");
  rows.push(ar ? "— ملاحظات —" : "— NOTES —");
  rows.push(state.meta.notes.trim() || (ar ? "لا ملاحظات إضافية." : "No extra notes."));
  rows.push("");
  rows.push(ar ? "— نهاية الموجز —" : "— END OF BRIEF —");
  return rows.join("\n");
}

/* ---------------- output drawer ---------------- */

function tabsForTarget() {
  return [
    { id: "brief", ar: "الموجز", en: "Brief" },
    { id: "css", ar: "CSS", en: "CSS" },
    { id: "json", ar: state.target === "dsh" ? "JSON الثيم" : state.target === "web" ? "توكنز JSON" : "JSON", en: state.target === "dsh" ? "Theme JSON" : state.target === "web" ? "Tokens JSON" : "JSON" },
    { id: "icons", ar: "الأيقونات", en: "Icons" }
  ];
}

function getTabText(tab) {
  if (tab === "css") return buildCss();
  if (tab === "json") return buildJson();
  if (tab === "icons") return buildIconsJson();
  return buildBrief();
}

function renderTabs() {
  const holder = $("#drawer-tabs");
  if (!holder) return;
  const tabs = tabsForTarget();
  if (!tabs.some((t) => t.id === state.output.tab)) state.output.tab = "brief";
  holder.innerHTML = tabs.map((tab) => `<button type="button" class="drawer-tab${state.output.tab === tab.id ? " active" : ""}" data-tab="${tab.id}" role="tab" aria-selected="${state.output.tab === tab.id}">${esc(state.lang === "ar" ? tab.ar : tab.en)}</button>`).join("");
}

function renderDrawer() {
  renderTabs();
  const ar = state.lang === "ar";
  setText("#drawer-title", ar ? "موجز الثيم جاهز" : "Your theme brief is ready");
  setText("#drawer-sub", ar ? "انسخه والصقه في المحادثة، وسأبني الثيم كما هو." : "Copy it into the chat and I will build it exactly.");
  setText("#drawer-name", ar ? state.meta.nameAr : state.meta.nameEn);
  setText("#drawer-desc", ar ? state.meta.descAr : state.meta.descEn);
  const p = getPalette(state.preview.mode);
  $("#drawer-swatches").innerHTML = [p.bg, p.surface, p.accent, p.text, p.sidebar, p.code].map((c) => `<i style="background:${esc(c)}"></i>`).join("");
  const checks = [
    [ar ? "الهدف" : "Target", state.target === "dsh" ? "DSH" : state.target === "web" ? (ar ? "ويب" : "Web") : "Vencord"],
    [ar ? "الخط" : "Type", `${state.type.arabic} + ${state.type.latin}`],
    [ar ? "الأيقونات" : "Icons", `${ICON_PACKS.find((x) => x.id === state.icons.pack)?.name} · ${state.icons.selected.length}`],
    [ar ? "الزجاج" : "Glass", `${state.form.blur}px · ${state.form.radius}px`]
  ];
  $("#drawer-checks").innerHTML = checks.map(([key, value]) => `<div class="ds-check">${ico("check", 12)}<span><b>${esc(key)}:</b> ${esc(value)}</span></div>`).join("");
  const note = state.target === "dsh"
    ? (ar ? "سأحوّله إلى CSS جاهز أو بلجن ثيم أصلي، ثم أتحقق من الوضعين الفاتح والداكن." : "I will turn it into ready CSS or a native theme plugin, then verify both light and dark.")
    : state.target === "web"
      ? (ar ? "سأحوّله إلى ورقة توكنز ومكوّنات أساسية قابلة للنسخ." : "I will turn it into a token sheet and a usable component starter.")
      : (ar ? "سأحوّله إلى ملف `.theme.css` لـ Vencord مع تعليقات التركيب." : "I will turn it into a Vencord `.theme.css` with install notes.");
  $("#drawer-note").innerHTML = `<b>${ar ? "ماذا بعد؟" : "What next?"}</b> ${esc(note)}`;
  setText("#drawer-footnote", ar ? "الملخص هو الجزء الأهم. CSS وJSON اختياريان للبناء المباشر." : "The brief is the important part. CSS and JSON are optional for direct builds.");
  const labels = {
    brief: [ar ? "انسخ الموجز" : "Copy brief", ar ? "تنزيل الموجز" : "Download brief"],
    css: [ar ? "انسخ CSS" : "Copy CSS", ar ? "تنزيل CSS" : "Download CSS"],
    json: [ar ? "انسخ JSON" : "Copy JSON", ar ? "تنزيل JSON" : "Download JSON"],
    icons: [ar ? "انسخ الأيقونات" : "Copy icons", ar ? "تنزيل الأيقونات" : "Download icons"]
  };
  const pair = labels[state.output.tab] || labels.brief;
  const copyBtn = $("#copy-btn");
  if (copyBtn) {
    copyBtn.innerHTML = `${ico("copy", 15)}<span class="ar-only">${esc(pair[0])}</span><span class="en-only">${esc(pair[0])}</span>`;
  }
  const downloadBtn = $("#download-btn");
  if (downloadBtn) {
    downloadBtn.innerHTML = `${ico("download", 15)}<span class="ar-only">${esc(pair[1])}</span><span class="en-only">${esc(pair[1])}</span>`;
  }
  const text = getTabText(state.output.tab);
  const output = $("#output-text");
  if (output) {
    output.value = text;
    output.dir = "ltr";
    output.style.textAlign = "left";
  }
}

function openDrawer() {
  lastFocused = document.activeElement;
  state.output.tab = "brief";
  renderDrawer();
  const drawer = $("#drawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#drawer-close")?.focus(), 40);
}

function closeDrawer() {
  const drawer = $("#drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
}

function scheduleOutput() {
  clearTimeout(outputTimer);
  outputTimer = setTimeout(() => {
    if ($("#drawer")?.classList.contains("open")) renderDrawer();
  }, 80);
}

async function copyText(text, isBrief = false) {
  const done = () => {
    toast(isBrief ? L("تم النسخ — الصقه في المحادثة", "Copied — paste it into the chat") : L("تم النسخ", "Copied"));
    const stateEl = $("#copy-state");
    if (stateEl) {
      stateEl.innerHTML = `${ico("check", 12)} ${L("تم", "Copied")}`;
      setTimeout(() => { stateEl.textContent = ""; }, 1800);
    }
  };
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      done();
      return;
    }
    throw new Error("fallback");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch {
      toast(L("تعذّر النسخ — حدّد النص يدويًا", "Copy failed — select the text manually"));
    }
  }
}

function downloadCurrent() {
  const tab = state.output.tab;
  const text = getTabText(tab);
  let filename = state.meta.slug || "theme";
  let mime = "text/plain;charset=utf-8";
  if (tab === "css") {
    filename += state.target === "vencord" ? ".theme.css" : ".css";
    mime = "text/css;charset=utf-8";
  } else if (tab === "json") {
    filename += state.target === "dsh" ? "-theme.json" : state.target === "web" ? "-tokens.json" : "-vencord.json";
    mime = "application/json;charset=utf-8";
  } else if (tab === "icons") {
    filename += "-icons.json";
    mime = "application/json;charset=utf-8";
  } else {
    filename += "-brief.md";
    mime = "text/markdown;charset=utf-8";
  }
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(L(`نُزّل ${filename}`, `Downloaded ${filename}`));
}

let toastTimer = null;
function toast(message) {
  const el = $("#toast");
  const text = $("#toast-text");
  if (!el || !text) return;
  text.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------- state mutations ---------------- */

function applyPreset(id, opts = {}) {
  const preset = PRESETS[id];
  if (!preset) return;
  const oldLang = state.lang;
  const oldTarget = state.target;
  state.preset = id;
  state.meta.nameAr = preset.nameAr;
  state.meta.nameEn = preset.nameEn;
  state.meta.slug = slugify(preset.nameEn);
  state.meta.descAr = preset.descAr;
  state.meta.descEn = preset.descEn;
  state.meta.tags = String(preset.tagAr).split("·").map((s) => s.trim()).filter(Boolean);
  state.colors.light = { ...preset.light };
  state.colors.dark = { ...preset.dark };
  state.overrides = { light: {}, dark: {} };
  state.autoAccent = true;
  state.type = { ...state.type, ...preset.type };
  state.icons = { ...state.icons, ...preset.icons, selected: state.icons.selected && state.icons.selected.length ? state.icons.selected : ICON_META.map((m) => m.id) };
  state.form = { ...state.form, ...preset.form };
  state.backdrop = { ...state.backdrop, ...preset.backdrop };
  state.lang = oldLang;
  state.target = oldTarget;
  state.paletteMode = state.preview.mode;
  if (!opts.silent) {
    renderAll();
    scheduleSave();
    if (opts.toast) toast(L("طُبّق الستايل", "Style applied"));
  }
}

function setTarget(target) {
  if (!["dsh", "web", "vencord"].includes(target)) return;
  state.target = target;
  renderAll();
  scheduleSave();
}

function setLang(lang) {
  if (!["ar", "en"].includes(lang)) return;
  state.lang = lang;
  state.preview.lang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.lang = lang;
  document.title = lang === "ar" ? "مشكاة — استوديو الثيم | Mishkat Theme Studio" : "Mishkat — Theme Studio";
  $$(".lang-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === lang));
  renderAll();
  scheduleSave();
}

function setSection(section) {
  if (!SECTIONS.includes(section)) return;
  state.section = section;
  renderRail();
  renderInspector();
  scheduleSave();
}

function setColor(mode, key, value) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return;
  if (ANCHOR_KEYS.has(key)) {
    state.colors[mode][key] = value;
    if (key === "accentText") state.autoAccent = false;
  } else {
    state.overrides[mode][key] = value;
  }
  applyPreview();
  scheduleOutput();
  scheduleSave();
}

function fixContrast() {
  const mode = state.paletteMode;
  const p = getPalette(mode);
  state.colors[mode].text = ensureContrast(p.text, p.bg, 4.6);
  state.overrides[mode].text2 = ensureContrast(p.text2, p.surface, 4.6);
  const accentText = ensureContrast(p.accentText, p.accent, 4.5);
  if (accentText !== p.accentText) {
    state.colors[mode].accentText = accentText;
    state.autoAccent = false;
  }
  renderInspector();
  applyPreview();
  scheduleOutput();
  scheduleSave();
  toast(L("عُدّل التباين", "Contrast adjusted"));
}

function toggleSwitch(path) {
  const value = !getPath(state, path);
  setPath(state, path, value);
  if (path === "autoAccent") {
    if (!value) state.colors[state.paletteMode].accentText = pickOn(getPalette(state.paletteMode).accent);
    else delete state.colors[state.paletteMode].accentText;
    renderInspector();
  }
  if (path === "type.loadFonts") updateFontLink();
  $$(`[data-switch="${path}"]`).forEach((el) => {
    el.classList.toggle("on", value);
    el.setAttribute("aria-pressed", String(value));
  });
  applyPreview();
  scheduleOutput();
  scheduleSave();
}

function randomize() {
  const ids = Object.keys(PRESETS);
  const id = ids[Math.floor(Math.random() * ids.length)];
  applyPreset(id, { silent: true });
  const d = Math.round(rand(-24, 24));
  state.colors.light.accent = rotateHue(state.colors.light.accent, d);
  state.colors.dark.accent = rotateHue(state.colors.dark.accent, d);
  state.form.radius = clamp(Math.round(state.form.radius + rand(-4, 5)), 0, 28);
  state.form.blur = clamp(Math.round(state.form.blur + rand(-6, 8)), 0, 24);
  state.preset = id;
  renderAll();
  scheduleSave();
  toast(L("ستايل مفاجئ", "A surprise style"));
}

function resetDesign() {
  const ok = window.confirm(L("إعادة كل شيء إلى فيروز؟ ستفقد تعديلاتك الحالية.", "Reset everything to Fayruz? Your current edits will be lost."));
  if (!ok) return;
  const lang = state.lang;
  const target = state.target;
  state = clone(DEFAULT_STATE);
  state.lang = lang;
  state.target = target;
  state.section = "direction";
  state.preview = { mode: "dark", lang: "ar", view: "chat", mobile: false };
  state.paletteMode = "dark";
  state.icons.selected = ICON_META.map((m) => m.id);
  applyPreset("fayruz", { silent: true });
  state.lang = lang;
  state.target = target;
  renderAll();
  scheduleSave();
  toast(L("أُعيد التصميم", "Design reset"));
}

function renderAll() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.lang = state.lang;
  $$(".lang-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === state.lang));
  renderRail();
  renderInspector();
  applyPreview();
  if ($("#drawer")?.classList.contains("open")) renderDrawer();
}

/* ---------------- events ---------------- */

function bindEvents() {
  document.addEventListener("click", (event) => {
    const el = event.target;
    const targetBtn = el.closest(".target-btn[data-target]");
    if (targetBtn) { setTarget(targetBtn.dataset.target); return; }
    const langBtn = el.closest(".lang-btn[data-lang]");
    if (langBtn) { setLang(langBtn.dataset.lang); return; }
    const rail = el.closest("[data-section]");
    if (rail) { setSection(rail.dataset.section); return; }
    const preset = el.closest("[data-preset]");
    if (preset) { applyPreset(preset.dataset.preset, { toast: true }); return; }
    const view = el.closest("[data-preview-view]");
    if (view) { state.preview.view = view.dataset.previewView; applyPreview(); scheduleSave(); return; }
    const plang = el.closest("[data-preview-lang]");
    if (plang) { state.preview.lang = plang.dataset.previewLang; applyPreview(); scheduleSave(); return; }
    const pmode = el.closest("[data-preview-mode]");
    if (pmode) { state.preview.mode = pmode.dataset.previewMode; state.paletteMode = state.preview.mode; applyPreview(); if (state.section === "palette") renderInspector(); scheduleSave(); return; }
    if (el.closest("#mobile-toggle")) { state.preview.mobile = !state.preview.mobile; applyPreview(); scheduleSave(); return; }
    const pack = el.closest("[data-pack]");
    if (pack) { state.icons.pack = pack.dataset.pack; renderInspector(); applyPreview(); scheduleOutput(); scheduleSave(); return; }
    const icon = el.closest("[data-icon]");
    if (icon) {
      const id = icon.dataset.icon;
      const set = new Set(state.icons.selected);
      if (set.has(id)) set.delete(id); else set.add(id);
      state.icons.selected = Array.from(set);
      icon.classList.toggle("active", set.has(id));
      icon.setAttribute("aria-pressed", String(set.has(id)));
      const summary = $("#icon-summary");
      if (summary) summary.textContent = `${state.icons.selected.length} / ${ICON_META.length}`;
      applyPreview(); scheduleOutput(); scheduleSave();
      return;
    }
    const pair = el.closest("[data-pair]");
    if (pair) { const p = PAIRS[Number(pair.dataset.pair)]; if (p) { state.type.arabic = p.ar; state.type.latin = p.en; renderInspector(); applyPreview(); scheduleOutput(); scheduleSave(); } return; }
    const paletteMode = el.closest("[data-mode-tab]");
    if (paletteMode) { state.paletteMode = paletteMode.dataset.modeTab; state.preview.mode = state.paletteMode; renderInspector(); applyPreview(); scheduleSave(); return; }
    const shadow = el.closest("[data-shadow]");
    if (shadow) { state.form.shadow = shadow.dataset.shadow; renderInspector(); applyPreview(); scheduleOutput(); scheduleSave(); return; }
    const texture = el.closest("[data-texture]");
    if (texture) { state.form.texture = texture.dataset.texture; renderInspector(); applyPreview(); scheduleOutput(); scheduleSave(); return; }
    const backdrop = el.closest("[data-backdrop]");
    if (backdrop) { state.backdrop.kind = "preset"; state.backdrop.preset = backdrop.dataset.backdrop; renderInspector(); applyPreview(); scheduleOutput(); scheduleSave(); return; }
    const setpath = el.closest("[data-setpath]");
    if (setpath) { setPath(state, setpath.dataset.setpath, setpath.dataset.value); renderInspector(); applyPreview(); scheduleOutput(); scheduleSave(); return; }
    const sw = el.closest("[data-switch]");
    if (sw) { toggleSwitch(sw.dataset.switch); return; }
    const resetColor = el.closest("[data-color-reset]");
    if (resetColor) {
      const [mode, key] = resetColor.dataset.colorReset.split(".");
      delete state.overrides[mode][key];
      renderInspector(); applyPreview(); scheduleOutput(); scheduleSave();
      return;
    }
    const tab = el.closest("[data-tab]");
    if (tab) { state.output.tab = tab.dataset.tab; renderTabs(); renderDrawer(); scheduleSave(); return; }
    const action = el.closest("[data-action]")?.dataset.action;
    if (action === "open-drawer") { openDrawer(); return; }
    if (action === "fix-contrast") { fixContrast(); return; }
    if (el.closest("#open-drawer")) { openDrawer(); return; }
    if (el.closest("#drawer-close")) { closeDrawer(); return; }
    if (el.closest("#copy-btn")) { copyText(getTabText(state.output.tab), state.output.tab === "brief"); return; }
    if (el.closest("#download-btn")) { downloadCurrent(); return; }
    if (el.closest("#random-btn")) { randomize(); return; }
    if (el.closest("#reset-btn")) { resetDesign(); return; }
    if (el.closest("#prev-btn")) {
      const i = SECTIONS.indexOf(state.section);
      if (i > 0) setSection(SECTIONS[i - 1]);
      return;
    }
    if (el.closest("#next-btn")) {
      const i = SECTIONS.indexOf(state.section);
      if (i < SECTIONS.length - 1) setSection(SECTIONS[i + 1]);
      else openDrawer();
      return;
    }
  });

  document.addEventListener("input", (event) => {
    const el = event.target;
    if (el.matches("[data-color]")) {
      const [mode, key] = el.dataset.color.split(".");
      const value = el.value;
      const row = el.closest(".color-row");
      const hex = row?.querySelector("[data-hex]");
      if (hex) hex.value = value;
      const swatch = row?.querySelector(".swatch");
      if (swatch) swatch.style.setProperty("--sw", value);
      setColor(mode, key, value);
      return;
    }
    if (el.matches("[data-hex]")) {
      const [mode, key] = el.dataset.hex.split(".");
      const value = el.value.trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
        const row = el.closest(".color-row");
        const color = row?.querySelector("[data-color]");
        const swatch = row?.querySelector(".swatch");
        if (color) color.value = value;
        if (swatch) swatch.style.setProperty("--sw", value);
        setColor(mode, key, value);
      }
      return;
    }
    if (el.matches("[data-range]")) {
      const path = el.dataset.range;
      const value = Number(el.value);
      setPath(state, path, value);
      paintRange(el);
      const readout = $(`[data-range-value="${path}"]`);
      if (readout) readout.textContent = `${value}${el.dataset.unit || ""}`;
      applyPreview(); scheduleOutput(); scheduleSave();
      return;
    }
    if (el.matches("[data-text]")) {
      const path = el.dataset.text;
      if (path === "meta.tagsText") {
        state.meta.tags = el.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
      } else if (path === "meta.nameEn") {
        const oldAuto = slugify(state.meta.nameEn);
        setPath(state, path, el.value);
        if (!state.meta.slug || state.meta.slug === oldAuto) state.meta.slug = slugify(el.value);
      } else if (path === "meta.slug") {
        state.meta.slug = el.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      } else if (path === "backdrop.url") {
        setPath(state, path, el.value);
        state.backdrop.kind = el.value.trim() ? "image" : "preset";
      } else {
        setPath(state, path, el.value);
      }
      applyPreview(); scheduleOutput(); scheduleSave();
    }
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el.matches("[data-select]")) {
      setPath(state, el.dataset.select, el.value);
      renderInspector();
      applyPreview(); scheduleOutput(); scheduleSave();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#drawer")?.classList.contains("open")) closeDrawer();
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") openDrawer();
  });

  $("#drawer")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeDrawer();
  });
}

/* ---------------- init ---------------- */

function init() {
  state = loadState();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.lang = state.lang;
  document.title = state.lang === "ar" ? "مشكاة — استوديو الثيم | Mishkat Theme Studio" : "Mishkat — Theme Studio";
  $$(".lang-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === state.lang));
  bindEvents();
  renderAll();
  if (savedOnLoad) {
    setTimeout(() => toast(L("استُعيدت جلستك السابقة", "Your last session was restored")), 600);
  }
  setSaveState(L("يُحفظ محليًا", "Saved locally"));
}

init();

/* ============================================================
   Mishkat Theme Studio — presets, fonts, icon packs, defaults
   ============================================================ */

const PRESETS = {
  fayruz: {
    nameAr: "فيروز",
    nameEn: "Fayruz",
    tagAr: "زجاج · ماء · ضوء",
    tagEn: "Glass · water · light",
    descAr: "واجهة زجاجية باردة، حبر فيروزي، وقراءة عربية مريحة.",
    descEn: "Cool glass, aquamarine ink, and comfortable Arabic reading.",
    light: { bg: "#eaf3fa", surface: "#ffffff", text: "#0b2236", accent: "#0b5f8a", sidebar: "#dcebf5", code: "#e6f0f7", warn: "#9a5b00", error: "#b3261e", success: "#0b6b3a" },
    dark: { bg: "#06121e", surface: "#0b1e2e", text: "#e6f2fb", accent: "#6cb6ff", sidebar: "#081725", code: "#0a1a28", warn: "#f0b35a", error: "#ff8a80", success: "#5eead4" },
    type: { arabic: "IBM Plex Sans Arabic", latin: "Sora", code: "IBM Plex Mono", size: 15, codeSize: 12, leading: 1.85, weight: 600, loadFonts: true },
    icons: { pack: "lucide", stroke: 1.75, corner: "round" },
    form: { radius: 18, shadow: "soft", blur: 16, saturate: 125, density: "comfortable", motion: "calm", border: "hairline", borderStrength: 55, texture: "none", glassEdges: true },
    backdrop: { kind: "preset", preset: "ocean", url: "", dim: 0.62, blur: 0, saturate: 120 },
    credit: true
  },
  layl: {
    nameAr: "ليل",
    nameEn: "Layl",
    tagAr: "حبر · رمل · زمرد",
    tagEn: "Ink · sand · emerald",
    descAr: "حبر داكن، رمل دافئ، ولمسة زمردية هادئة.",
    descEn: "Dark ink, warm sand, and a quiet emerald note.",
    light: { bg: "#f6f2ea", surface: "#fffaf2", text: "#2b2b2b", accent: "#0f766e", sidebar: "#efe8dc", code: "#eee7db", warn: "#9a5b00", error: "#b3261e", success: "#0b6b3a" },
    dark: { bg: "#0e1216", surface: "#131920", text: "#e8e2d6", accent: "#5eead4", sidebar: "#10161c", code: "#11181f", warn: "#f0b35a", error: "#ff8a80", success: "#5eead4" },
    type: { arabic: "IBM Plex Sans Arabic", latin: "Space Grotesk", code: "IBM Plex Mono", size: 15, codeSize: 12, leading: 1.85, weight: 600, loadFonts: true },
    icons: { pack: "tabler", stroke: 1.6, corner: "round" },
    form: { radius: 12, shadow: "none", blur: 0, saturate: 100, density: "comfortable", motion: "calm", border: "hairline", borderStrength: 45, texture: "none", glassEdges: false },
    backdrop: { kind: "none", preset: "none", url: "", dim: 1, blur: 0, saturate: 100 }
  },
  waraq: {
    nameAr: "ورق",
    nameEn: "Waraq",
    tagAr: "ورق · حبر · طين",
    tagEn: "Paper · ink · clay",
    descAr: "ورق دافئ، حبر فحمي، وهامش تحريري واسع.",
    descEn: "Warm paper, charcoal ink, and generous editorial margins.",
    light: { bg: "#f4efe4", surface: "#fffaf0", text: "#2a2622", accent: "#b45309", sidebar: "#ece4d4", code: "#efe7d8", warn: "#92400e", error: "#b91c1c", success: "#3f6212" },
    dark: { bg: "#1b1713", surface: "#241f19", text: "#f2e9da", accent: "#f0b36a", sidebar: "#201a15", code: "#1e1914", warn: "#fbbf24", error: "#f87171", success: "#a3e635" },
    type: { arabic: "Noto Naskh Arabic", latin: "Fraunces", code: "IBM Plex Mono", size: 16, codeSize: 12, leading: 1.9, weight: 600, loadFonts: true },
    icons: { pack: "tabler", stroke: 1.5, corner: "round" },
    form: { radius: 8, shadow: "none", blur: 0, saturate: 100, density: "airy", motion: "calm", border: "crisp", borderStrength: 40, texture: "paper", glassEdges: false },
    backdrop: { kind: "preset", preset: "paper", url: "", dim: 1, blur: 0, saturate: 100 }
  },
  kathib: {
    nameAr: "كثيب",
    nameEn: "Kathib",
    tagAr: "رمل · تمر · شمس",
    tagEn: "Sand · date · sun",
    descAr: "رمال ذهبية، umber غامق، ودفء صحراوي.",
    descEn: "Golden sand, deep umber, and desert warmth.",
    light: { bg: "#f5ead8", surface: "#fff7e8", text: "#33261a", accent: "#9a3412", sidebar: "#eadcc4", code: "#f0e3cd", warn: "#92400e", error: "#b91c1c", success: "#3f6212" },
    dark: { bg: "#1a130d", surface: "#241a12", text: "#f3e4cf", accent: "#f59e0b", sidebar: "#20160e", code: "#1d140d", warn: "#fbbf24", error: "#f87171", success: "#a3e635" },
    type: { arabic: "Tajawal", latin: "Space Grotesk", code: "JetBrains Mono", size: 15, codeSize: 12, leading: 1.85, weight: 600, loadFonts: true },
    icons: { pack: "ph", stroke: 1.75, corner: "round" },
    form: { radius: 16, shadow: "soft", blur: 0, saturate: 100, density: "comfortable", motion: "calm", border: "hairline", borderStrength: 50, texture: "grain", glassEdges: false },
    backdrop: { kind: "preset", preset: "dune", url: "", dim: 0.7, blur: 0, saturate: 105 }
  },
  neon: {
    nameAr: "نيون",
    nameEn: "Neon",
    tagAr: "ليل · سايان · ليزر",
    tagEn: "Night · cyan · laser",
    descAr: "أسود عميق، سايان كهربائي، وحواف حادة.",
    descEn: "Deep black, electric cyan, and sharp edges.",
    light: { bg: "#eef7fb", surface: "#ffffff", text: "#08131a", accent: "#0e7490", sidebar: "#e0f0f7", code: "#e6f3f8", warn: "#9a5b00", error: "#b3261e", success: "#047857" },
    dark: { bg: "#07080d", surface: "#0d1018", text: "#e8f7ff", accent: "#22d3ee", sidebar: "#090b12", code: "#0a0d14", warn: "#fbbf24", error: "#fb7185", success: "#5eead4" },
    type: { arabic: "IBM Plex Sans Arabic", latin: "Sora", code: "JetBrains Mono", size: 14, codeSize: 11, leading: 1.7, weight: 600, loadFonts: true },
    icons: { pack: "heroSolid", stroke: 1.8, corner: "round" },
    form: { radius: 6, shadow: "glow", blur: 0, saturate: 100, density: "compact", motion: "snappy", border: "hairline", borderStrength: 60, texture: "none", glassEdges: false },
    backdrop: { kind: "none", preset: "none", url: "", dim: 1, blur: 0, saturate: 100 }
  },
  zujaj: {
    nameAr: "زجاج",
    nameEn: "Zujaj",
    tagAr: "ضباب · أزرق · هواء",
    tagEn: "Fog · blue · air",
    descAr: "ضباب أزرق، زجاج سميك، ومساحة تتنفس.",
    descEn: "Blue fog, thick glass, and room to breathe.",
    light: { bg: "#dfeaf2", surface: "#ffffff", text: "#102331", accent: "#2563eb", sidebar: "#d3e4ee", code: "#e3eef5", warn: "#9a5b00", error: "#b3261e", success: "#047857" },
    dark: { bg: "#0a1622", surface: "#102536", text: "#e8f2fb", accent: "#60a5fa", sidebar: "#0b1a28", code: "#0c1c2b", warn: "#fbbf24", error: "#fb7185", success: "#5eead4" },
    type: { arabic: "Noto Kufi Arabic", latin: "Manrope", code: "IBM Plex Mono", size: 15, codeSize: 12, leading: 1.9, weight: 600, loadFonts: true },
    icons: { pack: "lucide", stroke: 1.6, corner: "round" },
    form: { radius: 22, shadow: "deep", blur: 20, saturate: 130, density: "airy", motion: "calm", border: "hairline", borderStrength: 45, texture: "none", glassEdges: true },
    backdrop: { kind: "preset", preset: "ocean", url: "", dim: 0.55, blur: 0, saturate: 130 }
  },
  hibr: {
    nameAr: "حبر",
    nameEn: "Hibr",
    tagAr: "أبيض · أسود · أحمر",
    tagEn: "White · black · red",
    descAr: "أبيض وأسود، ولمسة حمراء واحدة. لا شيء زائد.",
    descEn: "Black and white, one red note. Nothing extra.",
    light: { bg: "#f7f7f5", surface: "#ffffff", text: "#111111", accent: "#c1121f", sidebar: "#efefec", code: "#f1f1ee", warn: "#92400e", error: "#b91c1c", success: "#166534" },
    dark: { bg: "#0b0b0b", surface: "#141414", text: "#f5f5f5", accent: "#ff6b6b", sidebar: "#101010", code: "#111111", warn: "#fbbf24", error: "#ff6b6b", success: "#4ade80" },
    type: { arabic: "Almarai", latin: "Instrument Serif", code: "IBM Plex Mono", size: 15, codeSize: 12, leading: 1.7, weight: 600, loadFonts: true },
    icons: { pack: "tabler", stroke: 1.5, corner: "round" },
    form: { radius: 2, shadow: "none", blur: 0, saturate: 100, density: "compact", motion: "none", border: "crisp", borderStrength: 70, texture: "none", glassEdges: false },
    backdrop: { kind: "none", preset: "none", url: "", dim: 1, blur: 0, saturate: 100 }
  },
  terminal: {
    nameAr: "طرفية",
    nameEn: "Terminal",
    tagAr: "CRT · فسفور · مونو",
    tagEn: "CRT · phosphor · mono",
    descAr: "شاشة CRT خضراء، خط أحادي، وضوء فسفوري.",
    descEn: "A green CRT, a monospaced grid, and phosphor light.",
    light: { bg: "#eef7ee", surface: "#ffffff", text: "#0a1f0d", accent: "#0b6b3a", sidebar: "#e3f0e4", code: "#e6f2e7", warn: "#8a5a00", error: "#b3261e", success: "#0b6b3a" },
    dark: { bg: "#050805", surface: "#0a120a", text: "#c8ffd4", accent: "#39ff88", sidebar: "#060b06", code: "#060d07", warn: "#fbbf24", error: "#ff6b6b", success: "#39ff88" },
    type: { arabic: "IBM Plex Sans Arabic", latin: "IBM Plex Mono", code: "JetBrains Mono", size: 14, codeSize: 11, leading: 1.65, weight: 600, loadFonts: true },
    icons: { pack: "heroSolid", stroke: 1.8, corner: "round" },
    form: { radius: 0, shadow: "none", blur: 0, saturate: 100, density: "compact", motion: "none", border: "crisp", borderStrength: 75, texture: "scan", glassEdges: false },
    backdrop: { kind: "preset", preset: "terminal", url: "", dim: 1, blur: 0, saturate: 100 }
  },
  warda: {
    nameAr: "وردة",
    nameEn: "Warda",
    tagAr: "خوخ · ذهب · مخمل",
    tagEn: "Plum · gold · velvet",
    descAr: "خوخ داكن، وردة ناعمة، وذهب خافت.",
    descEn: "Deep plum, soft rose, and muted gold.",
    light: { bg: "#fbf0f4", surface: "#fff8fa", text: "#2a1520", accent: "#9d174d", sidebar: "#f3e2e9", code: "#f6e8ee", warn: "#9a5b00", error: "#b3261e", success: "#047857" },
    dark: { bg: "#140b12", surface: "#1f121b", text: "#f7e8ef", accent: "#f0a6c0", sidebar: "#180d15", code: "#170d13", warn: "#fbbf24", error: "#fb7185", success: "#5eead4" },
    type: { arabic: "Amiri", latin: "Fraunces", code: "IBM Plex Mono", size: 16, codeSize: 12, leading: 1.9, weight: 600, loadFonts: true },
    icons: { pack: "ph", stroke: 1.75, corner: "round" },
    form: { radius: 20, shadow: "soft", blur: 8, saturate: 120, density: "airy", motion: "calm", border: "hairline", borderStrength: 45, texture: "none", glassEdges: true },
    backdrop: { kind: "preset", preset: "rose", url: "", dim: 0.62, blur: 0, saturate: 115 }
  },
  nana: {
    nameAr: "نعناع",
    nameEn: "Nana",
    tagAr: "نعناع · غابة · مرجان",
    tagEn: "Mint · forest · coral",
    descAr: "نعناع باهت، غابة عميقة، ولمسة مرجانية.",
    descEn: "Pale mint, deep forest, and a coral note.",
    light: { bg: "#eaf7ef", surface: "#ffffff", text: "#0c2a1c", accent: "#0f766e", sidebar: "#dcefe3", code: "#e2f2e8", warn: "#9a5b00", error: "#b3261e", success: "#0b6b3a" },
    dark: { bg: "#071a14", surface: "#0c261c", text: "#e3f7ee", accent: "#5eead4", sidebar: "#081e17", code: "#091f18", warn: "#fbbf24", error: "#fb7185", success: "#5eead4" },
    type: { arabic: "Readex Pro", latin: "DM Sans", code: "DM Mono", size: 15, codeSize: 12, leading: 1.85, weight: 600, loadFonts: true },
    icons: { pack: "lucide", stroke: 1.7, corner: "round" },
    form: { radius: 20, shadow: "soft", blur: 6, saturate: 115, density: "comfortable", motion: "calm", border: "hairline", borderStrength: 45, texture: "none", glassEdges: true },
    backdrop: { kind: "preset", preset: "mint", url: "", dim: 0.6, blur: 0, saturate: 110 }
  }
};

const ARABIC_FONTS = [
  { name: "IBM Plex Sans Arabic", labelAr: "آي بي إم بلكس العربية", stack: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, "Noto Naskh Arabic", sans-serif', google: "IBM+Plex+Sans+Arabic:wght@300;400;500;600;700" },
  { name: "Noto Kufi Arabic", labelAr: "نوتو كوفي العربية", stack: '"Noto Kufi Arabic", "IBM Plex Sans Arabic", Tahoma, sans-serif', google: "Noto+Kufi+Arabic:wght@400;500;600;700" },
  { name: "Noto Naskh Arabic", labelAr: "نوتو نسخ العربية", stack: '"Noto Naskh Arabic", "IBM Plex Sans Arabic", Tahoma, serif', google: "Noto+Naskh+Arabic:wght@400;500;600;700" },
  { name: "Tajawal", labelAr: "تجوال", stack: '"Tajawal", "IBM Plex Sans Arabic", Tahoma, sans-serif', google: "Tajawal:wght@300;400;500;700" },
  { name: "Almarai", labelAr: "المراعي", stack: '"Almarai", "IBM Plex Sans Arabic", Tahoma, sans-serif', google: "Almarai:wght@300;400;700;800" },
  { name: "Readex Pro", labelAr: "ريدكس برو", stack: '"Readex Pro", "IBM Plex Sans Arabic", Tahoma, sans-serif', google: "Readex+Pro:wght@300;400;500;600;700" },
  { name: "Amiri", labelAr: "أميري", stack: '"Amiri", "Noto Naskh Arabic", serif', google: "Amiri:ital,wght@0,400;0,700;1,400" },
  { name: "System Arabic", labelAr: "خط النظام", stack: '"Segoe UI", Tahoma, "Noto Naskh Arabic", sans-serif', google: null }
];

const LATIN_FONTS = [
  { name: "Sora", labelAr: "سورا", stack: '"Sora", "Space Grotesk", "Segoe UI", sans-serif', google: "Sora:wght@400;500;600;700" },
  { name: "Space Grotesk", labelAr: "سبيس جروتسك", stack: '"Space Grotesk", "Sora", "Segoe UI", sans-serif', google: "Space+Grotesk:wght@400;500;600;700" },
  { name: "Manrope", labelAr: "مانروب", stack: '"Manrope", "DM Sans", "Segoe UI", sans-serif', google: "Manrope:wght@400;500;600;700;800" },
  { name: "DM Sans", labelAr: "دي إم سانس", stack: '"DM Sans", "Manrope", "Segoe UI", sans-serif', google: "DM+Sans:wght@400;500;600;700" },
  { name: "Inter", labelAr: "إنتر", stack: '"Inter", "Segoe UI", sans-serif', google: "Inter:wght@400;500;600;700" },
  { name: "Fraunces", labelAr: "فراونسس", stack: '"Fraunces", Georgia, serif', google: "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700" },
  { name: "Instrument Serif", labelAr: "إنسترومنت سيريف", stack: '"Instrument Serif", Georgia, serif', google: "Instrument+Serif:ital@0;1" },
  { name: "IBM Plex Mono", labelAr: "آي بي إم بلكس مونو", stack: '"IBM Plex Mono", "JetBrains Mono", Consolas, monospace', google: "IBM+Plex+Mono:wght@400;500;600" },
  { name: "System UI", labelAr: "خط النظام", stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', google: null }
];

const CODE_FONTS = [
  { name: "IBM Plex Mono", labelAr: "آي بي إم بلكس مونو", stack: '"IBM Plex Mono", Consolas, monospace', google: "IBM+Plex+Mono:wght@400;500;600" },
  { name: "JetBrains Mono", labelAr: "جت برينز مونو", stack: '"JetBrains Mono", "Fira Code", Consolas, monospace', google: "JetBrains+Mono:wght@400;500;600;700" },
  { name: "DM Mono", labelAr: "دي إم مونو", stack: '"DM Mono", "IBM Plex Mono", monospace', google: "DM+Mono:wght@400;500" },
  { name: "Space Mono", labelAr: "سبيس مونو", stack: '"Space Mono", "IBM Plex Mono", monospace', google: "Space+Mono:ital,wght@0,400;0,700;1,400" },
  { name: "Consolas", labelAr: "كونسولاس", stack: 'Consolas, "SFMono-Regular", Menlo, monospace', google: null }
];

const PAIRS = [
  { ar: "IBM Plex Sans Arabic", en: "Sora", labelAr: "بلكس + سورا", labelEn: "Plex + Sora" },
  { ar: "IBM Plex Sans Arabic", en: "Space Grotesk", labelAr: "بلكس + سبيس", labelEn: "Plex + Space" },
  { ar: "Tajawal", en: "Space Grotesk", labelAr: "تجوال + سبيس", labelEn: "Tajawal + Space" },
  { ar: "Noto Kufi Arabic", en: "Manrope", labelAr: "كوفي + مانروب", labelEn: "Kufi + Manrope" },
  { ar: "Almarai", en: "DM Sans", labelAr: "المراعي + دي إم", labelEn: "Almarai + DM" },
  { ar: "Noto Naskh Arabic", en: "Fraunces", labelAr: "نسخ + فراونسس", labelEn: "Naskh + Fraunces" },
  { ar: "Amiri", en: "Fraunces", labelAr: "أميري + فراونسس", labelEn: "Amiri + Fraunces" },
  { ar: "Readex Pro", en: "DM Sans", labelAr: "ريدكس + دي إم", labelEn: "Readex + DM" }
];

const ICON_PACKS = [
  { id: "lucide", name: "Lucide", license: "ISC", noteAr: "خطّي · ٢٤px", noteEn: "Linear · 24px" },
  { id: "tabler", name: "Tabler", license: "MIT", noteAr: "خطّي · ٢٤px", noteEn: "Linear · 24px" },
  { id: "ph", name: "Phosphor", license: "MIT", noteAr: "منحنيات ناعمة", noteEn: "Soft curves" },
  { id: "hero", name: "Heroicons", license: "MIT", noteAr: "خطّي · ٢٤px", noteEn: "Outline · 24px" },
  { id: "heroSolid", name: "Heroicons Solid", license: "MIT", noteAr: "ممتلئ · ٢٠px", noteEn: "Solid · 20px" }
];

const ICON_META = [
  { id: "send", dsh: "send-outline", ar: "إرسال", en: "Send" },
  { id: "search", dsh: "search-outline", ar: "بحث", en: "Search" },
  { id: "settings", dsh: "settings-outline", ar: "إعدادات", en: "Settings" },
  { id: "plus", dsh: "plus-outline", ar: "إضافة", en: "Add" },
  { id: "close", dsh: "close-outline", ar: "إغلاق", en: "Close" },
  { id: "check", dsh: "check-outline", ar: "تم", en: "Check" },
  { id: "copy", dsh: "copy-outline", ar: "نسخ", en: "Copy" },
  { id: "sidebar", dsh: "panel-left-outline", ar: "شريط", en: "Sidebar" },
  { id: "sparkle", dsh: "enhance-outline", ar: "توهج", en: "Spark" },
  { id: "attach", dsh: "paperclip-outline", ar: "إرفاق", en: "Attach" },
  { id: "mic", dsh: "microphone-outline", ar: "صوت", en: "Mic" },
  { id: "user", dsh: "user-outline", ar: "مستخدم", en: "User" }
];

const BACKDROPS = {
  ocean: {
    ar: "محيط",
    en: "Ocean",
    light: "radial-gradient(900px 600px at 18% 0%, #d8eefb 0%, #eef9ff 46%, #cfe6f2 100%)",
    dark: "radial-gradient(900px 700px at 18% 0%, #0d3e5e 0%, #06121e 55%, #02070d 100%)"
  },
  dune: {
    ar: "كثيب",
    en: "Dune",
    light: "linear-gradient(160deg, #f7ead4 0%, #e7c9a0 60%, #d9b07d 100%)",
    dark: "linear-gradient(160deg, #2a1b0e 0%, #1a130d 55%, #0d0906 100%)"
  },
  paper: {
    ar: "ورق",
    en: "Paper",
    light: "linear-gradient(160deg, #f7f1e5 0%, #e8dcc8 100%)",
    dark: "linear-gradient(160deg, #241f19 0%, #15110d 100%)"
  },
  rose: {
    ar: "وردة",
    en: "Rose",
    light: "radial-gradient(800px 500px at 80% 0%, #fbe3ec 0%, #f4d3df 60%, #eac0d1 100%)",
    dark: "radial-gradient(800px 600px at 80% 0%, #3a1426 0%, #1a0b14 60%, #0b0509 100%)"
  },
  mint: {
    ar: "نعناع",
    en: "Mint",
    light: "radial-gradient(800px 500px at 20% 0%, #e8fbf1 0%, #d6f2e3 60%, #c2e6d4 100%)",
    dark: "radial-gradient(800px 600px at 20% 0%, #0d3b2b 0%, #071a14 60%, #020806 100%)"
  },
  terminal: {
    ar: "طرفية",
    en: "Terminal",
    light: "linear-gradient(180deg, #eef7ee 0%, #dcefdc 100%)",
    dark: "repeating-linear-gradient(0deg, #050805 0 3px, #061008 3px 4px)"
  },
  none: {
    ar: "بلا",
    en: "None",
    light: "linear-gradient(180deg, #f4f7f9 0%, #e8eef2 100%)",
    dark: "linear-gradient(180deg, #07131d 0%, #04101a 100%)"
  }
};

const DENSITY = { compact: { pad: 0.82, gap: 0.8 }, comfortable: { pad: 1, gap: 1 }, airy: { pad: 1.22, gap: 1.26 } };
const MOTION_MS = { none: 0, calm: 220, snappy: 120 };
const SHADOWS = {
  none: "none",
  soft: "0 8px 24px rgba(0, 0, 0, 0.22), inset 0 1px 0 var(--pv-edge)",
  deep: "0 18px 44px rgba(0, 0, 0, 0.42), inset 0 1px 0 var(--pv-edge)",
  glow: "0 0 0 1px var(--pv-accent-soft), 0 0 26px var(--pv-accent-glow), inset 0 1px 0 var(--pv-edge)"
};

const DEFAULT_STATE = {
  version: 1,
  lang: "ar",
  target: "dsh",
  section: "direction",
  preset: "fayruz",
  paletteMode: "dark",
  meta: {
    nameAr: PRESETS.fayruz.nameAr,
    nameEn: PRESETS.fayruz.nameEn,
    slug: "fayruz",
    descAr: PRESETS.fayruz.descAr,
    descEn: PRESETS.fayruz.descEn,
    tags: ["هادئ", "مائي", "زجاجي"],
    notes: ""
  },
  colors: {
    light: { ...PRESETS.fayruz.light },
    dark: { ...PRESETS.fayruz.dark }
  },
  overrides: { light: {}, dark: {} },
  autoAccent: true,
  type: { ...PRESETS.fayruz.type },
  icons: { ...PRESETS.fayruz.icons, selected: ICON_META.map((i) => i.id) },
  form: { ...PRESETS.fayruz.form },
  backdrop: { ...PRESETS.fayruz.backdrop },
  preview: { mode: "dark", lang: "ar", view: "chat", mobile: false },
  targetOptions: {
    dsh: { selector: "always", lockType: false, iconReplacements: true },
    web: { prefix: "mk", components: true },
    vencord: { importBase: true, messageRadius: 26, messageGap: 12, homeIcon: "" }
  },
  output: { tab: "brief" }
};

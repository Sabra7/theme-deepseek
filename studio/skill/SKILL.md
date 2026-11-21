---
name: mishkat-theme-studio
description: "Build a bilingual (AR/EN) single-file theme configurator — a live preview plus presets, colours, Arabic/Latin/code type, icon packs, and glass/form controls — that ends with a copyable brief and ready CSS/JSON for DeepSeek Harness, web design tokens, or a Vencord/ClearVision theme. Also the fast path for authoring DSH themes. Use when the user asks for a customization/configurator HTML, a theme builder/studio, a design-token brief, or a DeepSeek Harness theme."
metadata:
  version: "0.1.0"
  reference: "ClearVision V7 Blur (ClearVision Team)"
---

# Mishkat Theme Studio

A production-ready, single-file **theme atelier** and the reference for turning its brief into a
DeepSeek Harness theme.

- **Ready artefact:** `assets/theme-studio.html` — open it directly; no server, no build, no dependencies.
- **Editable source:** `assets/studio-src/` — `index.html`, `styles-base.css`, `styles-controls.css`,
  `data.js`, `app.js`, `icons-data.json`, `build.mjs`.
- **Theme knowledge:** `references/dsh-theme-authoring.md`, `references/token-map.md`,
  `references/icon-map.md`, `references/theme-studio-blueprint.md`, `references/research.md`.

## When to use

Use this skill when the task is any of:

1. "Make me a page where I can choose colours/fonts/icons/styles and copy the result back to you."
2. "Build a theme customizer / design brief generator / theme studio."
3. "Create a DeepSeek Harness theme" — start from the brief format and the authoring reference.
4. "Make a Vencord / BetterDiscord theme in the ClearVision glass style."
5. A follow-up to a Mishkat brief: the user pasted the generated brief and wants the theme built.

If the user only wants the finished theme (no configurator), skip the studio and go straight to
`references/dsh-theme-authoring.md`.

## Fast path

1. **Read the reference.** If the user attached an image, HTML, CSS, or screenshot, extract:
   - background/paper, surface, ink, accent, border, code, status colours;
   - type mood (Arabic + Latin), sizes, leading;
   - glass/radius/shadow/edge language;
   - any icon or layout signature.
   If there is no reference, ask one question and proceed with a named preset.
2. **Choose targets.** Default to DSH + web; add Vencord when the reference is Discord/ClearVision.
   The studio already has a three-way target switch.
3. **Copy the source** into the project:
   ```powershell
   Copy-Item -Recurse "<skill>/assets/studio-src" ".\studio-src"
   Copy-Item "<skill>/assets/theme-studio.html" ".\theme-studio.html"
   ```
4. **Adapt the data**, not the layout:
   - `PRESETS` in `data.js`: nameAr/nameEn, tag, description, light/dark anchors, type, icons, form, backdrop.
   - `ARABIC_FONTS` / `LATIN_FONTS` / `CODE_FONTS`: add only fonts you will actually offer.
   - `ICON_META`: the DSH product icon subset; `ICON_PACKS`: real libraries and licences.
   - `BACKDROPS`: CSS gradients, never remote images by default.
5. **Adapt the copy** in `app.js` (`renderPreviewContent`, `buildBrief`) and the static labels in
   `index.html` if the theme name/voice changes.
6. **Rebuild**:
   ```powershell
   cd .\studio-src
   node build.mjs
   ```
   This writes `../theme-studio.html` with CSS + JS inlined.
7. **Verify** with Playwright/Chromium (see the checklist below). Take desktop + mobile screenshots.
8. **Deliver** the single HTML file and a short "how to use" note. Do not ship the sources unless asked.

## The design contract

The studio must feel like a workbench, not a form:

- one live app preview (chat / settings / components) that updates as you change values;
- a numbered rail (`01 Direction` … `06 Brief`), a controls inspector, and a copyable output drawer;
- a real bilingual UI: Arabic RTL and English LTR, with direction-aware layout and fonts;
- real colour math: WCAG contrast for body/secondary/accent text; explicit hex/rgba values;
- real icon packs: Lucide (ISC), Tabler (MIT), Phosphor (MIT), Heroicons (MIT);
- a glass language informed by ClearVision V7 Blur: translucent panels, lit top edge, soft sheen,
  deep shadow, floating rounded composer;
- no remote JavaScript, no framework, no build step for the final file;
- clipboard works on `file://` via the `execCommand` fallback; localStorage is optional, not required.

Every choice must survive into the output. If a control does not change the preview **and** the brief,
remove it or wire it.

## State model

```js
{
  lang, target, section, preset,
  meta: { nameAr, nameEn, slug, descAr, descEn, tags, notes },
  colors: { light: { bg, surface, text, accent, sidebar, code, warn, error, success },
            dark:  { ... } },
  overrides: { light: {}, dark: {} },     // pinned derived values
  autoAccent,
  type: { arabic, latin, code, size, codeSize, leading, weight, loadFonts },
  icons: { pack, stroke, corner, selected: [conceptIds] },
  form: { radius, shadow, blur, saturate, density, motion, border, borderStrength,
          texture, glassEdges },
  backdrop: { kind, preset, url, dim, blur, saturate },
  preview: { mode, lang, view, mobile },
  targetOptions: {
    dsh: { selector: 'always'|'named', lockType, iconReplacements },
    web: { prefix, components },
    vencord: { importBase, messageRadius, messageGap, homeIcon }
  },
  output: { tab }
}
```

Derived colours: `surfaceAlt`, `text2`, `text3`, `border`, `accentHover`, `accentText`,
`codeBanner`, `bubble`, `menu`. Derived values are recomputed from the anchors; editing one stores it
in `overrides[mode]`, and a reset button releases it.

## Outputs

| Tab | DSH | Web | Vencord |
|---|---|---|---|
| Brief | target, palette (light/dark), contrast, type, icons, form, build instructions, notes | same, web vocabulary | same, ClearVision vocabulary |
| CSS | `body` + `body[data-ds-dark-theme]` (or named `body[data-dsh-theme]`) with ~150 official tokens, fonts, radii, shadows, motion, menu blur | `:root` / `[data-theme]` / media query token sheet + optional component starter | complete `.theme.css` with `@import`, `:root`, light/dark/darker/onyx blocks, glass selectors, message-box rules |
| JSON | 16-slot theme + typography/icons/form/backdrop | token tree | variable map |
| Icons | 24 DSH symbol ids (regular + medium) with complete SVG documents | name → SVG | home icon + pack metadata |

The **brief is the primary artefact**. CSS/JSON/icons are optional direct-build material.
`openDrawer()` resets to the brief tab; the copy button labels itself after the active tab.

## DSH authoring in one page

Full detail: `references/dsh-theme-authoring.md`.

- `ctx.theme.register({ id, colorScheme: 'light'|'dark', tokens: Record<string,string>, icons? })`
  — single-scheme theme; the Appearance row lists only light/dark/system; a third-party id set with
  `setTheme` is in-process and **not** durable.
- `ctx.theme.overrideTokens(source, { '--token': { light, dark } })` — persistent dual-mode layer;
  every value needs both modes. This is the right path for a re-skin that respects the user's
  light/dark choice.
- Icons: `ICON_SYMBOLS` product ids only; complete SVG with `viewBox`; no `<style>`/`<script>`;
  element ids prefixed `<symbol id>-`; 101 keys / 202 ids.
- Fonts: DSH normalises names and quotes each non-generic family. Set
  `--dsh-font-family-text` / `--dsh-font-family-code`; font sizes are settings
  (`--dsh-content-font-size`, `--dsh-code-font-size`).
- Shape: `--dsw-radius-*`, `--dsw-shadow-lv*`, `--ds-transition-duration`,
  `--dsw-menu-backdrop-filter`.
- Delivery routes: CSS in `dsh-custom-css-lite` (fastest), native client theme plugin (durable),
  `overrideTokens` layer (persistent dual-mode), Skin Center `skin.json` + `skin.css` (installable),
  or a `dsh-theme` named CSS pack.

## Verification checklist

Run this before delivering:

- [ ] Open the built file with Playwright/Chromium; console clean; no horizontal overflow at
      1440×1000, 1024×900, 390×844.
- [ ] Arabic and English; RTL and LTR; light and dark. Arabic does not clip or letter-space.
- [ ] Preset switch, target switch, colour edit, font switch, icon pack, form controls all change
      the preview and the brief.
- [ ] Drawer tabs parse: CSS rules > 0 via `CSSStyleSheet.cssRules`; JSON parses; each icon SVG
      starts with `<svg` and has `viewBox`.
- [ ] DSH CSS token names exist in the installed token surface; document the rc.1-vs-rc.5 gap.
- [ ] Copy works from `file://`; download has the right extension and filename.
- [ ] localStorage restore works; reset works.
- [ ] Screenshots: desktop AR + EN, drawer, mobile, palette, at least one target variant.

## Guardrails

- Do not claim DSH's whole shell becomes transparent from token CSS. Token glass applies to menus,
  popovers, and composer surfaces; a body-wide wallpaper needs a native plugin.
- Do not claim third-party theme ids persist across restarts. Use `overrideTokens` or CSS.
- Do not quote generic CSS families; do quote font names. Keep Arabic first in the stack for RTL
  reading, with the Latin face as the next fallback.
- Keep technical hex/number values LTR-isolated in an Arabic brief (`\u2066…\u2069`) or the `#`
  jumps. Keep the output textarea LTR.
- No fake logos, no invented data, no remote JS. Icon licences: Lucide ISC, Tabler/Phosphor/Heroicons MIT.
- Credit ClearVision when the Fayruz preset/glass language is used: "Inspired by ClearVision V7 Blur".

## File map

| Path | Role |
|---|---|
| `assets/theme-studio.html` | Ready single-file studio (deliver this) |
| `assets/studio-src/index.html` | Shell, sprite, preview markup |
| `assets/studio-src/styles-base.css` | Atmosphere, shell, rail, stage, preview |
| `assets/studio-src/styles-controls.css` | Inspector, presets, controls, drawer, responsive |
| `assets/studio-src/data.js` | Presets, fonts, icon packs/meta, backdrops, defaults |
| `assets/studio-src/app.js` | State, math, preview, templates, output generation, events |
| `assets/studio-src/icons-data.json` | 12 concepts × 5 packs of inline SVG |
| `assets/studio-src/build.mjs` | Inlines CSS/JS into the single file |
| `references/dsh-theme-authoring.md` | Exact DSH API, routes, plugin skeleton, pitfalls |
| `references/token-map.md` | 16 slots and generated token map |
| `references/icon-map.md` | DSH icon ids, constraints, library licences |
| `references/theme-studio-blueprint.md` | State/output/bidi/verification blueprint |
| `references/research.md` | Sources and findings |
| `scripts/validate.mjs` | Structural smoke check of the built asset |

## Credit

The glass language and the "Fayruz" preset are inspired by **ClearVision V7 Blur** by the ClearVision
Team (clearvision.github.io), used as a design reference, not redistributed.

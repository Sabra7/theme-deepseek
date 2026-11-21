# Research notes

Sampled 2026-11-21 against the running **DeepSeek Harness 0.2.2-rc.5** (desktop profile, Web GUI at
`http://127.0.0.1:57192`) and the user's **ClearVision V7 Blur** theme file at
`C:\Users\moham\AppData\Roaming\Vencord\themes\ClearVision_v7_Blur.theme.css`.

## 1. The attached reference — ClearVision V7 Blur

The file is a Vencord/BetterDiscord theme: two remote `@import`s plus a `:root` settings block and a
glass layer appended after the imports. Its design language:

- deep ocean-blue accent (`#00305a8c` / hover `#06446dcc`) and readable light-blue accent text
  (`#6cb6ff`) for dark surfaces;
- a background image with `--background-dim`, `--background-filter` (saturate + brightness);
- light / ash / darker / onyx shading variants;
- frosted panels: `backdrop-filter: blur(8px) saturate(120%)`;
- a "liquid glass" edge: 16px radius, `inset 0 1px 0 rgba(255,255,255,.3)`,
  `inset 0 0 0 1px rgba(255,255,255,.08)`, a top sheen, and
  `0 12px 32px rgba(0,0,0,.35)`;
- a floating composer with `border-radius: 26px` and `12px` side gap;
- a readable `--text-accent` distinct from the fill accent;
- stable class-prefix selectors and `box-shadow`-only glass (no layout changes).

Mishkat's "Fayruz" preset is a direct translation of that language, not a copy of the remote CSS.
The Vencord target emits a compatible `.theme.css` with the same variable names and glass selectors.

## 2. DSH theme package

Local sources read:

- `@deepseek-ai/dsh-client-ui-theme/README.md`
- `src/client/index.ts`, `src/client/icon-sprite.ts`, `src/theme-settings.ts`
- `src/styles/base.css`, `design-platform.css`, `gradient-shadow-text.css`
- `@deepseek-ai/dsh-web-frontend/dist/assets/index-*.js` (the `ICON_SYMBOLS` map)
- `@deepseek-ai/dsh-skill/README.md` and the `huashu-design` bundle patch (skill-bundle pattern)

Key facts:

- `ctx.theme.register` is single-scheme; `overrideTokens` is a dual-mode persistent layer.
- Third-party theme ids are in-process; the Appearance row only lists light/dark/system.
- `ICON_SYMBOLS` has 101 keys / 202 ids; replacement SVG constraints are strict.
- The token sheets are the sole colour authority; 335 `--dsw-*` tokens were sampled from rc.1, with a
  handful of rc.5 additions.
- Font sizes/families are settings; CSS can override the variables but should respect the user.
- Client bundles compose at server start; a page refresh is not enough after installing a plugin.

## 3. Ecosystem

- `mux9056-bot/dsh-theme` — 30 themes, 16 slots → 94 tokens, `data-dsh-theme` CSS, preview.html.
  Its `docs/AGENT.md` documents the three install requirements and the loader-entry trap.
- `zhu1090093659/dsh-skins` — Skin Center; pure asset dirs (`skin.json`, `skin.css`,
  `patches.css`), L1 token remap / L2 semantic selectors / L3 patches; a 4-anchor custom theme
  deriving 40 audited tokens with `color-mix`; host-side persistence and tapIndex anti-FOUC.
- `yingpanwang/dsh_web_client_theme_switcher` — `register` + `overrideTokens` + slots; custom theme
  editor and wallpaper; a good reference for runtime editing.
- `@deepseek-harness-themes/core` — registration helper; selection is a host concern.
- `dsh-dream-skin` — npm theme/skin packs; another distribution model.

## 4. Web/UI research

- `<input type="color">` supports hex and modern CSS colour formats; `input` events fire continuously,
  `change` on dismissal. Use `input` for the live preview and debounce persistence.
- Clipboard `navigator.clipboard.writeText()` requires a secure context; `file://` needs a hidden
  textarea + `document.execCommand('copy')` fallback.
- WCAG 2.2 SC 1.4.3: body text ≥ 4.5:1; large (≥18 pt / 14 pt bold) ≥ 3:1; do not round 4.499 up.
- Single-file tools should avoid runtime dependencies: inline SVG, Google-font fallback, localStorage
  try/catch, Blob downloads.
- Arabic/RTL: `dir` per subtree; no letter-spacing; 1.8–1.9 leading; test clipping at 200% zoom.
- The studio uses explicit sRGB math rather than runtime `color-mix` so the generated CSS and the
  preview are identical and portable.

## 5. Icon licences

- Lucide ISC (Feather-derived icons also MIT)
- Tabler MIT
- Phosphor MIT
- Heroicons MIT

The studio's SVGs are fetched from the Iconify API at build time and inlined; no runtime icon network
request. The 12 concepts cover the visible DSH product icons; the pack choice is a design choice, and
the DSH output writes both `regular` and `medium` symbol ids.

## 6. Decisions

1. Three targets (DSH, web, Vencord) behind one state; the user asked for both, the reference adds
   Vencord/ClearVision.
2. Brief primary; CSS/JSON/icons optional. The brief is what the user pastes back.
3. Real icon packs, not decorative placeholders; DSH constraints respected.
4. Glass is honest: DSH menus/popovers can use token blur; a full body wallpaper needs a native
   plugin and is called out.
5. The studio itself is bilingual, with a persistent language toggle and an independent preview
   language toggle; changing UI language syncs the preview for coherence.
6. The skill is a bundle that reuses `dsh-skill-filesystem`, following the huashu-design pattern.

## 7. Sources

- https://github.com/mux9056-bot/dsh-theme — README, docs/AGENT.md, themes/ocean.css
- https://github.com/zhu1090093659/dsh-skins — README, contracts/official-tokens-v1.json,
  src/core/custom-theme.ts, skins/blue-fantasy/skin.json
- https://github.com/yingpanwang/dsh_web_client_theme_switcher — README, src/client.js
- https://dshhub.org/en/plugins/orxz/deepseek-harness-themes--packages-core/
- https://www.npmjs.com/package/dsh-dream-skin
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://lucide.dev/license
- https://fonts.google.com/knowledge/using_type/using_web_fonts
- ClearVision project: https://github.com/ClearVision/ClearVision-v7, https://clearvision.github.io

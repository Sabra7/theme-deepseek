# Creating a theme for DeepSeek Harness

Verified against the running installation **DeepSeek Harness 0.2.2-rc.5** (desktop profile) on
2026-11-21. Package: `@deepseek-ai/dsh-client-ui-theme`. Read the installed README and
`src/client/index.ts` again after a DSH upgrade; the API is small but versioned.

## 1. What a "theme" is

The theme package owns:

- the light / dark / system preference and the `ui-theme` settings namespace;
- three font roles (text, code, terminal), their sizes and family lists;
- the `--dsw-*` token stylesheets;
- the `ctx.theme` registry: `register`, `overrideTokens`, `setTheme`, `getTheme`,
  `setFontFamily`, `setFontSize`;
- the hidden icon sprite and the Appearance + font rows in Settings.

A third-party theme is not a new stylesheet engine. It is a set of **alias-token overrides** (and
optionally icon replacements) that the presenter applies to the document. The token sheets remain the
colour authority.

## 2. Exact API

```ts
interface ThemeDefinition {
  id: string
  colorScheme: 'light' | 'dark'
  tokens: Record<string, string>       // flat token → value
  icons?: Record<IconSymbolId, string> // complete SVG documents
}

ctx.theme.register(definition): () => void
ctx.theme.overrideTokens(source: string, {
  '--dsw-alias-bg-base': { light: '#…', dark: '#…' },
  // every override requires BOTH modes
}): () => void
ctx.theme.setTheme(id)
ctx.theme.getTheme(): ThemeSnapshot
ctx.theme.setFontFamily(role, list)
ctx.theme.setFontSize(role, px)
```

Facts that decide the delivery route:

- `light` and `dark` are built in; `system` is a preference, not a registrable id.
- A registered theme is **single-scheme** (`colorScheme`). The built-in Appearance row lists only
  `light`, `dark`, `system`; a third-party id set via `setTheme` lives in-process and is **not
  written to the durable settings schema**. It does not survive a restart by itself.
- `overrideTokens` is the persistent dual-mode layer. It stacks over whichever built-in theme is
  active, in registration order, and survives because it is code, not a preference. Use it for a
  re-skin that respects the user's light/dark choice.
- A bare string passed to `overrideTokens` throws a teaching error: supply `{ light, dark }` even when
  the value is the same.
- Duplicate ids throw. Disposing the active theme resets the preference.
- `setFontFamily(role, list)` normalises the list: it drops quotes/backslashes/control chars and
  double-quotes every non-generic name. An empty value restores the built-in stack.
- `setFontSize('text'|'code'|'terminal', px)` accepts integers in 10–22 / 10–16 / 10–20.

## 3. Token model

`src/styles/design-platform.css` declares the palette in a light `body` block and a dark
`body[data-ds-dark-theme]` block. The official surface sampled from 0.2.2-rc.1 has **335 `--dsw-*`
tokens** (excluding `--dsw-static-*`). The running rc.5 sheets also declare a few tokens that the
rc.1 list missed, including `--dsw-alias-card-*`, `--dsw-alias-chart-*`,
`--dsw-alias-label-on-color`, `--dsw-alias-toast-action`, `--dsw-alias-tooltip-label`,
  `--dsw-alias-trajectory-accent`, `--dsw-alias-border-selected`,
  `--dsw-specific-file-upload-track`, `--dsw-specific-guide-hero`,
  `--dsw-specific-sidebar-nav-item-hover`, `--dsw-specific-sidebar-right-flash`.

Important families:

| Family | Use |
|---|---|
| `--dsw-alias-bg-base`, `bg-layer-1/2/3/4`, `bg-overlay`, `bg-module-platform` | ground and raised surfaces |
| `--dsw-alias-label-primary/secondary/tertiary/caption/dimmed` | text |
| `--dsw-alias-border-l1…l4`, `border-selected` | edges |
| `--dsw-alias-brand-primary`, `button-primary-fill/hover`, `state-business-primary` | accent |
| `--dsw-alias-interactive-bg-hover/active` | interaction fills |
| `--dsw-alias-markdown-code-block/-banner`, `markdown-inline-code` | code |
| `--dsw-alias-state-success/warn/error/done-*` | states |
| `--dsw-specific-menu`, `--dsw-menu-surface-fill`, `--dsw-menu-backdrop-filter` | menus |
| `--dsw-specific-sidebar-fill`, `--dsw-specific-sidebar-nav-item-*` | sidebar |
| `--dsw-specific-bubble`, `--dsw-specific-bubble-highlight` | message bubble |
| `--dsw-alias-scrollbar-bg-l1`, `...-hover-l1` | scrollbars |
| `--dsw-radius-xs/sm/md/lg/xl/panel` | shape |
| `--dsw-shadow-lv1/1-blur/2/3`, `--dsw-elevation-*` | elevation |
| `--ds-transition-duration`, `-fast`, `-slow` | motion |

### The 16-slot model

The `dsh-theme` pack compresses a palette to 16 readable slots per mode:

```
bg, surface, surfaceAlt, text, text2, text3, border,
accent, accentText, accentHover, code, codeBanner, sidebar,
warn, error, success
```

Its build expands them to 94 real tokens. This is a good portable JSON format and the one used by the
Mishkat brief/theme JSON. The full generated CSS in Mishkat emits ~150 tokens for more complete
coverage.

### 4-anchor model

Skin Center's custom theme derives 40 audited tokens from
`{ background, foreground, accent, contrast }` with explicit `color-mix()` formulas. It is a good
"simple mode" when a user only wants to tune a few values. The formulas are in
`skins .../src/core/custom-theme.ts`; the Mishkat studio implements equivalent maths in `app.js`
(`makePalette`, `ensureContrast`).

## 4. Fonts

- Sets `textFontFamily`, `codeFontFamily`, `terminalFontFamily` in the `ui-theme` settings document.
- Text size: 10–22 px (default 14); code 10–16 (default 11); terminal 10–20 (default 13).
- `--dsh-font-family-text` / `--dsh-font-family-code` lead the built-in stacks; `--dsw-font-family`
  and `--ds-font-family-code` resolve from them on `body`.
- The content ladder in `gradient-shadow-text.css` derives headings, secondary text and tables from
  `--dsh-content-font-size`; setting that variable with `!important` overrides the Settings slider
  (use deliberately).
- Arabic: the built-in stack has no Arabic-specific face. Put an Arabic family first, then the Latin
  face, then `system-ui`/`sans-serif`. Do not letter-space Arabic. Use 1.8–1.9 leading for long Arabic
  reading.
- Web fonts: either rely on installed fonts or add `@font-face` files inside a native theme plugin.
  Google Fonts `@import` is a network dependency; always provide a local/system fallback.

## 5. Icons

The theme package mounts one hidden `<svg>` sprite at the start of `body`. `ICON_SYMBOLS` in the
ui-primitives bundle provides **101 icon keys**, each with `regular` and `medium` variants →
**202 symbol ids**: `dsw-icon-<key>-regular` and `dsw-icon-<key>-medium`.

Examples:

| Concept | Key | Symbol id |
|---|---|---|
| send | `send-outline` | `dsw-icon-send-outline-regular` |
| search | `search-outline` | `dsw-icon-search-outline-regular` |
| settings | `settings-outline` | `dsw-icon-settings-outline-regular` |
| new chat | `new-chat-outline` | `dsw-icon-new-chat-outline-regular` |
| sidebar | `panel-left-outline` | `dsw-icon-panel-left-outline-regular` |
| sparkle | `enhance-outline` | `dsw-icon-enhance-outline-regular` |
| attach | `paperclip-outline` | `dsw-icon-paperclip-outline-regular` |
| mic | `microphone-outline` | `dsw-icon-microphone-outline-regular` |
| user | `user-outline` | `dsw-icon-user-outline-regular` |

`ThemeDefinition.icons` validation:

- key must be an `ICON_SYMBOLS` id;
- value must be a well-formed SVG-namespace `<svg>` with `viewBox`;
- no `<style>` or `<script>`;
- every element id must start with `<symbol id>-`;
- root `width`, `height`, `class`, `aria-hidden` are dropped; `viewBox` and presentation attributes
  carry over;
- only product icons are replaceable; file-type, plugin, site and brand artwork stay fixed.

Replacement SVG should use `currentColor` and a 24×24 (or matching) `viewBox`. The use site sizes it.
A theme can replace both variants with the same document.

## 6. Delivery routes

| Route | Persistence | Icons | Best for |
|---|---|---|---|
| CSS in `dsh-custom-css-lite` | localStorage per browser | no | fastest iteration; already installed in this profile |
| `ctx.theme.overrideTokens` in a client plugin | code, both modes | no | a durable colour/type re-skin |
| `ctx.theme.register` in a client plugin | code; selection in-process | yes | a named theme with icon replacements |
| Skin Center skin (`skin.json` + `skin.css`) | host selection store | via L2 selectors | installable skins, backgrounds, glass |
| `dsh-theme` named CSS pack | plugin/localStorage | no | 30-theme catalogue / CSS distribution |

For the current profile the lowest-risk build is CSS for `dsh-custom-css-lite`; the premium build is a
native theme plugin; the shareable build is a Skin Center skin once the Skin Center is installed.

## 7. Native client theme plugin (minimal)

Package layout:

```
dsh-theme-example/
  package.json
  cordis.patch.yml
  lib/index.js
  lib/client.js
```

`package.json`:

```json
{
  "name": "dsh-theme-example",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true }
  }
}
```

`cordis.patch.yml`:

```yaml
- insert:
    - id: theme-example
      name: 'dsh-theme-example'
```

`lib/index.js` (host no-op; the loader imports the package main):

```js
export const name = 'dsh-theme-example'

export function apply() {
  // No host half. The theme is a browser concern.
}
```

`lib/client.js` (dual-mode colour/type layer):

```js
window.__ModuleLoader__.load({
  id: 'dsh-theme-example',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const tokens = {
      '--dsw-alias-bg-base':        { light: '#f6f2ea', dark: '#0e1216' },
      '--dsw-alias-bg-layer-1':     { light: '#fffaf2', dark: '#131920' },
      '--dsw-alias-label-primary':  { light: '#2b2b2b', dark: '#e8e2d6' },
      '--dsw-alias-brand-primary':  { light: '#0f766e', dark: '#5eead4' },
      // …every override needs both modes
    }

    function apply(ctx) {
      ctx.inject(['theme'], (scope) => {
        scope.effect(
          () => scope.theme.overrideTokens('dsh-theme-example', tokens),
          'dsh-theme-example: dual-mode tokens'
        )
      })
    }

    exports.apply = apply
    return module.exports
  }
})
```

Install:

```sh
dsh plugin --profile desktop add <absolute path>
```

Then restart DSH (client bundles are composed at server start; a page refresh is not enough). Verify
the row in **Plugins** and the theme in a new session. If the GUI is already running, use the
running profile's plugin manager; do not hand-edit the profile package unless that is the only route.

### Icons in a native plugin

Icons require `register`, not `overrideTokens`:

```js
const icons = {
  'dsw-icon-send-outline-regular': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>',
  'dsw-icon-send-outline-medium':  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'
}

ctx.theme.register({ id: 'dsh-theme-example-icons', colorScheme: 'dark', tokens: {}, icons })
ctx.theme.setTheme('dsh-theme-example-icons')
```

Remember: a registered theme is single-scheme, and a third-party selection is in-process. For a true
dual-mode icon theme, register two definitions (`-light`, `-dark`), listen to `theme/change`, and call
`setTheme` for the matching scheme with a re-entrancy guard; or accept one scheme and document it.
For colours only, keep `overrideTokens` and skip the registry.

## 8. CSS-only route (`dsh-custom-css-lite`)

Paste the generated CSS into **Settings → General → CSS مخصص**, or import the `.css` file. Use:

```css
body { /* light tokens */ }
body[data-ds-dark-theme] { /* dark tokens */ }
```

or a named theme:

```css
body[data-dsh-theme="fayruz"] { /* light */ }
body[data-dsh-theme="fayruz"][data-ds-dark-theme] { /* dark */ }
```

The CSS can safely override:

- colour aliases (`--dsw-alias-*`, `--dsw-specific-*`);
- font variables (`--dsh-font-family-text`, `--dsh-font-family-code`, `--dsw-font-family`);
- radii (`--dsw-radius-*`);
- shadows (`--dsw-shadow-*`, `--dsw-elevation-stroke-color`);
- motion (`--ds-transition-duration*`);
- menu glass (`--dsw-menu-surface-fill`, `--dsw-specific-menu`, `--dsw-menu-backdrop-filter`).

It cannot replace product icons. A body-wide wallpaper is not a token; DSH's shell is opaque. If the
user wants a full-bleed backdrop, build a native plugin that injects a background layer and makes the
relevant surfaces translucent, and test against the actual shell stacking contexts.

Always scope dark rules to `body[data-ds-dark-theme]`; do not assume the user's preference.

## 9. Skin Center route (optional)

Skin Center (`@linxin666/dsh-client-ui-skin-center`, DSH ≥ 0.2.2-rc.2) reads pure asset directories
from `$DSH_HOME/skins/<id>/`:

```
skin.json
skin.css
patches.css   (optional, arbitrary CSS)
hooks.mjs     (optional, reviewed code)
assets/
preview/
```

`skin.json` v2 needs `skinManifestVersion`, `id`, `name`, `contributes.stylesheet`; backgrounds are
`contributes.backgroundMedia` with a scrim. `skin.css` L1 remaps `--dsw-*` tokens; L2 styles the
semantic attributes; `patches.css` is free selectors at the author's risk. The center force-scopes
CSS under `html[data-dsh-skin]`, sanitises remote URLs/`@import`, and persists the selection host-side.
It requires the Skin Center plugin; install it first.

## 10. Pitfalls

- Assuming a third-party theme id persists across restarts. It does not; use `overrideTokens` or CSS.
- Passing a bare string to `overrideTokens`. Wrap both modes.
- Registering a light theme and expecting it to work in dark mode. `colorScheme` is single-valued.
- Emitting token names that do not exist. Validate against the installed token sheets; rc.1's official
  list is incomplete for rc.5 (see §3).
- Overriding layout properties in a "theme" CSS. It breaks the shell; keep to tokens unless a native
  plugin owns the geometry.
- Assuming icons can be replaced by CSS. They cannot; use `ctx.theme.register`.
- Adding a remote font or image without a fallback. DSH may run offline.
- Forgetting that the client bundle graph is composed at server start. A page refresh does not load a
  new plugin.
- Forgetting RTL: test Arabic, `direction: rtl`, line-height 1.8–1.9, no letter-spacing.
- Bidi in the generated brief: wrap hex/number/technical values in LTR isolates (`\u2066…\u2069`) and
  keep the output textarea LTR.

## 11. Verification

- Open the GUI, confirm the plugin row and that the theme applies in both modes.
- Inspect computed styles on `body` and a representative surface, not just the style tag.
- Check the icon sprite (`[data-dsh-icon-sprite]`) has the replacement `<symbol>` ids.
- Check contrast: body ≥ 4.5:1, large ≥ 3:1; use the Mishkat contrast badges as a first pass.
- Check Arabic at 100% and 200% zoom; no clipping.
- Reload; if using a registered theme, confirm the preference resets or is re-applied by the plugin
  as designed.
- Restore the user's previous preference if you changed it during testing.

## 12. Sources

Local (0.2.2-rc.5):

- `@deepseek-ai/dsh-client-ui-theme/README.md`
- `src/client/index.ts`, `icon-sprite.ts`, `theme-settings.ts`
- `src/styles/base.css`, `design-platform.css`, `gradient-shadow-text.css`
- `@deepseek-ai/dsh-web-frontend/dist/assets/index-*.js` (ICON_SYMBOLS)
- `dsh-custom-css-lite` (this profile) — a working CSS-only row

Online:

- https://github.com/mux9056-bot/dsh-theme — 30 themes, 16 slots, AGENT.md
- https://github.com/zhu1090093659/dsh-skins — Skin Center, `contracts/official-tokens-v1.json`,
  `src/core/custom-theme.ts`
- https://github.com/yingpanwang/dsh_web_client_theme_switcher — register/overrideTokens/slots
- https://dshhub.org/en/plugins/orxz/deepseek-harness-themes--packages-core/
- https://www.npmjs.com/package/dsh-dream-skin

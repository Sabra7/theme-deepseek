# Token map

The Mishkat studio emits two kinds of token surfaces. Both are generated from the same 10 anchors.

## 1. The 16-slot DSH theme model

```json
{
  "bg": "#06121e",
  "surface": "#0b1e2e",
  "surfaceAlt": "#213343",
  "text": "#e6f2fb",
  "text2": "#a3afb9",
  "text3": "#76828d",
  "border": "rgba(230, 242, 251, 0.124)",
  "accent": "#6cb6ff",
  "accentText": "#071521",
  "accentHover": "#84c2ff",
  "code": "#0a1a28",
  "codeBanner": "#172735",
  "sidebar": "#081725",
  "warn": "#f0b35a",
  "error": "#ff8a80",
  "success": "#5eead4"
}
```

The studio stores anchors (`bg`, `surface`, `text`, `accent`, `sidebar`, `code`, `warn`, `error`,
`success`, optional `accentText`) and derives the rest with explicit sRGB maths:

| Derived | Formula |
|---|---|
| `surfaceAlt` | `mix(surface, text, dark ? 0.10 : 0.055)` |
| `text2` | `mix(text, bg, dark ? 0.30 : 0.28)` |
| `text3` | `mix(text, bg, dark ? 0.50 : 0.46)` |
| `border` | `rgba(text, 0.03 + borderStrength/100 * 0.17)` |
| `accentHover` | dark: `mix(accent, #fff, .16)`; light: `mix(accent, #000, .13)` |
| `accentText` | auto: higher contrast of `#fff` / `#071521` against `accent` |
| `codeBanner` | `mix(code, text, .06)` |
| `bubble` | `mix(surface, accent, .055)` |
| `menu` | `mix(surface, bg, .10)` |

Editing a derived row stores it in `overrides[mode]`; the reset button removes the override.

## 2. Generated DSH CSS tokens

`dshTokens(p)` emits ~150 tokens. The groups:

### Ground / surfaces

`--dsw-alias-bg-base`, `-bg-document-preview`, `-bg-document-selection`, `-bg-layer-1`…`-4`,
`-bg-mask-1/2/3/photo/drop`, `-bg-module-platform`, `-bg-multi-select`, `-bg-overlay`,
`-bg-skeleton`.

### Type

`--dsw-alias-label-primary`, `-label-primary-bluish`, `-label-primary-dimmed`,
`-label-primary-foreground`, `-label-primary-inverted`, `-label-secondary`, `-label-tertiary`,
`-label-caption`, `-label-dimmed`, `-label-on-color`, `-label-error`, `-label-document-preview`,
`--dsw-alias-menu-icon`, `--dsw-alias-link`.

### Borders / interaction

`--dsw-alias-border-l1`…`l4`, `-border-l2-darkmode-thin`, `-border-inverted`, `-border-inverted2`,
`-border-selected`, `--dsw-alias-interactive-bg-hover`, `-hover-accent`, `-hover-danger`,
`-hover-solid`, `-active`.

### Accent / buttons

`--dsw-alias-brand-primary`, `-brand-primary-invert`, `-brand-primary-new-colorprimary-new-color`,
`-brand-text`, `--dsw-alias-button-contrast-fill`, `-elevated-fill`, `-floating-fill`,
`-floating-hover`, `-ghost-active-*`, `-info-fill`, `-info-hover`, `-primary-fill`,
`-primary-hover`, `-primary-dimmed`, `-tool-bar-*`.

### Code

`--dsw-alias-markdown-code-block`, `-code-block-banner`, `-code-segment-selected`,
`-code-segment-unselected`, `-inline-code`, `-citation`, `-placeholder`, `-tag`.

### States

`--dsw-alias-state-business-primary/tertiary`, `-done-primary`, `-error-primary/secondary`,
`-idle-primary`, `-success-primary/secondary/tertiary`, `-warn-primary/secondary/tertiary/label`.

### Menus / overlays / sidebar

`--dsw-specific-menu`, `--dsw-menu-surface-fill`, `--dsw-alias-menu-group-header-fill`,
`--dsw-specific-sidebar-fill`, `-sidebar-nav-item-active`, `-active-accent`, `-nav-item-hover`,
`-sidebar-right-flash`, `--dsw-specific-selector`, `--dsw-specific-tip`, `--dsw-specific-input-major`,
`--dsw-specific-login-input`, `--dsw-specific-guide-hero`, `--dsw-specific-bubble`,
`-bubble-highlight`, `--dsw-specific-file-upload-track`.

### Misc

`--dsw-alias-card-fill`, `-card-fill-hover`, `-card-tile-fill`, `-chart-messages/system/tools`,
`-code-diff-*`, `-file-diff-*`, `-scrollbar-*`, `-toast-*`, `-tooltip-*`, `-trajectory-accent`,
`-turn-trigger-*`, `-settings-card-fill/stroke`, `--dsw-linear-gradient-think`,
`--dsw-linear-think-select`, `--dsw-shadow-lv1/1-blur/2/3`, `--dsw-elevation-stroke-color`.

The 15 tokens below are present in the running 0.2.2-rc.5 `design-platform.css` but were missing from
the public rc.1 `official-tokens-v1.json`. They are safe on rc.5:

```
--dsw-alias-border-selected
--dsw-alias-card-fill
--dsw-alias-card-fill-hover
--dsw-alias-card-tile-fill
--dsw-alias-chart-messages
--dsw-alias-chart-system
--dsw-alias-chart-tools
--dsw-alias-label-on-color
--dsw-alias-toast-action
--dsw-alias-tooltip-label
--dsw-alias-trajectory-accent
--dsw-specific-file-upload-track
--dsw-specific-guide-hero
--dsw-specific-sidebar-nav-item-hover
--dsw-specific-sidebar-right-flash
```

When targeting a different DSH version, re-extract the token set from
`@deepseek-ai/dsh-client-ui-theme/src/styles/design-platform.css` (or the installed CSS) and diff.

## 3. Font / shape / motion variables

| Variable | Value |
|---|---|
| `--dsh-font-family-text` | `"Arabic", "Latin", system-ui, sans-serif` |
| `--dsh-font-family-code` | `"Code", Consolas, monospace` |
| `--dsw-font-family` | same as text (direct override) |
| `--ds-font-family-code` | same as code (direct override) |
| `--dsw-font-family-brand` | `"Latin", Georgia, serif` |
| `--dsh-content-font-size` | `Npx !important` only when "Lock type size" is on |
| `--dsh-code-font-size` | same |
| `--dsw-font-markdown-h1…h4-font-weight` | selected heading weight |
| `--dsw-radius-xs/sm/md/lg/xl/panel` | `radius-8 / -6 / 0 / +4 / +8 / +12` |
| `--ds-transition-duration` | `none 0 / calm 220 / snappy 120` ms |
| `--dsw-menu-backdrop-filter` | `blur(Npx) saturate(M%)` or `none` |
| `--dsw-mask-blur` | `none` |

## 4. Web token sheet

The web target prefixes every token (`mk` by default):

```
--mk-bg, -surface, -surface-alt, -text, -text-2, -text-3, -border,
-mk-accent, -accent-ink, -accent-hover, -sidebar, -bubble,
-code, -code-banner, -menu, -warn, -error, -success,
-glass, -glass-2, -edge, -radius, -radius-sm, -shadow,
-blur, -saturate, -font-ar, -font-en, -font-mono,
-size, -leading, -wallpaper
```

It also emits `.mk-surface`, `.mk-glass`, `.mk-button`, `.mk-input` starter rules when the component
starter is enabled.

## 5. Vencord / ClearVision variables

```
--main-color, --hover-color, --success-color, --danger-color,
--online-color, --idle-color, --dnd-color, --streaming-color, --offline-color,
--background-image, --background-position, --background-size, --background-attachment,
--background-dim, --background-filter,
--main-font, --code-font, --focus-color,
--glass-blur, --glass-saturate, --glass-radius,
--glass-edge, --glass-edge-soft, --glass-sheen, --glass-shadow,
--message-box-radius, --message-box-gap,
--text-accent, --text-accent-hover, --chat-text-shadow,
--channel-normal/muted/hover/selected/selected-bg/unread/unread-hover,
--background-shading, --card-shading, --popout-shading, --modal-shading, --input-shading,
--normal-text, --muted-text, --home-icon
```

The light / ash / darker / onyx blocks override the shading and text values; the base glass block is
adapted from ClearVision V7 Blur (see `references/research.md`).

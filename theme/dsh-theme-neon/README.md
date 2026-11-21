# Neon — DSH theme

Generated from the Mishkat brief **نيون / Neon** (target: DeepSeek Harness, always-on).

## What it is

A sharp dark theme: deep black ground, muted teal accent, 7px corners, compact 13px text,
400-weight headings, a 1.6 reading rhythm, and **Lucide** product icons at 1.8px stroke.
Light mode is a clean ice-blue counterpart.

Latest additions: the dark **chat transcript ground is pure black** (the rest keeps the Neon
surfaces); **file names in the chat use the user-message accent**; and the composer dock carries a
compact **usage cluster** — remaining context (tokens + %) and the current model's 5h / weekly quota
rings next to the stock context meter.

## Install the full theme (CSS + icons)

```sh
dsh plugin --profile desktop add "C:\Users\moham\workspace\tools\dsh-theme-neon"
```

The bundle inserts one client row (`theme-neon`). Restart DSH (the client bundle graph is composed at
server start), then reload the page. The bundle:

- injects the always-on token CSS as `#dsh-theme-neon-style` (including the black chat ground and
  file-name accent);
- injects the Space Mono stylesheet;
- replaces the 12 selected icons (both `regular` and `medium` symbol ids) in the ui-theme sprite;
- registers a `conversation.composer.dock` widget: a 14px remaining-context ring with
  `tokens · %`, then up to two quota rings (`5h`, `W`) parsed from the installed
  `dsh-plugin-subscriptions` pill; clicking a quota ring opens that pill's detail dialog;
- re-applies the icons after `theme/change` so light/dark switching does not restore the defaults;
- supports **safe mode**: load the GUI with `?dsh-neon=off` and CSS, icons, and the widget all skip.

The client manifest injects `@deepseek-ai/dsh-client-ui-renderer` for the slot registry. The usage
widget also waits for `slots` through `ctx.inject` if the service is not present yet.

No host API, no network except the optional Space Mono stylesheet, no settings preference.

## CSS-only route

Paste `theme.css` (or `neon-dsh.css` in the project) into **Settings → General → CSS مخصص**
(`dsh-custom-css-lite`). This applies colours, type, radii, shadows, motion, the black chat ground,
and the chat file-name accent, but **not** icons or the usage widget. Use one route or the other; both
apply the same tokens.

## Terminal backdrop

The main theme keeps a flat, exact black ground. `neon-terminal.css` is an optional layer that adds a
faint CRT grid. DSH's shell is opaque, so it uses a slightly translucent `--dsw-alias-bg-base` to let
the body pattern through; test it on your build before keeping it.

## Exact choices

| Choice | Value |
|---|---|
| dark ground / surface / ink | `#07080d` / `#0d1018` / `#e8f7ff` |
| dark accent / accent text | `#466367` / `#ffffff` |
| light ground / surface / ink | `#eef7fb` / `#ffffff` / `#08131a` |
| light accent / accent text | `#0e7490` / `#ffffff` |
| borders | 25% strength, hairline |
| type | System Arabic + System UI, Space Mono for code; 13px / 11px; 1.6 leading; 400 headings |
| icons | Lucide, 1.8 stroke, round |
| shape | 7px radius, deep shadow, no glass, no lit edges |
| motion | calm (220ms) |

## Files

```
package.json
cordis.patch.yml
lib/index.js          no-op host half
lib/client.js         CSS + font link + icon sprite patch + usage widget
theme.css             the complete token stylesheet (incl. theme tweaks)
icons.json            24 DSH symbol ids with SVG documents
README.md
```

## Recovery

- `?dsh-neon=off` skips CSS, icons, and the usage widget.
- Remove the bundle and restart to uninstall.
- If the theme is disabled but the built-in appearance looks odd, clear the `dsh-custom-css-lite`
  textarea or disable that plugin; both touch the same tokens.

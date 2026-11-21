# Studio blueprint

This is the maintainable shape behind `assets/theme-studio.html`. Use it when adapting the source or
rebuilding after a DSH/token change.

## Files

```
assets/studio-src/
  index.html             shell, SVG sprite, static preview markup
  styles-base.css        atmosphere, topbar, rail, stage, preview
  styles-controls.css    inspector, presets, controls, drawer, responsive
  data.js                PRESETS, fonts, icon packs/meta, backdrops, defaults
  app.js                 state, colour maths, preview, inspector templates,
                         brief/CSS/JSON generation, events, init
  icons-data.json        12 concepts × 5 packs, inline SVG
  build.mjs              replaces /*__CSS__*/ and /*__JS__*/ placeholders
```

`node build.mjs` writes `../theme-studio.html` (the ready single file).

## Layout

Desktop (LTR): `rail | inspector | stage`. RTL reverses the inline direction:
`stage | inspector | rail`. Controls stay next to the rail; the preview gets the wide side.

- ≤ 1380: narrower rail/inspector.
- ≤ 1180: still 3 columns but tighter.
- ≤ 1020: rail becomes a 3-column strip; workspace stacks rail → stage → inspector.
- ≤ 720: single column; preview sidebars hide; drawer full-screen.
- ≤ 430: 2-column rail; smaller controls.

The **preview** is a 4-column grid:

```
servers | side | main | members
```

`dsh` and `web` keep the zero-width server/member columns as `visibility:hidden` (not `display:none`),
otherwise the side shifts into the 0px column. Vencord shows all four. Mobile hides sidebars and
sets one column.

## State

One object, versioned in `localStorage` under `mishkat-theme-studio/v1`:

```js
{
  lang, target, section, preset, paletteMode,
  meta: { nameAr, nameEn, slug, descAr, descEn, tags, notes },
  colors: { light: anchors, dark: anchors },
  overrides: { light: derivedPins, dark: derivedPins },
  autoAccent,
  type, icons, form, backdrop,
  preview: { mode, lang, view, mobile },
  targetOptions: { dsh, web, vencord },
  output: { tab }
}
```

`loadState()` deep-merges the saved object over `DEFAULT_STATE`, validates enums, normalises the slug,
and fills missing color objects from the Fayruz preset. Storage failures degrade to session-only.

## Colour maths

`makePalette(mode)` derives `surfaceAlt`, `text2`, `text3`, `border`, `accentHover`, `accentText`,
`codeBanner`, `bubble`, `menu`, plus `glass`, `edge`, `scrollbar`, `appBg`, `wallScrim`.
`getPalette(mode)` overlays `overrides[mode]` and recomputes `accentText` when auto.

- `parseHex` supports 3/6-digit hex;
- `mix` is sRGB linear interpolation (explicit, portable, no `color-mix` dependency);
- `luminance` / `contrast` implement WCAG 2.x relative luminance;
- `ensureContrast(fg, bg, min)` walks toward white or black until the ratio is met;
- `pickOn(bg)` chooses white or `#071521` by contrast;
- `rotateHue` is used by "Surprise me".

## Inspector sections

1. **Direction** — preset grid, Arabic/English name, slug, descriptions, tags, target options.
2. **Palette** — light/dark tabs; 12 color rows; auto accent text; border strength; states;
   live contrast panel and "Fix contrast"; derived pins.
3. **Type** — three font selects with specimens; pairing chips; size/code size/leading/heading weight;
   Google Fonts toggle; bilingual specimen.
4. **Icons** — 5 pack cards, stroke, corners, 12-icon grid, replacement count, DSH constraints.
5. **Form** — radius, shadow tier, blur/saturation, density, motion, borders, border strength,
   lit edges, texture, backdrop presets/image/dim, DSH glass caveat.
6. **Brief** — summary, palette, checks, notes, open-brief CTA.

Every control has a `data-*` hook. The click handler matches in this order: target, language, rail,
preset, preview view/lang/mode, mobile, pack, icon, pair, palette mode, shadow, texture, backdrop,
`data-setpath`, switch, color reset, drawer tab, `data-action`, then IDs. **The language selector
must use `.lang-btn[data-lang]`**, because `<html data-lang>` would otherwise match every click.

## Outputs

- `buildBrief()` — hot path, human-readable; palette one value per line; LTR isolation for technical
  values; target-specific build instructions.
- `dshCss()` — common font/radius/motion block + light + dark + reduced-motion; `body` or named
  selector; ~150 official tokens.
- `webCss()` — light/dark token blocks + optional component starter.
- `vencordCss()` — ClearVision-compatible header/imports, `:root`, light/ash/darker/onyx blocks,
  glass selectors, message box.
- `buildJson()` — 16-slot DSH theme, web token tree, or Vencord variable map.
- `buildIconsJson()` — 24 DSH symbol ids or name→SVG map.

`openDrawer()` resets to `brief`; the copy/download labels follow the active tab. Clipboard uses
`navigator.clipboard` when secure and a hidden textarea + `execCommand` on `file://`.

## Bidi

- Studio direction: `html[dir=rtl|ltr]`, `html[data-lang]`; static labels use `.ar-only`/`.en-only`.
- Preview direction: `#preview[data-plang]`; set `lang`/`dir` attributes too.
- ASCII code, hex, IDs: `direction:ltr; text-align:left; unicode-bidi:isolate`.
- Arabic brief values: wrap non-Arabic values in `\u2066…\u2069` (LRI/PDI); keep the textarea LTR.
- Vencord channel names in an Arabic preview: `dir="auto"` on the label span, `dir="ltr"` on the
  channel title; `#design` must not render as `design#`.
- Do not letter-space Arabic.

## Verification

Use a Node Playwright script with the profile's `NODE_PATH` (the desktop profile ships Playwright):

```powershell
$env:NODE_PATH='C:\Users\moham\.dsh\profiles\desktop\node_modules'
node verify.cjs
```

Check:

1. console/page errors empty;
2. `#preview` has a non-empty `--pv-bg`; preset switch changes it;
3. opening the drawer yields a brief containing name/palette/icons;
4. CSS tab parses (`new CSSStyleSheet` / `<style>.sheet.cssRules.length > 0`);
5. JSON tab parses; icon SVGs start with `<svg` and have `viewBox`;
6. target switch changes the CSS shape (DSH tokens / `--mk-` / ClearVision import);
7. colour/hex edit, font select, icon pack, mobile toggle, language toggle;
8. reload restores state; copy toast; download filename;
9. 1440/1024/390 widths have no horizontal overflow.

## Adapting

- New preset: add to `PRESETS` with light/dark anchors, type, icons, form, backdrop. The grid and
  list iterate the object; no template change.
- New font: add to the relevant array with `name`, `labelAr`, `stack`, `google` (or null). The
  dynamic `<link>` is built from `google`.
- New icon: add to `icons-data.json` and `ICON_META`; both variants are generated automatically.
- New target: add to the target switch, `state.targetOptions`, `renderDirection`, `buildCss`,
  `buildJson`, `buildIconsJson`, and labels. Avoid a fourth preview layout unless it earns it.
- New output: add a tab and a generator; keep the brief primary.
- New DSH token: add to `dshTokens` only if it exists in the installed sheets; validate.

## Guardrails

- No external JavaScript; fonts are the only optional network request.
- Do not fake preview content that the theme cannot reach (body wallpaper in DSH, whole-shell glass).
- Keep the generated CSS parseable; test it, do not just print it.
- Keep contrast and RTL as release blockers.

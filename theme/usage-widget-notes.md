# Neon usage widget — notes, integration, and helper API

`themes/neon/usage-widget.js` is a self-contained browser snippet for the **Neon**
DSH theme plugin (`dsh-theme-neon`). It adds one `conversation.composer.dock`
entry that renders next to the stock **ContextMeter**:

- a 14 px / 2 px-stroke ring filled with the **remaining context** share, plus the
  remaining token count (`42K`) and the remaining percentage (`67%`);
- up to two 14 px quota rings parsed from the installed
  `dsh-plugin-subscriptions` pill (`.dsh-subscription-usage-pill`): the
  **session / 5h** window first and the **weekly** window second, each with its
  percentage. A click proxies a click to that pill so its own detail dialog
  opens; the pill itself is never hidden.

No JSX build, no JSX runtime, no host/network access: React comes from
`require('react')` and only `React.createElement` is used. Safe mode
(`?dsh-neon=off`) skips everything.

Files:

| file | purpose |
|---|---|
| `themes/neon/usage-widget.js` | the snippet: `installUsageWidget(ctx, require)` + pure helpers |
| `themes/neon/usage-widget-test.html` | self-contained test page (assertions + visual preview, no network) |
| `themes/neon/usage-widget-notes.md` | this document |

`neon-dsh.css`, `lib/client.js`, and `tools/**` were **not** modified.

---

## Integration (root applies)

The plugin is symlinked at
`C:\Users\moham\.dsh\profiles\desktop\node_modules\dsh-theme-neon` →
`C:\Users\moham\workspace\tools\dsh-theme-neon` (verified `LinkType=SymbolicLink`),
so edit the live link target (and mirror in `themes/neon/dsh-theme-neon/lib/client.js`
if that copy is kept in sync). Lines below are from the current
`tools/dsh-theme-neon/lib/client.js` (133 lines).

1. **Paste the whole `usage-widget.js` content inside the module factory**, e.g.
   right after line 26 (`const FONT_HREF = …`) or immediately before
   `function apply(ctx)` (line 123). It declares only factory-local names
   (`installUsageWidget`, `parseQuotaLabel`, `compactTokens`, `ringDash`,
   `NEON_USAGE_*`, `neonUsage*`) — no collisions with `CSS`, `ICONS`, `STYLE_ID`,
   `safeMode`, `installIcons`, `apply`.
2. **Call it from `apply()`** after `installIcons(ctx)`:

```js
function apply(ctx) {
  if (safeMode()) return;
  injectCss(ctx);
  injectFont(ctx);
  installIcons(ctx);
  installUsageWidget(ctx, require); // Neon usage cluster in the composer dock
}

exports.apply = apply;
return module.exports;
```

Nothing else is required:

- **No `exports.inject = ['slots']` change.** `installUsageWidget` waits for the
  shell's `slots` service itself with `ctx.inject(['slots'], …)` when the service
  is not installed yet; if `ctx.slots` already exists it registers immediately.
- **Optional order override:** `installUsageWidget(ctx, require, { order: 5 })`.
  Default is `15` (see “Placement” below).
- Restart DSH (the client bundle is built at server start), then refresh the GUI.
  `http://127.0.0.1:57192/?dsh-neon=off` disables the whole theme, widget included.

`installUsageWidget` returns the registered component (or `null` when skipped /
unsupported) and is safe to call twice only in the sense that Cordis lifetimes are
additive — call it once from `apply()`.

---

## How placement works (and why the default order is 15)

`InputBar.tsx` (lines 596–601) renders the dock as:

```jsx
<div className={css.dock} data-composer-dock>
  {variant === 'composer' && input !== undefined && sessionId !== undefined
    ? renderSlot('conversation.composer.dock', {})   // list, sorted by order
    : null}
  {activity ? null : <ContextMeter useProjection={useProjection} t={t} />}
</div>
```

So the ContextMeter is **always the last dock child**, after every slot entry.
In the installed stack the entries are `activity` (order 0), `usage` (order 1),
`subscription-usage` (order 10, `dsh-plugin-subscriptions`), then ours.
`order: 15` therefore places the cluster **immediately beside the ContextMeter**:

```
[activity pill] [usage pill] [Codex · 13% used / 25% used] [Neon rings] [ContextMeter]
```

`{ order: 5 }` (the originally sketched value) still renders, but the subscriptions
text pill (order 10) then sits between the rings and ContextMeter. Default 15 is a
UI judgement — confirm before shipping.

Dock CSS is `display:flex; justify-content:center; gap:12px; min-height:22px`
(`InputBar.module.css` lines 13–29), so the widget root is a plain `inline-flex`
flex item with the same 20 px line box as the pills/meter: no absolute
positioning, no overlay, no layout shift beyond the one flex item it adds.

---

## Data sources

### Context (ring 1)

- `useProjection('contextPressure')` — a standard `session` slot prop, the same
  one `ContextMeter`/`StatsPills` use.
- `ContextPressureProjection` (`dsh-token-meter/src/projection.ts` lines 32–50):
  `projectedTokens?`, `pressureTokens?`, `contextWindow?`.
- Math (`contextRemaining`): `used = projectedTokens ?? pressureTokens` (0 is a
  valid value and wins over the fallback), then
  `remaining = max(0, contextWindow - used)`,
  `remainingPercent = round(remaining / contextWindow * 100)`.
  Missing/zero/non-finite `contextWindow` → `null` → no context ring.
- Text: `compactTokens(remaining)` (`42K`) + `remainingPercent` (`67%`).

### Model quota (rings 2–3)

- DOM source: `.dsh-subscription-usage-pill`, a `<button>` rendered by
  `dsh-plugin-subscriptions` with visible text `Codex · 13% used / 25% used`
  (`compactSegment`, plugin `lib/client.js` line 5664; pill markup line 5984).
  `compactWindows` orders session before weekly (line 5649), at most two
  percentages (line 5654), so “first number = 5h, second = W”.
- The same plugin renders a hidden `display:none` seat plus the pill itself
  (lines 5939–5957, 6088): it portals the pill into `[data-composer-stats]` when
  that container exists, otherwise renders it inline in the dock.
- Parsing (`parseQuotaLabel`): up to two `NN%` occurrences; provider = the first
  `·` segment before the first percentage; mode inferred from the label
  (`used`/`remaining`, plus Arabic/Chinese/Japanese words) and falling back to
  `localStorage['dsh.subscriptions.quotaDisplayMode']` (plugin lines 145–178).
  `remaining` mode normalizes `usedPercent = 100 - displayed` for tone/colour.
- Observers: `MutationObserver` on `[data-composer-stats]` when it exists, else on
  the nearest `[data-composer-dock]` (in this build the pill lives there); a
  `document.body` observer bridges the gap until either scope exists. Listens to
  `dsh:subscriptions:quota-display-mode` + `storage` so a mode switch re-reads.
  All observers/listeners/rAF handles are released in the effect cleanup.
- No pill (or a pill without percentages, e.g. `Codex · Signed in 2 accounts`) →
  only the context ring is rendered.

### Click behaviour

Each quota ring is a `<button type="button">` whose `onClick` finds the pill
(`[data-composer-stats]` → dock → document) and calls `pill.click()`, opening the
plugin's own dialog. The pill is never hidden or replaced. If the pill cannot be
found the click is a no-op (this cannot happen for a rendered quota ring because
the ring only renders when the pill parse produced data).

---

## Theme / visual contract

- Ring geometry mirrors ContextMeter: `viewBox="0 0 14 14"`, `r=5.5`,
  `stroke-width=2`, `stroke-linecap="round"`, `rotate(-90 7 7)` (ContextMeter.tsx
  lines 17–19, 112–123).
- Tokens: `--dsw-alias-brand-primary` (context ring, healthy quota),
  `--dsw-alias-border-l3` (track), `--dsw-alias-label-secondary` /
  `--dsw-alias-label-tertiary` (readings), `--dsw-alias-state-warn-label`
  (≥80 % used), `--dsw-alias-state-error-primary` (≥95 % used),
  `--dsw-alias-border-selected` (focus ring), `--dsw-radius-sm`,
  `--dsw-content-font-size-secondary` / `--dsw-content-font-delta-secondary`.
- `font-variant-numeric: tabular-nums`; compact readings use `bdi dir="ltr"` so
  Arabic/RTL pages cannot reorder `42K`, `67%`; the root is `dir="auto"` and
  inherits its direction from the dock.
- No glass: no backdrop-filter/blur, opaque/transparent surfaces only.
- Responsive: the separator is hidden under 640 px; under 520 px the quota window
  labels (`5h`, `W`) and the redundant context `%` are hidden, leaving the rings,
  the token count and the quota percentages (all still in `title`/`aria-label`).
  `@media (hover:hover)` gives the quota buttons the same hover tint as
  ContextMeter's trigger.
- The stylesheet is one `<style id="dsh-theme-neon-usage-style">` injected through
  `ctx.effect`; cleanup removes it. Inline styles cover only the root flex basics
  so the cluster stays a row even before/without CSS.

---

## Helper API (exported for tests)

The file exposes these through `window.__dshNeonUsageWidget` **only outside DSH**
(the global is skipped while `window.__ModuleLoader__` exists, so nothing leaks into
the product page) and through `module.exports.__dshNeonUsageWidget` under Node/CJS.

| export | signature | returns |
|---|---|---|
| `installUsageWidget` | `(ctx, require, {order?})` | component / `null` |
| `parseQuotaLabel` | `(text, {source?: 'text'\|'aria-label', mode?: 'used'\|'remaining', storage?})` | `{provider, mode, label, windows:[{id:'session'\|'weekly', label:'5h'\|'W', percent, usedPercent}], hasData}` |
| `compactTokens` | `(value)` | `'42K' \| '1.5K' \| '1M' \| ''` |
| `ringDash` | `(percent, radius)` | `{radius, circumference, filled, percent, dasharray}` |
| `contextRemaining` | `(contextPressure)` | `{used, window, remaining, remainingPercent, usedPercent} \| null` |
| `resolveQuotaMode` | `(labelText, storedMode)` | `'used' \| 'remaining'` |
| `readQuotaMode` | `(storage?)` | `'used' \| 'remaining'` |
| `buildClusterTree` | `(model, createElement, {rtl?, onOpenQuota?, rootRef?})` | React element tree / `null` |
| `neonUsageToneColor` | `(usedPercent)` | CSS token |
| `usageWidgetCss` | — | injected CSS text |
| `ORDER`, `QUOTA_MODE_KEY`, `PILL_SELECTOR`, `DOCK_SELECTOR` | — | constants |

`buildClusterTree` contains no hooks or DOM reads, so the markup contract (bidi
isolation, aria names, click proxy, tone colour) is testable with a minimal
`createElement` shim — that is what the test page does.

---

## Verification

- `node --check themes/neon/usage-widget.js` → exit 0.
- `themes/neon/usage-widget-test.html` run in Chromium 1255 (headless shell):
  **`PASS — 74/74 checks passed`**, `body[data-test-result="PASS"]`.
  It asserts: two percentages (used **and** remaining, incl. label-over-stored-mode
  precedence and normalization), one percentage, no pill/no percentages, the
  plugin title-prefixed `aria-label` form, localized label fallback, percentage
  clamping, context math (projected preference, `pressureTokens` fallback, zero
  window, over-capacity clamp, missing data), `compactTokens`, `ringDash`
  (circumference/50 %/clamps/NaN), markup + RTL (`dir="auto"`, `bdi dir="ltr"`,
  Arabic vs English group label), quota click proxy, tone thresholds, CSS contract
  (no glass, tokens, tabular numbers, responsive rule), and a visual preview of
  LTR / RTL / context-only / empty states.
- An additional Node harness (kept outside the deliverables) ran the same helpers
  plus the registration paths (direct `ctx.slots`, waiting `ctx.inject(['slots'])`,
  `{order}` override, `?dsh-neon=off` skip): **83/83 passed**.

Not verified live: the plugin's `lib/client.js` was deliberately not edited, so the
widget is not mounted in the running GUI yet. A live DOM check of the pill was also
not possible because `dsh web` requires the tokenized URL it prints at startup.

---

## Assumptions to confirm

1. **Placement/order.** The brief said “order ~5, next to the ContextMeter”, but the
   ContextMeter renders *after all* dock entries and the subscriptions pill is
   order 10. Default is **15** (immediately beside ContextMeter); pass
   `{ order: 5 }` if the rings should sit before the subscription text pill instead.
2. **`[data-composer-stats]` does not exist in this DSH build.** A full scan of all
   21,722 `app.asar` entries (including >6 MB bundles) found **0** occurrences, and
   `InputBar.tsx` has no such container. In this build the subscriptions pill is
   therefore rendered **inline in `[data-composer-dock]`** by the plugin's fallback
   path. The observer chain supports both, but the “portaled into
   `[data-composer-stats]`” description matches a different shell — confirm which
   placement the user actually sees.
3. **Pill readout order** is assumed to be session/5h first, weekly second (matches
   `compactWindows` in the plugin). The labels `5h` / `W` are fixed from that
   order; the plugin does not spell the window names in the compact pill.
4. **No `t` prop is used.** The registration deliberately declares no `locale`
   namespace (owning a dictionary namespace would complicate the paste-in plugin and
   is not needed): visible readings are locale-neutral (`42K`, `67%`, `5h`, `W`) and
   `title`/`aria-label` copy is English or Arabic chosen from
   `documentElement[dir|lang]`. Note DSH ships no Arabic locale and
   `dsh-rtl-chat-box` only forces `direction` on the composer textarea/editor, so in
   practice the accessible copy will be English. Say the word if the tooltips should
   be Arabic unconditionally.
5. **Ring fill semantics.** The ring always depicts the number printed beside it:
   context = remaining %, quota = the pill's displayed % (so `used` mode shows used
   and `remaining` mode shows remaining), while the tone colour is always derived
   from normalized used %. Confirm that this is the desired reading.
6. **Contrast.** `--dsw-alias-brand-primary` is `#466367` in the dark Neon palette, so
   the healthy rings are intentionally muted (they match the theme accent); they are
   legible in the preview but subtle. If the user wants brighter rings, swap the
   healthy colour to `--dsw-alias-label-secondary` (single constant in
   `neonUsageToneColor` / the context ring call).
7. **`useProjection` presence.** The dock slot is `kind: 'list', scope: 'session'`,
   whose standard props include `useProjection` (`slots.md` table; `ContextMeter`
   and `StatsPills` both receive it). If a future host drops it, the component logs
   one warning and renders quota rings only rather than inventing a context value.

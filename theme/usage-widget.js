/**
 * Neon usage widget — compact circular stats cluster for the composer dock.
 *
 * Adds one `conversation.composer.dock` entry that renders next to the stock
 * ContextMeter:
 *   - context: a 14px ring filled with the REMAINING context share, plus the
 *     remaining token count (e.g. `42K`) and the remaining percentage;
 *   - model quota: up to two 14px rings parsed out of the installed
 *     `dsh-plugin-subscriptions` pill (`.dsh-subscription-usage-pill`), the
 *     session/5h window first and the weekly window second. Clicking a quota
 *     ring proxies a click to that pill, whose own detail dialog opens; the
 *     pill itself is never hidden.
 *
 * Plain browser JS: React comes from `require('react')` and only
 * `React.createElement` is used (no JSX build step). No host or network
 * access. Safe mode: `?dsh-neon=off` skips the widget.
 *
 * Activation (inside the `dsh-theme-neon` client factory):
 *   1. paste this whole file inside the factory (next to `installIcons`);
 *   2. call `installUsageWidget(ctx, require);` from `apply()` after
 *      `installIcons(ctx);`.
 *
 * No extra `inject` export is required: `installUsageWidget` waits for the
 * shell's `slots` service itself (via `ctx.inject(['slots'], …)`) when the
 * service is not there yet.
 *
 * The test file `usage-widget-test.html` reads the helper API from
 * `window.__dshNeonUsageWidget`; inside DSH that global is not touched
 * (window.__ModuleLoader__ exists), so nothing leaks into the product page.
 */

/* ------------------------------------------------------------------------- */
/* Constants                                                                  */
/* ------------------------------------------------------------------------- */

/**
 * Dock order. The stock ContextMeter is rendered AFTER every dock entry, so a
 * higher order sits closer to it. The subscriptions pill registers at order 10
 * (`dsh-plugin-subscriptions`), hence 15 puts this cluster between that text
 * pill and the ContextMeter. Pass `{ order: 5 }` to `installUsageWidget` to
 * render before the subscription text pill instead.
 */
const NEON_USAGE_ORDER = 15;
/** `<style>` id owned by this widget (removed by `ctx.effect` cleanup). */
const NEON_USAGE_STYLE_ID = 'dsh-theme-neon-usage-style';
/** The subscriptions plugin's composer pill. */
const NEON_USAGE_PILL_SELECTOR = '.dsh-subscription-usage-pill';
/** Container the subscriptions plugin portals its pill into when present. */
const NEON_USAGE_STATS_SELECTOR = '[data-composer-stats]';
/** The composer dock that also renders the ContextMeter. */
const NEON_USAGE_DOCK_SELECTOR = '[data-composer-dock]';
/** localStorage key the subscriptions plugin uses for used/remaining display. */
const NEON_USAGE_QUOTA_KEY = 'dsh.subscriptions.quotaDisplayMode';
/** Same-tab change event the subscriptions plugin dispatches for that key. */
const NEON_USAGE_QUOTA_EVENT = 'dsh:subscriptions:quota-display-mode';
/** ContextMeter geometry: 14px viewBox, radius 5.5, 2px stroke. */
const NEON_USAGE_RADIUS = 5.5;
/** Minimal inline fallback layout, so the cluster stays a row even without CSS. */
const NEON_USAGE_ROOT_STYLE = { display: 'inline-flex', alignItems: 'center', flex: 'none' };

/**
 * Theme-token CSS for the cluster. Injected once per plugin lifetime; every
 * surface is opaque (no glass/blur) and the ring geometry matches ContextMeter.
 */
const NEON_USAGE_CSS = [
  '.dsh-neon-usage{display:inline-flex;align-items:center;flex:none;gap:8px;box-sizing:border-box;min-height:20px;',
  'font-family:inherit;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);',
  'font-variant-numeric:tabular-nums;line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));',
  'color:var(--dsw-alias-label-tertiary);direction:inherit;white-space:nowrap}',
  '.dsh-neon-usage__item{display:inline-flex;align-items:center;flex:none;gap:4px;box-sizing:border-box;min-height:20px;',
  'margin:0;padding:1px 4px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;',
  'font:inherit;font-variant-numeric:inherit;line-height:inherit;white-space:nowrap;direction:inherit}',
  '.dsh-neon-usage__item--quota{cursor:pointer;color:var(--dsw-alias-label-tertiary)}',
  ".dsh-neon-usage__item--quota[aria-expanded='true']{background:var(--dsw-alias-interactive-bg-hover);",
  'color:var(--dsw-alias-label-secondary)}',
  '.dsh-neon-usage__item--quota:focus-visible{outline:2px solid var(--dsw-alias-border-selected);outline-offset:1px}',
  '.dsh-neon-usage__ring{display:block;flex:none;overflow:visible}',
  '.dsh-neon-usage__reading{display:inline-flex;align-items:center;gap:3px}',
  '.dsh-neon-usage__number{color:var(--dsw-alias-label-secondary);font-weight:500}',
  '.dsh-neon-usage__percent{color:var(--dsw-alias-label-tertiary)}',
  '.dsh-neon-usage__window{color:var(--dsw-alias-label-tertiary);',
  'font-size:calc(var(--dsh-content-font-size-secondary,13px) - 4px);letter-spacing:.02em;line-height:1}',
  '.dsh-neon-usage__sep{opacity:.55;margin:0 1px}',
  '@media (hover:hover){.dsh-neon-usage__item--quota:hover{background:var(--dsw-alias-interactive-bg-hover);',
  'color:var(--dsw-alias-label-secondary)}}',
  '@media (max-width:640px){.dsh-neon-usage__sep{display:none}}',
  '@media (max-width:520px){.dsh-neon-usage__item--context .dsh-neon-usage__percent{display:none}',
  '.dsh-neon-usage__window{display:none}}',
].join('');

/* ------------------------------------------------------------------------- */
/* Pure helpers (exported for tests)                                          */
/* ------------------------------------------------------------------------- */

/**
 * Format a token count the way the ContextMeter panel does: plain below 1000,
 * one decimal under 100K, then K/M suffixes.
 * @param {number} value token count
 * @returns {string} compact reading, or '' when the value is not finite
 */
function compactTokens(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const count = Math.max(0, Math.round(value));
  if (count < 1000) return String(count);
  const scaled = candidate => (candidate >= 100
    ? String(Math.round(candidate))
    : String(Math.round(candidate * 10) / 10));
  if (count < 1000000) return scaled(count / 1000) + 'K';
  return scaled(count / 1000000) + 'M';
}

/**
 * SVG stroke geometry for a 0-100 percentage on a ring of `radius`.
 * @param {number} percent filled share (clamped to 0..100)
 * @param {number} radius circle radius
 * @returns {{radius:number, circumference:number, filled:number, percent:number, dasharray:string}}
 */
function ringDash(percent, radius) {
  const r = typeof radius === 'number' && Number.isFinite(radius) && radius > 0 ? radius : NEON_USAGE_RADIUS;
  const circumference = 2 * Math.PI * r;
  const clamped = typeof percent === 'number' && Number.isFinite(percent)
    ? Math.min(100, Math.max(0, percent))
    : 0;
  const filled = circumference * clamped / 100;
  return {
    radius: r,
    circumference,
    filled,
    percent: clamped,
    dasharray: filled + ' ' + circumference,
  };
}

/**
 * Resolve the used/remaining display mode from the pill label, falling back to
 * the persisted preference when the label carries no explicit wording (the
 * subscriptions plugin ships English and Chinese labels only).
 * @param {string} text pill label
 * @param {string} [storedMode] 'used' | 'remaining' from localStorage
 * @returns {'used'|'remaining'}
 */
function resolveQuotaMode(text, storedMode) {
  const source = typeof text === 'string' ? text : '';
  if (/remaining|متبق|剩余|残り/i.test(source)) return 'remaining';
  if (/used|مستخدم|已用|使用/i.test(source)) return 'used';
  return storedMode === 'remaining' ? 'remaining' : 'used';
}

/**
 * Read the subscriptions quota display mode from localStorage.
 * @param {{getItem:Function}} [storage] injectable storage for tests
 * @returns {'used'|'remaining'}
 */
function readQuotaMode(storage) {
  try {
    let store = storage;
    if (store === undefined || store === null) {
      if (typeof window === 'undefined' || window === null || !window.localStorage) return 'used';
      store = window.localStorage;
    }
    return store.getItem(NEON_USAGE_QUOTA_KEY) === 'remaining' ? 'remaining' : 'used';
  } catch (_error) {
    return 'used';
  }
}

/**
 * Provider name in front of the percentages: the first `·` segment of the
 * label, e.g. `Codex` in `Codex · 13% used`.
 * @param {string} label normalized label
 * @param {number} cutIndex index of the first percentage
 * @returns {string|null}
 */
function neonUsageProviderOf(label, cutIndex) {
  const before = label.slice(0, cutIndex);
  const candidate = before.split('·')[0]
    .replace(/^[\s·:：\-–—|,;]+/, '')
    .replace(/[\s·:：\-–—|,;]+$/, '');
  if (candidate === '' || candidate.length > 24 || candidate.indexOf('%') !== -1) return null;
  return candidate;
}

/**
 * Parse the subscriptions pill text (or its aria-label) into quota windows.
 * Percentages are ordered session/5h first, weekly second (the subscriptions
 * plugin's compact readout order). In `remaining` mode the displayed numbers
 * are converted back to a normalized `usedPercent` for tone/color decisions.
 *
 * @param {string} text visible label, e.g. `Codex · 13% used / 25% used`
 * @param {{source?:'text'|'aria-label', mode?:'used'|'remaining', storage?:{getItem:Function}}} [options]
 *   `source:'aria-label'` drops the plugin's title prefix before parsing.
 * @returns {{provider:string|null, mode:'used'|'remaining', label:string,
 *   windows:Array<{id:'session'|'weekly', label:'5h'|'W', percent:number, usedPercent:number}>,
 *   hasData:boolean}}
 */
function parseQuotaLabel(text, options) {
  const opts = options || {};
  const raw = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  let label = raw;
  if (opts.source === 'aria-label' && raw !== '') {
    // aria-label is `${title} · ${label}`; the title may itself contain no `·`.
    const cut = raw.indexOf(' · ');
    if (cut !== -1) label = raw.slice(cut + 3).trim();
  }
  const storedMode = opts.mode === 'used' || opts.mode === 'remaining'
    ? opts.mode
    : readQuotaMode(opts.storage);
  const mode = resolveQuotaMode(label, storedMode);
  if (label === '') {
    return { provider: null, mode, label, windows: [], hasData: false };
  }
  const percents = [];
  const pattern = /(\d{1,3})\s*%/g;
  let match = pattern.exec(label);
  while (match !== null && percents.length < 2) {
    percents.push({ value: Math.min(100, Math.max(0, parseInt(match[1], 10))), index: match.index });
    match = pattern.exec(label);
  }
  const provider = neonUsageProviderOf(label, percents.length > 0 ? percents[0].index : label.length);
  const windows = percents.map((entry, index) => ({
    id: index === 0 ? 'session' : 'weekly',
    label: index === 0 ? '5h' : 'W',
    percent: entry.value,
    usedPercent: mode === 'remaining' ? 100 - entry.value : entry.value,
  }));
  return { provider, mode, label, windows, hasData: windows.length > 0 };
}

/**
 * Remaining-context math from the `contextPressure` projection.
 * `used` prefers `projectedTokens` and falls back to `pressureTokens`; a zero,
 * missing, or non-finite window yields `null` (nothing sensible to show).
 * @param {{pressureTokens?:number, projectedTokens?:number, contextWindow?:number}|undefined|null} pressure
 * @returns {{used:number, window:number, remaining:number, remainingPercent:number, usedPercent:number}|null}
 */
function contextRemaining(pressure) {
  if (pressure === null || pressure === undefined || typeof pressure !== 'object') return null;
  const projected = typeof pressure.projectedTokens === 'number' && Number.isFinite(pressure.projectedTokens)
    ? pressure.projectedTokens : null;
  const pressureTokens = typeof pressure.pressureTokens === 'number' && Number.isFinite(pressure.pressureTokens)
    ? pressure.pressureTokens : null;
  const usedTokens = projected !== null ? projected : pressureTokens;
  const windowSize = typeof pressure.contextWindow === 'number' && Number.isFinite(pressure.contextWindow)
    ? pressure.contextWindow : null;
  if (usedTokens === null || windowSize === null || windowSize <= 0) return null;
  const used = Math.min(Math.max(0, usedTokens), windowSize);
  const remaining = Math.max(0, windowSize - used);
  return {
    used,
    window: windowSize,
    remaining,
    remainingPercent: Math.round(remaining / windowSize * 100),
    usedPercent: Math.min(100, Math.round(used / windowSize * 100)),
  };
}

/**
 * Ring tint for a quota window: brand while healthy, warn from 80% used,
 * error from 95% used (same thresholds as the subscriptions plugin).
 * @param {number} usedPercent normalized used share
 * @returns {string} CSS color token
 */
function neonUsageToneColor(usedPercent) {
  if (typeof usedPercent !== 'number' || !Number.isFinite(usedPercent)) return 'var(--dsw-alias-label-dimmed)';
  if (usedPercent >= 95) return 'var(--dsw-alias-state-error-primary)';
  if (usedPercent >= 80) return 'var(--dsw-alias-state-warn-label)';
  return 'var(--dsw-alias-brand-primary)';
}

/** @returns {boolean} true when the document is Arabic/RTL */
function neonUsageIsRtl() {
  try {
    const root = typeof document !== 'undefined' && document !== null ? document.documentElement : null;
    if (root === null || root === undefined) return false;
    if (root.getAttribute('dir') === 'rtl') return true;
    return /^ar\b/i.test(root.getAttribute('lang') || '');
  } catch (_error) {
    return false;
  }
}

/**
 * Bilingual copy for the accessible names/tooltips. Visible readings stay
 * locale-neutral (`42K`, `55%`, `5h`, `W`), which keeps the compact row stable
 * in both directions.
 * @param {boolean} rtl
 */
function neonUsageCopy(rtl) {
  if (rtl) {
    return {
      group: 'استخدام الموديل والسياق المتبقي',
      context: (tokens, percent, windowSize) => tokens + ' توكن متبقٍ من ' + windowSize
        + ' · ' + percent + '% من السياق متبقٍ',
      quota: (provider, windowName, percent, modeText) => (provider === null ? '' : provider + ' · ')
        + 'استخدام ' + windowName + ': ' + percent + '% ' + modeText,
      modeUsed: 'مستخدم',
      modeRemaining: 'متبقٍ',
      windows: { session: '5 ساعات', weekly: 'أسبوعي' },
    };
  }
  return {
    group: 'Model usage and remaining context',
    context: (tokens, percent, windowSize) => tokens + ' tokens left of ' + windowSize
      + ' · ' + percent + '% of context remaining',
    quota: (provider, windowName, percent, modeText) => (provider === null ? '' : provider + ' · ')
      + windowName + ' usage: ' + percent + '% ' + modeText,
    modeUsed: 'used',
    modeRemaining: 'remaining',
    windows: { session: '5h', weekly: 'weekly' },
  };
}

/**
 * One 14px two-stroke ring.
 * @param {Function} h React.createElement-compatible factory
 * @param {number} percent filled share
 * @param {string} color CSS token for the fill stroke
 */
function neonUsageRing(h, percent, color) {
  const dash = ringDash(percent, NEON_USAGE_RADIUS);
  return h('svg', {
    className: 'dsh-neon-usage__ring',
    viewBox: '0 0 14 14',
    width: 14,
    height: 14,
    'aria-hidden': 'true',
    focusable: 'false',
  },
  h('circle', {
    cx: 7, cy: 7, r: NEON_USAGE_RADIUS, fill: 'none', strokeWidth: 2, stroke: 'var(--dsw-alias-border-l3)',
  }),
  h('circle', {
    cx: 7,
    cy: 7,
    r: NEON_USAGE_RADIUS,
    fill: 'none',
    strokeWidth: 2,
    strokeLinecap: 'round',
    stroke: color,
    strokeDasharray: dash.dasharray,
    transform: 'rotate(-90 7 7)',
  }));
}

/**
 * Build the cluster's element tree without hooks or DOM access, so the markup
 * contract (bidi isolation, aria names, click proxy) is unit-testable with any
 * createElement-compatible factory.
 *
 * @param {{context:object|null, quota:object|null, rtl?:boolean}} model
 * @param {Function} h React.createElement-compatible factory
 * @param {{rtl?:boolean, onOpenQuota?:Function, rootRef?:object}} [options]
 * @returns {object|null} element tree, or null when there is nothing to show
 */
function buildClusterTree(model, h, options) {
  if (typeof h !== 'function') return null;
  const opts = options || {};
  const rtl = opts.rtl === true || (model !== null && model !== undefined && model.rtl === true);
  const copy = neonUsageCopy(rtl);
  const context = model !== null && model !== undefined && model.context ? model.context : null;
  const quota = model !== null && model !== undefined && model.quota ? model.quota : null;
  const windows = quota !== null && Array.isArray(quota.windows) ? quota.windows : [];
  const children = [];

  if (context !== null) {
    const title = copy.context(
      compactTokens(context.remaining),
      context.remainingPercent,
      compactTokens(context.window),
    );
    children.push(h('span', {
      className: 'dsh-neon-usage__item dsh-neon-usage__item--context',
      'data-dsh-neon-part': 'context',
      role: 'img',
      title,
      'aria-label': title,
    },
    neonUsageRing(h, context.remainingPercent, 'var(--dsw-alias-brand-primary)'),
    h('span', { className: 'dsh-neon-usage__reading' },
      h('bdi', { className: 'dsh-neon-usage__number', dir: 'ltr' }, compactTokens(context.remaining)),
      h('span', { className: 'dsh-neon-usage__sep', 'aria-hidden': 'true' }, '·'),
      h('bdi', { className: 'dsh-neon-usage__percent', dir: 'ltr' }, String(context.remainingPercent) + '%'))));
  }

  for (let index = 0; index < windows.length; index += 1) {
    const windowInfo = windows[index];
    const windowName = (copy.windows && copy.windows[windowInfo.id]) || windowInfo.label;
    const title = copy.quota(
      quota.provider === undefined ? null : quota.provider,
      windowName,
      windowInfo.percent,
      quota.mode === 'remaining' ? copy.modeRemaining : copy.modeUsed,
    );
    children.push(h('button', {
      type: 'button',
      className: 'dsh-neon-usage__item dsh-neon-usage__item--quota',
      'data-dsh-neon-part': 'quota-' + windowInfo.id,
      'data-dsh-neon-window': windowInfo.label,
      title,
      'aria-label': title,
      'aria-haspopup': 'dialog',
      onClick: typeof opts.onOpenQuota === 'function' ? opts.onOpenQuota : undefined,
    },
    h('span', { className: 'dsh-neon-usage__window', 'aria-hidden': 'true' }, windowInfo.label),
    neonUsageRing(h, windowInfo.percent, neonUsageToneColor(windowInfo.usedPercent)),
    h('bdi', { className: 'dsh-neon-usage__percent', dir: 'ltr' }, String(windowInfo.percent) + '%')));
  }

  if (children.length === 0) return null;
  const props = {
    className: 'dsh-neon-usage',
    'data-dsh-neon-usage': '',
    dir: 'auto',
    role: 'group',
    'aria-label': copy.group,
    style: NEON_USAGE_ROOT_STYLE,
  };
  if (opts.rootRef) props.ref = opts.rootRef;
  // Pass children as rest arguments so a minimal createElement shim works too.
  return h.apply(null, ['span', props].concat(children));
}

/* ------------------------------------------------------------------------- */
/* DOM plumbing (browser only; never runs in the pure-helper tests)           */
/* ------------------------------------------------------------------------- */

/** @returns {boolean} true when `?dsh-neon=off` disables the theme */
function neonUsageSafeMode() {
  try {
    return new URLSearchParams(window.location.search).get('dsh-neon') === 'off';
  } catch (_error) {
    return false;
  }
}

let neonUsageWarned = false;
/**
 * Warn once (and keep going) when the slot contract changes underneath us.
 * @param {string} message
 */
function neonUsageWarnOnce(message) {
  if (neonUsageWarned) return;
  neonUsageWarned = true;
  try {
    console.warn('[dsh-theme-neon] ' + message);
  } catch (_error) { /* console unavailable */ }
}

/** @param {Element|null|undefined} root dock entry root */
function neonUsageDockOf(root) {
  if (root === null || root === undefined || typeof root.closest !== 'function') return null;
  try {
    return root.closest(NEON_USAGE_DOCK_SELECTOR);
  } catch (_error) {
    return null;
  }
}

/**
 * Find the subscriptions pill: its stats container first (the shipped
 * placement), then the composer dock (current DSH renders it inline), then a
 * document-wide fallback for layouts that portal it elsewhere.
 * @param {Element|null|undefined} root
 * @returns {Element|null}
 */
function neonUsageFindPill(root) {
  try {
    const stats = document.querySelector(NEON_USAGE_STATS_SELECTOR);
    const scoped = stats !== null ? stats.querySelector(NEON_USAGE_PILL_SELECTOR) : null;
    if (scoped !== null) return scoped;
    const dock = neonUsageDockOf(root);
    if (dock !== null) {
      const inline = dock.querySelector(NEON_USAGE_PILL_SELECTOR);
      if (inline !== null) return inline;
    }
    return document.querySelector(NEON_USAGE_PILL_SELECTOR);
  } catch (_error) {
    return null;
  }
}

/**
 * Read and parse the pill at this moment (null when there is no pill).
 * @param {Element|null|undefined} root
 */
function neonUsageReadPill(root) {
  const pill = neonUsageFindPill(root);
  if (pill === null) return null;
  const textContent = typeof pill.textContent === 'string' ? pill.textContent.replace(/\s+/g, ' ').trim() : '';
  const ariaLabel = typeof pill.getAttribute === 'function' ? (pill.getAttribute('aria-label') || '') : '';
  const text = textContent !== '' ? textContent : ariaLabel;
  return parseQuotaLabel(text, {
    source: textContent !== '' ? 'text' : 'aria-label',
    mode: readQuotaMode(),
  });
}

/**
 * Observation roots: the stats container when present plus the dock; an
 * ancestor that already contains another scope replaces it.
 * @param {Element|null|undefined} root
 * @returns {Element[]}
 */
function neonUsageObserveScopes(root) {
  const scopes = [];
  const add = scope => {
    if (scope !== null && scope !== undefined && scopes.indexOf(scope) === -1) scopes.push(scope);
  };
  try {
    add(document.querySelector(NEON_USAGE_STATS_SELECTOR));
  } catch (_error) { /* no document */ }
  add(neonUsageDockOf(root));
  return scopes.filter(scope => !scopes.some(other => (
    other !== scope && typeof other.contains === 'function' && other.contains(scope)
  )));
}

/**
 * Structural equality for two parsed quota snapshots, so a MutationObserver
 * pass that changes nothing never schedules a React update.
 * @param {object|null} a
 * @param {object|null} b
 */
function neonUsageSameQuota(a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return (a === null || a === undefined) && (b === null || b === undefined);
  }
  if (a.provider !== b.provider || a.mode !== b.mode) return false;
  const left = Array.isArray(a.windows) ? a.windows : [];
  const right = Array.isArray(b.windows) ? b.windows : [];
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].id !== right[index].id) return false;
    if (left[index].percent !== right[index].percent) return false;
    if (left[index].usedPercent !== right[index].usedPercent) return false;
  }
  return true;
}

/**
 * Observe the subscription pill for changes and return the latest parsed
 * quota (null until a pill exists).
 * @param {any} React the plugin's react module
 * @param {{current: Element|null}} rootRef
 */
function useNeonPillQuota(React, rootRef) {
  const state = React.useState(null);
  const quota = state[0];
  const setQuota = state[1];

  React.useEffect(() => {
    let disposed = false;
    let observers = [];
    let bodyObserver = null;
    let frame = null;
    const requestFrame = typeof requestAnimationFrame === 'function'
      ? callback => requestAnimationFrame(callback)
      : callback => setTimeout(callback, 16);
    const cancelFrame = typeof cancelAnimationFrame === 'function'
      ? handle => cancelAnimationFrame(handle)
      : handle => clearTimeout(handle);

    const read = () => {
      if (disposed) return;
      const next = neonUsageReadPill(rootRef.current);
      setQuota(previous => (neonUsageSameQuota(previous, next) ? previous : next));
    };

    const schedule = () => {
      if (disposed || frame !== null) return;
      frame = requestFrame(() => {
        frame = null;
        read();
      });
    };

    const disconnectObservers = () => {
      for (const observer of observers) observer.disconnect();
      observers = [];
    };

    const bind = () => {
      const scopes = neonUsageObserveScopes(rootRef.current);
      if (scopes.length === 0) return false;
      disconnectObservers();
      for (const scope of scopes) {
        const observer = new MutationObserver(schedule);
        observer.observe(scope, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['aria-label', 'class'],
        });
        observers.push(observer);
      }
      return true;
    };

    read();
    if (!bind()) {
      // Until the dock/root exists, watch the body and retry the scoped bind.
      bodyObserver = new MutationObserver(() => {
        if (disposed) return;
        schedule();
        if (bind() && bodyObserver !== null) {
          bodyObserver.disconnect();
          bodyObserver = null;
        }
      });
      try {
        bodyObserver.observe(document.body, { childList: true, subtree: true });
      } catch (_error) {
        bodyObserver = null;
      }
    }

    const onModeChange = () => { schedule(); };
    const onStorage = event => {
      if (event === null || event === undefined || event.key === null || event.key === NEON_USAGE_QUOTA_KEY) schedule();
    };
    try { window.addEventListener(NEON_USAGE_QUOTA_EVENT, onModeChange); } catch (_error) { /* no window */ }
    try { window.addEventListener('storage', onStorage); } catch (_error) { /* no window */ }

    return () => {
      disposed = true;
      if (frame !== null) {
        cancelFrame(frame);
        frame = null;
      }
      disconnectObservers();
      if (bodyObserver !== null) {
        bodyObserver.disconnect();
        bodyObserver = null;
      }
      try { window.removeEventListener(NEON_USAGE_QUOTA_EVENT, onModeChange); } catch (_error) { /* no window */ }
      try { window.removeEventListener('storage', onStorage); } catch (_error) { /* no window */ }
    };
  }, []);

  return quota;
}

/* ------------------------------------------------------------------------- */
/* React component                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Create the dock component bound to this plugin's React instance.
 * @param {any} React
 * @returns {Function} React component (never JSX)
 */
function createNeonUsageCluster(React) {
  const h = React.createElement;

  /**
   * @param {{context:object|null, quota:object|null, rootRef:object}} input
   * @returns {any} React element or null
   */
  function renderCluster(context, quota, rootRef) {
    const tree = buildClusterTree(
      { context, quota: quota !== null && quota !== undefined && quota.hasData ? quota : null, rtl: neonUsageIsRtl() },
      h,
      {
        rootRef,
        onOpenQuota: () => {
          const pill = neonUsageFindPill(rootRef.current);
          if (pill !== null && typeof pill.click === 'function') {
            pill.click();
            return true;
          }
          return false;
        },
      },
    );
    return tree;
  }

  function NeonUsageQuotaOnly() {
    const rootRef = React.useRef(null);
    const quota = useNeonPillQuota(React, rootRef);
    return renderCluster(null, quota, rootRef);
  }

  function NeonUsageWithContext(props) {
    const rootRef = React.useRef(null);
    const quota = useNeonPillQuota(React, rootRef);
    // Standard session-slot prop, same hook signature as ContextMeter/StatsPills.
    const context = contextRemaining(props.useProjection('contextPressure'));
    return renderCluster(context, quota, rootRef);
  }

  /**
   * The registered dock entry. Falls back to quota-only rings (and warns once)
   * if a host stops providing `useProjection` on the dock slot, instead of
   * silently rendering a context figure from nowhere.
   */
  function NeonUsageDock(props) {
    if (typeof props.useProjection !== 'function') {
      neonUsageWarnOnce('useProjection is missing on conversation.composer.dock props; context ring skipped');
      return h(NeonUsageQuotaOnly, props);
    }
    return h(NeonUsageWithContext, props);
  }

  NeonUsageDock.displayName = 'NeonUsageDock';
  return NeonUsageDock;
}

/* ------------------------------------------------------------------------- */
/* Activation                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Inject the widget stylesheet once for the plugin lifetime.
 * @returns {() => void} cleanup
 */
function installNeonUsageStyle() {
  try {
    const existing = document.getElementById(NEON_USAGE_STYLE_ID);
    if (existing !== null && existing !== undefined) return () => {};
    const style = document.createElement('style');
    style.id = NEON_USAGE_STYLE_ID;
    style.setAttribute('data-dsh-plugin', 'dsh-theme-neon');
    style.textContent = NEON_USAGE_CSS;
    document.head.appendChild(style);
    return () => { style.remove(); };
  } catch (_error) {
    return () => {};
  }
}

/**
 * Register the usage cluster into the composer dock.
 *
 * The plugin factory's `apply()` may run before the shell's `slots` service is
 * installed, so this waits for it through `ctx.inject(['slots'], …)` when that
 * is available; a context that already exposes `slots` registers immediately.
 * No `exports.inject = ['slots']` change is needed in the host plugin.
 *
 * @param {any} ctx cordis client context
 * @param {(id:string) => any} require the plugin factory's require
 * @param {{order?:number}} [options]
 * @returns {Function|null} registered component, or null when skipped
 */
function installUsageWidget(ctx, require, options) {
  if (neonUsageSafeMode()) return null;
  if (ctx === null || ctx === undefined) return null;
  let React = null;
  try {
    React = typeof require === 'function' ? require('react') : null;
  } catch (error) {
    React = null;
  }
  if (React === null || React === undefined || typeof React.createElement !== 'function') {
    neonUsageWarnOnce('react unavailable; usage widget not registered');
    return null;
  }
  const order = options && typeof options.order === 'number' && Number.isFinite(options.order)
    ? options.order
    : NEON_USAGE_ORDER;
  const Component = createNeonUsageCluster(React);

  const register = scope => {
    if (scope === null || scope === undefined || !scope.slots || typeof scope.slots.inject !== 'function') {
      neonUsageWarnOnce('slots service unavailable; usage widget not registered');
      return;
    }
    scope.effect(() => installNeonUsageStyle(), 'dsh-theme-neon: usage widget styles');
    scope.slots.inject('conversation.composer.dock', () => scope.slots.register({
      name: 'conversation.composer.dock',
      id: 'neon-usage',
      order,
    }, Component));
  };

  if (ctx.slots && typeof ctx.slots.inject === 'function') {
    register(ctx);
  } else if (typeof ctx.inject === 'function') {
    ctx.inject(['slots'], register);
  } else {
    neonUsageWarnOnce('slots service unavailable; usage widget not registered');
    return null;
  }
  return Component;
}

/* ------------------------------------------------------------------------- */
/* Test surface                                                               */
/* ------------------------------------------------------------------------- */

const NEON_USAGE_API = {
  installUsageWidget,
  parseQuotaLabel,
  compactTokens,
  ringDash,
  contextRemaining,
  resolveQuotaMode,
  readQuotaMode,
  buildClusterTree,
  neonUsageToneColor,
  usageWidgetCss: NEON_USAGE_CSS,
  ORDER: NEON_USAGE_ORDER,
  QUOTA_MODE_KEY: NEON_USAGE_QUOTA_KEY,
  PILL_SELECTOR: NEON_USAGE_PILL_SELECTOR,
  DOCK_SELECTOR: NEON_USAGE_DOCK_SELECTOR,
};

// Outside DSH (test page, Node require) expose the helpers; inside the product
// the module loader exists, so the page global is deliberately untouched.
const NEON_USAGE_TEST_SURFACE = typeof window === 'undefined'
  || window === null
  || typeof window.__ModuleLoader__ === 'undefined';
if (NEON_USAGE_TEST_SURFACE) {
  try {
    if (typeof window !== 'undefined' && window !== null) window.__dshNeonUsageWidget = NEON_USAGE_API;
  } catch (_error) { /* no window */ }
  try {
    if (typeof module !== 'undefined' && module !== null && module.exports) {
      module.exports.__dshNeonUsageWidget = NEON_USAGE_API;
    }
  } catch (_error) { /* no module */ }
}

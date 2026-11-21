import fs from 'node:fs';
import path from 'node:path';

const out = 'C:/Users/moham/workspace/tools/dsh-theme-neon';
const css = fs.readFileSync('themes/neon/neon-dsh.css', 'utf8').replace(/^@import[^\n]*\n+/, '');
const icons = JSON.parse(fs.readFileSync('themes/neon/neon-icons.json', 'utf8')).symbols;
const usagePath = 'themes/neon/usage-widget.js';
const usage = fs.existsSync(usagePath) ? fs.readFileSync(usagePath, 'utf8').trim() : '';

const client = `/**
 * Neon — Mishkat theme for DeepSeek Harness, browser half.
 *
 * Two jobs, no services and no settings preference:
 *   1. inject the always-on token CSS (body / body[data-ds-dark-theme]);
 *   2. replace the selected product icons in the ui-theme sprite.
 *
 * Safe mode: load the GUI with ?dsh-neon=off and neither job runs.
 * Icon replacement is a DOM patch of the official sprite
 * ([data-dsh-icon-sprite]); it is re-applied after theme/change so switching
 * light/dark does not restore the defaults.
 */
window.__ModuleLoader__.load({
  id: 'dsh-theme-neon',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const CSS = ${JSON.stringify(css)};
    const ICONS = ${JSON.stringify(icons)};

${usage}
    const STYLE_ID = 'dsh-theme-neon-style';
    const LINK_ID = 'dsh-theme-neon-font';
    const SPRITE_SELECTOR = '[data-dsh-icon-sprite]';
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap';

    function safeMode() {
      try {
        return new URLSearchParams(location.search).get('dsh-neon') === 'off';
      } catch {
        return false;
      }
    }

    function injectCss(ctx) {
      ctx.effect(() => {
        let style = document.getElementById(STYLE_ID);
        if (!style) {
          style = document.createElement('style');
          style.id = STYLE_ID;
          style.dataset.dshPlugin = 'dsh-theme-neon';
          document.head.appendChild(style);
        }
        style.textContent = CSS;
        return () => { style.remove(); };
      }, 'dsh-theme-neon: token styles');
    }

    function injectFont(ctx) {
      ctx.effect(() => {
        let link = document.getElementById(LINK_ID);
        if (!link) {
          link = document.createElement('link');
          link.id = LINK_ID;
          link.rel = 'stylesheet';
          link.href = FONT_HREF;
          document.head.appendChild(link);
        }
        return () => { link.remove(); };
      }, 'dsh-theme-neon: Space Mono link');
    }

    function toSymbol(id, markup) {
      const root = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
      const symbol = document.createElementNS(SVG_NS, 'symbol');
      const dropped = new Set(['width', 'height', 'xmlns', 'class', 'aria-hidden']);
      for (const attr of Array.from(root.attributes)) {
        if (!dropped.has(attr.name)) symbol.setAttribute(attr.name, attr.value);
      }
      symbol.id = id;
      for (const child of Array.from(root.childNodes)) {
        symbol.appendChild(document.importNode(child, true));
      }
      return symbol;
    }

    function applyIcons() {
      const sprite = document.querySelector(SPRITE_SELECTOR);
      if (!sprite) return false;
      for (const [id, markup] of Object.entries(ICONS)) {
        const current = sprite.querySelector('symbol[id="' + id + '"]');
        if (!current || current.getAttribute('data-neon') === 'yes') continue;
        const next = toSymbol(id, markup);
        next.setAttribute('data-neon', 'yes');
        current.replaceWith(next);
      }
      return true;
    }

    function installIcons(ctx) {
      let spriteObserver = null;
      let scheduled = false;
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          applyIcons();
        });
      };
      ctx.effect(() => {
        const bind = () => {
          const sprite = document.querySelector(SPRITE_SELECTOR);
          if (!sprite || spriteObserver) return Boolean(sprite);
          spriteObserver = new MutationObserver(schedule);
          spriteObserver.observe(sprite, { childList: true, subtree: true });
          schedule();
          return true;
        };
        const bodyObserver = new MutationObserver(() => { bind(); });
        bodyObserver.observe(document.body, { childList: true, subtree: false });
        const off = ctx.on('theme/change', () => { setTimeout(applyIcons, 0); });
        bind();
        return () => {
          bodyObserver.disconnect();
          if (spriteObserver) spriteObserver.disconnect();
          if (typeof off === 'function') off();
        };
      }, 'dsh-theme-neon: product icon patch');
    }

    function apply(ctx) {
      if (safeMode()) return;
      injectCss(ctx);
      injectFont(ctx);
      installIcons(ctx);
      // The widget is optional and non-fatal: it registers through
      // ctx.inject(['slots'], …) without touching ctx.slots directly, and any
      // failure here must never prevent the CSS/icons above from applying.
      try {
        if (typeof installUsageWidget === 'function') installUsageWidget(ctx, require);
      } catch (error) {
        console.warn('dsh-theme-neon: usage widget skipped', error);
      }
    }

    exports.apply = apply;
    return module.exports;
  }
});
`;

fs.writeFileSync(path.join(out, 'lib', 'client.js'), client, 'utf8');
fs.copyFileSync('themes/neon/neon-dsh.css', path.join(out, 'theme.css'));
fs.copyFileSync('themes/neon/neon-icons.json', path.join(out, 'icons.json'));

// mirror the bundle into the workspace deliverables
fs.mkdirSync('themes/neon/dsh-theme-neon/lib', { recursive: true });
for (const file of ['package.json', 'cordis.patch.yml', 'README.md']) {
  if (fs.existsSync(path.join(out, file))) fs.copyFileSync(path.join(out, file), path.join('themes/neon/dsh-theme-neon', file));
}
fs.copyFileSync(path.join(out, 'lib', 'index.js'), 'themes/neon/dsh-theme-neon/lib/index.js');
fs.copyFileSync(path.join(out, 'lib', 'client.js'), 'themes/neon/dsh-theme-neon/lib/client.js');
fs.copyFileSync(path.join(out, 'theme.css'), 'themes/neon/dsh-theme-neon/theme.css');
fs.copyFileSync(path.join(out, 'icons.json'), 'themes/neon/dsh-theme-neon/icons.json');
console.log('client bytes', client.length, 'css bytes', css.length, 'icons', Object.keys(icons).length);

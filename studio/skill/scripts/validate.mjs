import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const asset = path.join(root, 'assets', 'theme-studio.html');
const failures = [];
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const html = fs.readFileSync(asset, 'utf8');

check('asset exists and is non-trivial', html.length > 150_000, `${(html.length / 1024).toFixed(1)} KiB`);
check('single file: no external scripts', !/<script[^>]+src=/i.test(html));
check('no unfilled build placeholders', !html.includes('/*__CSS__*/') && !html.includes('/*__JS__*/'));
check('preview root', html.includes('id="preview"'));
check('inspector body', html.includes('id="inspector-body"'));
check('drawer', html.includes('id="drawer"'));
check('output textarea', html.includes('id="output-text"'));
check('generated data', html.includes('const ICON_DATA') && html.includes('const PRESETS'));
check('brief builder', html.includes('function buildBrief'));
check('DSH CSS builder', html.includes('function dshCss'));
check('Vencord CSS builder', html.includes('function vencordCss'));
check('web CSS builder', html.includes('function webCss'));
check('clipboard fallback', html.includes('execCommand("copy")') || html.includes("execCommand('copy')"));
check('local storage key', html.includes('mishkat-theme-studio/v1'));

for (const id of ['fayruz', 'layl', 'waraq', 'kathib', 'neon', 'zujaj', 'hibr', 'terminal', 'warda', 'nana']) {
  check(`preset ${id}`, html.includes(`${id}: {`) || html.includes(`"${id}"`));
}
for (const target of ['dsh', 'web', 'vencord']) {
  check(`target ${target}`, html.includes(`data-target="${target}"`));
}
for (const section of ['direction', 'palette', 'type', 'icons', 'form', 'brief']) {
  check(`section ${section}`, html.includes(`data-section="${section}"`));
}
for (const pack of ['lucide', 'tabler', 'ph', 'hero', 'heroSolid']) {
  check(`icon pack ${pack}`, html.includes(`"${pack}"`));
}
for (const font of ['IBM Plex Sans Arabic', 'Sora', 'Tajawal', 'IBM Plex Mono']) {
  check(`font ${font}`, html.includes(font));
}

const source = path.join(root, 'assets', 'studio-src');
for (const file of ['index.html', 'styles-base.css', 'styles-controls.css', 'data.js', 'app.js', 'icons-data.json', 'build.mjs']) {
  check(`source ${file}`, fs.existsSync(path.join(source, file)));
}

console.log('Mishkat theme studio — structural check');
for (const c of checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);

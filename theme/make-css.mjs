import fs from 'node:fs';

const raw = fs.readFileSync('themes/neon/neon-dsh.raw.css', 'utf8');
const importLine = '@import url("https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap");\n\n';
const note = `

/* ------------------------------------------------------------------
   Terminal backdrop (optional)
   DSH's shell is opaque; token CSS cannot reliably paint a body-wide
   wallpaper. This layer is kept separate in neon-terminal.css. To get
   the CRT grid, paste that file after this one and remove this comment.
   ------------------------------------------------------------------ */
`;
const cleaned = raw.replace(/\/\* Optional: DSH's own shell[\s\S]*?\*\//, '/* This theme keeps surfaces opaque (glass blur 0). A body-wide wallpaper\n   needs a native theme plugin, not token CSS. */');
const tweaksPath = 'themes/neon/theme-tweaks.css';
const tweaks = fs.existsSync(tweaksPath) ? fs.readFileSync(tweaksPath, 'utf8').trim() : '';
const css = importLine + cleaned.trim() + (tweaks ? `\n\n${tweaks}\n` : '\n') + note;
fs.writeFileSync('themes/neon/neon-dsh.css', css, 'utf8');
console.log('wrote neon-dsh.css', css.length);

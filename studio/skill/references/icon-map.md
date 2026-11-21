# Icon map

## DSH product icons

`@deepseek-ai/dsh-client-ui-theme` mounts one hidden sprite and replaces product icons by symbol id.
The running 0.2.2-rc.5 bundle exposes **101 icon keys**, each with two symbol variants:

```
dsw-icon-<key>-regular
dsw-icon-<key>-medium
```

→ **202 symbol ids**. The `medium` variant is a slightly heavier optical weight, not a filled variant.
The studio currently maps 12 high-visibility concepts and writes both variants from the same SVG.

| Studio concept | DSH symbol key | Arabic | English |
|---|---|---|---|
| send | `send-outline` | إرسال | Send |
| search | `search-outline` | بحث | Search |
| settings | `settings-outline` | إعدادات | Settings |
| plus | `plus-outline` | إضافة | Add |
| close | `close-outline` | إغلاق | Close |
| check | `check-outline` | تم | Check |
| copy | `copy-outline` | نسخ | Copy |
| sidebar | `panel-left-outline` | شريط | Sidebar |
| sparkle | `enhance-outline` | توهج | Spark |
| attach | `paperclip-outline` | إرفاق | Attach |
| mic | `microphone-outline` | صوت | Mic |
| user | `user-outline` | مستخدم | User |

The full key list can be extracted from the frontend bundle:

```js
// icon definitions are in the `Vw` object; keys look like:
// "send-outline": { size: 14, svg: stroke => `<svg …>` }
// symbol ids are built as `dsw-icon-${key}-${variant}`
```

Known key examples from the bundle:

```
send-outline, search-outline, settings-outline, new-chat-outline,
panel-left-outline, plus-outline, close-outline, close-fill,
check-outline, check-circle-outline, check-circle-fill,
copy-outline, edit-outline, trash-outline, refresh-outline,
paperclip-outline, microphone-outline, user-outline, users-outline,
chevron-down-outline, chevron-left-outline, chevron-right-outline,
chevron-up-outline, ellipsis-outline, folder-open-outline,
enhance-outline, sparkle, globe-outline, link-outline,
paper-plane-outline, stop-fill, play-outline, pause-outline,
warning-outline, info-outline, question-outline, light-outline,
dark-outline, followsystem-outline, code-outline, data-outline,
database-outline, clock-outline, gauge-outline, archive-outline
```

## Replacement constraints

`validateIcons` in the theme package enforces:

1. the key is an `ICON_SYMBOLS` id;
2. the value is a well-formed SVG-namespace `<svg>` document;
3. the root has `viewBox`;
4. no `<style>` or `<script>`;
5. every element `id` starts with the symbol id + `-`;
6. root `width`, `height`, `class`, `aria-hidden` are dropped; `viewBox` and presentation attributes
   carry over;
7. only product icons are replaceable — file-type, plugin, site and brand artwork are fixed.

Use `currentColor` so the icon follows the palette. Gradients/paint servers resolve their stops in
the sprite, which sits in `body`, so they follow palette tokens but not use-site colour overrides.

## The five studio packs

| Pack | Prefix | Licence | ViewBox | Style |
|---|---|---|---|---|
| Lucide | `lucide` | ISC (Feather-derived icons also MIT) | 24 | stroke, 2px default |
| Tabler | `tabler` | MIT | 24 | stroke, 2px default |
| Phosphor | `ph` | MIT | 256 | filled paths |
| Heroicons | `heroicons` | MIT | 24 | stroke, 1.5px default |
| Heroicons Solid | `heroicons-solid` | MIT | 20 | filled |

The studio's 12 concepts × 5 packs are in `assets/studio-src/icons-data.json`. The generated
`icons` tab writes 24 DSH symbol ids (12 concepts × regular/medium). All SVGs are complete and have a
`viewBox`; the studio rewrites `stroke-width` and line caps only for stroke packs.

## Licences

- Lucide: ISC; the icons derived from Feather are MIT. Keep the notice.
- Tabler Icons: MIT.
- Phosphor Icons: MIT.
- Heroicons: MIT.

Do not add a new pack without checking its licence and using `currentColor` compatible SVG.

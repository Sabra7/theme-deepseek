# Neon — theme tweaks (CSS notes)

Implementation notes for `theme-tweaks.css`, the overlay answering the latest Arabic request:

> خل خلفية ثيم الشات اسود بس الباقي زي ماهو، اضف اسامي الملفات نفس لون رسايل المستخدم
> (make the chat background black, everything else stays as it is; make file names the same colour as user messages)

The overlay is **two rules, no layout, no glass, no `!important`**. It is loaded after `neon-dsh.css` and can be removed by deleting the file (or the two rules). `neon-dsh.css`, `lib/client.js` and `tools/**` were not modified.

| File | Role |
|---|---|
| `theme-tweaks.css` | the overlay (2 rules, ~40 lines with comments) |
| `css-mock.html` | DOM-faithful DSH mock used for the Chromium assertions (`?mode=light`, `?tweaks=off`) |
| `css-notes.md` | this file |

---

## 1. Pure-black chat ground (dark mode only)

```css
body[data-ds-dark-theme] [data-conversation-scroll] {
  background-color: #000;
}
```

### Which element actually paints the ground

Inspected in `@deepseek-ai/dsh-client-ui-conversation` (source is shipped inside `app.asar`):

| Element | Rule found | Consequence |
|---|---|---|
| `ConversationRoot` `.root` (`ConversationRoot.module.css:1-8`) | `background: var(--dsw-alias-bg-base)` | this is the surface that currently paints the whole conversation column, header included |
| `ConversationContent` `.scrollBody` (`ConversationRoot.module.css:485-500`), marked `data-conversation-scroll=""` in `ConversationContent.tsx:202` | no `background` declared | the scrollport is transparent, so painting it shows the transcript ground only |
| `ChatView` `.frame` / `.root` / `.scroll` (`ChatView.module.css:1-38`) | no `background` declared | inner chat view is transparent; no need to paint it |
| `.composerSeat` (`ConversationRoot.module.css:544-550`) | own `linear-gradient(... var(--dsw-alias-bg-base) 36px)` | composer keeps Neon surfaces on top of the black scroller (the 36px fade band blends black → base, which is the intended transcript mask) |
| `.header` | outside `[data-conversation-scroll]` | session header keeps `--dsw-alias-bg-base` |
| Sidebar / menus / settings | outside the scroller (menus are portaled to `body`) | untouched |

So: the ground is painted by the conversation **root**, while the **scroller is transparent**. Painting `[data-conversation-scroll]` is the minimum change that makes exactly the transcript area black — no inner `.view` selector is needed, and the whole app is not turned black.

Scoping checks:

* `body[data-ds-dark-theme]` keeps light mode exactly as it was (`#eef7fb` ground, included in the tests).
* The scroller also contains the sticky composer seat; the seat paints its own `--dsw-alias-bg-base` gradient, so the input card keeps its colour (verified: composer seat region unaffected, queued-file chip not repainted).
* `#000` is deliberate literal (the request says pure black), not a token override. No token is redefined, so nothing else in the theme changes.

---

## 2. File names = user-message colour

```css
[data-conversation-scroll] [data-chat-flow]
  :is([data-chat-flow-kind="user"], [data-chat-flow-kind="steering"]) [class*="fileName"],
[data-conversation-scroll] [data-chat-flow] [class*="filePath"],
[data-conversation-scroll] [data-chat-flow] [class*="fileLink"],
[data-conversation-scroll] [data-chat-flow] [class*="fileTargetLink"] {
  color: var(--dsw-alias-brand-primary);
}
```

### Selectors and the real source they hit

CSS-module hashes are build-dependent, but the shipped bundles keep the original name inside the class (`LOmM4q_fileName`, `w30fQq_filePath`, `_fileLink_13jw0_59`), so class-prefix selectors are the stable form.

| Target | Source evidence | Runtime class | Scope guard |
|---|---|---|---|
| chat attachment file card (`<span class=fileName>` under a user message) | `dsh-client-ui-chat/src/client/chat/MessageItem.module.css:343-351` — `.fileName { color: var(--dsw-alias-label-primary); }`, rendered in `UserContent.tsx:37` inside `[data-message-attachments]` | `LOmM4q_fileName` | `[data-chat-flow-kind="user"/"steering"]` row |
| context-injection file paths | `.../chat/ContextBody.module.css:59-62` — `.filePath { color: var(--dsw-alias-label-secondary); }`, rendered in `ContextBody.tsx:260` inside `[data-context-files]` | `w30fQq_filePath` | chat flow |
| tool-card / diff file path | same `.filePath` prefix in the shipped diff/read blocks (`_filePath_74wpx_80`, `_fileHeader_74wpx_66`) | `*_filePath` | chat flow |
| tool-row file link | `dsh-client-ui-tool/src/client/tool/components/ToolRow.tsx:284,296` — `className={css.fileLink}`; `FileTargetLink` uses `css.fileTargetLink` | `*_fileLink`, `*_fileTargetLink` | chat flow |
| markdown file link | shipped shell CSS `._markdown a, ._fileLink_13jw0_59 { color: var(--dsw-alias-link) }`; the file-link button carries `fileMention + fileLink` (`oK` component) | `_fileLink_13jw0_59`, `_fileTargetLink` | chat flow |

Not targeted on purpose: workspace/sidebar tree, sidebar file bodies, `PathLabel` (`[data-path-label]`, used only by sidebar/deliverables/schedule/preview — not by chat), queue-dock chips inside the composer, and the read/diff block that uses the separate `_path_1cyuy_29` class (it has no stable `filePath` prefix; adding `[class*="_path_"]` would be over-broad). The tests assert the sidebar and composer keep their original labels.

### User-bubble colour decision (with source evidence)

Two different sources disagree, so the decision is recorded explicitly:

1. **Stock DSH (the real app's DOM)** — the user bubble is **neutral, not accent**:
   `UserMessageBubble` is `function AR({className, ...props}) { return <div className={clsx(HN.bubble, className)} …/> }`
   in the shipped primitives bundle, and its module CSS is
   `._bubble_1sgyj_1 { background: var(--dsw-specific-bubble); color: var(--dsw-alias-label-primary); … }`.
   With Neon's dark palette that is fill `#10151c` and text `#e8f7ff` — a near-black neutral box
   (`--dsw-alias-brand-primary` is **not** used by the bubble).
2. **The Neon theme design the request refers to** — `mishkat-theme-studio.html` (the preview the user saw,
   see also `neon-preview.png`) renders user messages as accent-filled bubbles:
   `.pv-msg-user .pv-bubble { background: var(--pv-accent); color: var(--pv-accent-text); … }`.
   In Neon dark `--pv-accent` is `#466367`, i.e. `--dsw-alias-brand-primary`.

**Decision: `var(--dsw-alias-brand-primary)`** (dark `#466367`, light `#0e7490`), as directed.
Rationale: (a) the visible "user message" colour in the theme's design language — the one the request names — is the
accent; (b) `--dsw-specific-bubble` is a near-black *surface fill* (`#10151c`); using it as filename text on the
`#0d1018` card would be unreadable (~1.1:1), so it cannot be what the user means; (c) `--dsw-alias-brand-primary`
is a Neon token and matches the accent used for links/selection everywhere else.

**Known divergence:** in the running app the bubble itself is the neutral `--dsw-specific-bubble` fill, so the
literal bubble fill and the new filename colour are not the same pixel value. That is stock DSH, not the Neon
preview; the request only asked to recolour file names ("الباقي زي ماهو"), so the bubble was deliberately **not**
touched. If the bubble should also become accent (so filenames match the live bubble exactly), add this optional
third rule — it is intentionally left out:

```css
/* optional, not applied: stock DSH bubble otherwise, accent user messages */
body[data-ds-dark-theme] [data-chat-flow] [data-message-bubble] {
  background: var(--dsw-alias-brand-primary);
  color: #fff;
}
```

If instead the filename should match the stock bubble text / links exactly, swap the declaration to
`color: var(--dsw-alias-label-primary)` (no visible change in Neon dark) or `var(--dsw-alias-link)` (same value as
`brand-primary` in Neon, so identical result).

Other notes:

* Both modes get the token (`#466367` dark, `#0e7490` light); only the black ground is dark-mode-gated.
* Dark contrast of `#466367` on the `#0d1018` file card is ≈ 2.9:1 — read it as a tinted label rather than body
  text. If it reads too dim on the real screen, the one-line swap above is the fix.
* Specificity: the attribute selectors (≥ 0,3,0) beat the original single-class module rules (`0,1,0`), so no
  `!important` and no load-order dependency on the chat package's injected `<style>` is needed. The only ordering
  requirement is "after `neon-dsh.css`", because rule 2 consumes its tokens.

---

## Verification

Environment: Playwright 1.65.1 (bundled Chromium, headless), `NODE_PATH=C:\Users\moham\.dsh\profiles\desktop\node_modules`, Chromium launch OK.

1. **CSS parses in Chromium** — the file is injected into a document as `<style>`:
   * `sheet.cssRules.length === 2` ✅
   * rule 1 = `body[data-ds-dark-theme] [data-conversation-scroll]`, `backgroundColor: rgb(0, 0, 0)`
   * rule 2 = the four selector groups above, `color: var(--dsw-alias-brand-primary)`
2. **Mock assertions** (`css-mock.html`, dark): `27/27` checks passed. Key values:

| Check | Result |
|---|---|
| dark `[data-conversation-scroll]` background | `rgb(0, 0, 0)` ✅ |
| dark conversation root / header / sidebar | `rgb(7,8,13)` / `rgb(7,8,13)` / `rgb(9,11,18)` — unchanged ✅ |
| dark `--dsw-alias-brand-primary` | `#466367` → user-accent swatch `rgb(70,99,103)` |
| attachment `.fileName` | `rgb(70,99,103)` = user accent ✅ |
| context `.filePath` / tool `.fileLink` / markdown `.fileLink` | `rgb(70,99,103)` each ✅ |
| sidebar file name | `rgb(232,247,255)` — not repainted ✅ |
| composer queued file name | `rgb(232,247,255)` — not repainted ✅ |
| stock bubble fill (evidence) | `rgb(16,21,28)` = `--dsw-specific-bubble` |
| light `[data-conversation-scroll]` | `rgba(0,0,0,0)` (no black), light ground `rgb(238,247,251)` ✅ |
| light attachment `.fileName` | `rgb(14,116,144)` = light accent ✅ |
| `?tweaks=off` before-state | scroller transparent, `.fileName` back to `rgb(232,247,255)` ✅ |

Screenshots: `mock-dark.png` / `mock-light.png` (generated in the verification workspace, not deliverables).

### Limitations / uncertainty

* The **live GUI could not be automated**: `http://127.0.0.1:57192` returns `401 — "dsh web authentication required; reopen the URL printed by dsh web"` for a fresh browser (the desktop webview holds a signed session cookie/token). Verification therefore uses the DOM-faithful mock built from the shipped source + the real runtime class names; live-in-app confirmation is a visual check after the root integrates the CSS.
* The `[class*="fileName"]` prefix only matches the user-row attachment cards because of its `[data-chat-flow-kind="user"/"steering"]` guard; a future class that embeds `fileName` elsewhere in that row would also be recoloured (acceptable, it would still be a file name).
* The second diff renderer's path class (`_path_1cyuy_29`, `DiffBlock` in the shell bundle) is not matched — it has no `filePath`-stable prefix and a `[class*="_path_"]` rule would collide with `PathLabel`'s `_path_1kiio_3` and other `path` classes.
* Chat views that scroll themselves without a `[data-conversation-scroll]` host (embedded/secondary occurrences) keep the theme ground; only the main conversation scroller is in scope, per "the chat area".
* Minor: `.scrollBody` has `margin-right: 2px`, so a 2px strip at the scrollbar edge still shows `--dsw-alias-bg-base`. Invisible in practice; removing it would be a layout change, which is out of scope.

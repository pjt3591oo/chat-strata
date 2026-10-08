# DESIGN.md — atrata-chat group chat UI

Implementation contract for the join screen and live chat room. Every color,
font size, and spacing value in `src/components/**` traces back to a token here.

## 0. Research Log

Task sandbox constraints (no dev server, no browser, `bash` restricted to
`npx tsc --noEmit`, no `npm install`) made these lanes genuinely unavailable;
skips are named here per the skill rule:

- **Lazyweb real-product screens** — skipped: curl recipe forbidden by task constraints. Layout grammar instead taken from canonical shipped group-chat products (Slack/Discord-class: timeline column + roster rail + pinned composer).
- **Imagen concept drafts** — skipped: no imagegen tool available in sandbox.
- **StyleGallery spatial pattern** — adopted from the catalog's *messaging shell* pattern: fixed-height app frame, one scroll owner (the message column), header and composer pinned outside it.
- **React dev tooling (react-grab / react-scan / react-doctor)** — skipped: `npm install` forbidden. Revisit post-handoff.
- **Visual QA via real browser** — deferred to the backend owner's `npm run dev`; verification here is `tsc` + LSP only.

Layer A style skill applied: `taste-skill` (neutral operational product UI,
restrained palette) — the brief asks for clean/modern chat, not glossy hero craft.

## 1. Palette

Base neutrals follow the scaffold's `--background` / `--foreground` (light
`#ffffff`/`#171717`, dark `#0a0a0a`/`#ededed`) via Tailwind `zinc` steps.
One accent hue (indigo) + a 6-hue muted sender-name set. No colored accent
borders on rounded surfaces anywhere; state is encoded by tonal fill.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--surface-0` | zinc-50 `#fafafa` | zinc-950 `#09090b` | page shell |
| `--surface-1` | white | zinc-900 `#18181b` | panels, cards |
| `--surface-2` | zinc-100 `#f4f4f5` | zinc-800/60 | chips, hover wash |
| `--line` | zinc-200/70 | white/10 | hairline borders |
| `--ink-strong` | zinc-900 | zinc-50 | titles, own-bubble meta |
| `--ink` | zinc-700 | zinc-300 | body text |
| `--ink-muted` | zinc-500 | zinc-400 | meta, timestamps, system lines |
| `--accent` | indigo-600 `#4f46e5` | indigo-500 | own bubble fill, primary button, selected chip fill |
| `--accent-soft` | indigo-600/10 | indigo-400/15 | selected chip wash fallback, focus ring |
| `--ok` | emerald-500 | emerald-400 | connected dot |
| `--warn` | amber-500 | amber-400 | reconnecting dot/banner |
| `--bad` | red-500 | red-400 | disconnected dot, error text |

Sender-name hues (hash-picked, muted; used only on name text):
indigo-600, teal-600, amber-600, rose-500, sky-600, violet-600
(dark mode: the -400 variants).

## 2. Typography

- Family: `font-sans` → Geist (latin) with system Hangul fallback (Malgun Gothic / Apple SD Gothic Neo) for Korean copy. `font-mono` for counters.
- Scale: page title 20/28 semibold tracking-tight · panel title 14/20 semibold · body/message 15/24 (`text-[15px] leading-6`) · meta/timestamps 12/16 tabular-nums · system notices 12/16.
- All visible copy is Korean.

## 3. Spacing & shape

- Rhythm: 4 / 8 / 12 / 16 / 24 px. Shell max width 960px (`max-w-[960px]`), join card 400px (`max-w-md`).
- Radii: panels `rounded-2xl`, chips/buttons `rounded-lg`, bubbles `rounded-2xl` with the tail corner `rounded-br-md` (own) / `rounded-bl-md` (others).
- Elevation: `shadow-sm` on panels only. Hairlines via `border` + `--line`.

## 4. Primitives

- **Status pill**: 6px dot + 12px label; connected=ok dot, connecting/reconnecting=warn dot with `animate-pulse`, disconnected=bad dot. Tonal, no border stripe.
- **Room chip**: `--surface-2` fill, `--ink` text; selected = `--accent` fill + white text + check glyph (selection is a glyph + fill, never an accent border). Hover = wash to zinc-200/white-10.
- **Message bubble**: own = `--accent` fill, white text, right-aligned, max-w 80%; others = `--surface-1` + `--line` border, left-aligned, sender name (hue-picked) + time above text. `whitespace-pre-wrap break-words` — long tokens wrap, never overflow.
- **System notice**: centered 12px `--ink-muted`, no bubble, no icon.
- **Composer**: textarea rows=1 auto-grow to max 96px; Enter=send, Shift+Enter=newline; send button = accent fill + SVG arrow; counter appears at >900/1000 chars in mono; disabled state = `--surface-2` fill + `--ink-muted` placeholder while offline.
- **Roster rail**: 224px aside, member rows = 6px dot + name; self row gets a neutral "나" chip (`--surface-2`). Collapses below `md` — header shows `N명` count instead.
- **Buttons**: primary = accent fill white text `rounded-lg h-9 px-4`; ghost = transparent, `--ink-muted` → `--ink` on hover. `focus-visible:ring-2 ring-accent-soft` is the only colored edge allowed.

## 5. Motion

GPU-composited only (`transform`, `opacity`); all gated by `motion-reduce:*`:

- Message entry: fade+rise 150ms (`opacity`/`translate-y`), once per new node.
- Reconnecting dot: `animate-pulse` (opacity).
- Auto-scroll: instant jump to sentinel when user is near bottom (≤120px) or the new message is own; no smooth-scroll fights.

## 6. Responsive

- ≥768px: shell = message column + 224px roster rail; header row: room name · status pill · member count · exit.
- <768px: roster rail hidden (count stays in header); bubbles max-w 88%; join card full-width with 16px gutters.

## 7. Accessibility constraints

- Semantic landmarks (`header/main/aside/footer`), labeled inputs (`label htmlFor`), `aria-live="polite"` on system/error banners, `aria-label` on icon-only buttons, visible focus-visible rings, contrast ≥4.5:1 for all text tokens above.
- Enter-key send must not trap IME composition (guard `e.nativeEvent.isComposing` — critical for Korean input).

## 8. Accepted debt

- No visual QA run in-sandbox (no browser permitted) — flagged for the repo owner.
- Client message buffer capped at 500 entries (server history cap is 200); older-than-cap live messages are dropped client-side.

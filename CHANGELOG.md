# Changelog

## 1.4.0.0 (2026-08-28)

Makes the scroll behaviour *visible*. The certification review of 27 August 2026 failed the
resize test (policy 1180.2.2) again, even though the card has scrolled instead of clipping
since 1.2.0.0.

- **Visible scroll bars.** The root was already `overflow: auto`, but on hosts with overlay
  scrollbars - WebView2 with Windows' default "automatically hide scroll bars", which is
  what Power BI Desktop runs on - an overlay scrollbar occupies no layout space and paints
  nothing until the user actually scrolls. A shrunken card therefore looked clipped with no
  scroll bars, which is exactly what the reviewer's video showed. The scrollbar is now
  explicitly styled (standard `scrollbar-width`/`scrollbar-color`, plus `::-webkit-scrollbar`
  rules for older WebView2 hosts), which opts the element out of overlay rendering: a thin
  bar with a visible track renders whenever content overflows, vertically and horizontally.
- **High contrast.** The scrollbar thumb and track take the host palette's foreground and
  background under an accessibility theme, so the scroll affordance stays visible there too.

## 1.3.0.0 (2026-08-27)

Makes every setting reachable from the Format pane, and adds the text controls the card was
missing.

- **Eleven properties were unreachable.** `caption`, `valueFormat`, `currencyCode`, `compact`,
  `decimals`, `deltaFormat`, `direction`, `headerMode`, `headerColor`, `headerSize` and
  `headerBg` were declared in `capabilities.json` but never returned from
  `getFormattingModel`. At API 5.x the pane is built solely from that model, so they could
  only be set by hand-editing a theme file. All are now in the pane.
- **Font family.** A font picker sets the typeface for the whole card; it was hardcoded to
  Segoe UI in the stylesheet.
- **Independent text colours.** The value, caption and subtitle each take their own colour.
  Previously the value and caption were fixed at `#023864` and the subtitle at `#605E5C` in
  the stylesheet, with no property behind them.
- **Independent font sizes.** The caption, subtitle and delta badge each take their own size.
  They were previously derived from the value size by fixed multipliers (x0.37, x0.53,
  x0.37), so they could not be adjusted against each other.
- **Value and delta formats are dropdowns** rather than free text, listing the formats the
  visual actually implements.
- Settings are read once per update into a single validated object. Sizes from a hand-edited
  theme file are range-checked, so an out-of-range value falls back to the default instead of
  rendering an unusable card.
- A test asserts that every property declared in `capabilities.json` appears in the Format
  pane, so this cannot regress silently.

## 1.2.0.0 (2026-08-25)

Addresses all three findings from the AppSource certification review of 25 August 2026.

- **Resizing (policy 1180.2.2, blocking).** The card scrolls instead of clipping when the
  host shrinks it. The root container is `overflow: auto` and the body no longer compresses
  below its content, so the caption, value and delta stay reachable at any size.
- **Tooltips (1180.2.2.2).** Hovering the card shows the value, subtitle and delta through
  the host tooltip service, each row named after the measure bound to it.
- **Outward filtering (1180.2.2.3).** Clicking the card selects its measure and cross-filters
  the rest of the page; clicking again clears it, and Ctrl+click adds to a selection. The
  selected card is outlined. Selection made elsewhere (bookmarks, other visuals) is reflected
  back through registerOnSelectCallback.
- **Accessibility.** High contrast mode takes its colours from the host palette. The card is
  focusable, activates with Enter or Space, and declares `supportsKeyboardFocus`.
- **Interaction correctness.** Honours the report's Edit interactions setting, shows the
  highlighted figure when another visual highlights a subset, and declares
  `supportsHighlight` and `supportsMultiVisualSelection`.
- **Landing page.** With no fields bound the card explains what to bind instead of sitting
  blank.

## 1.1.0.0 (2026-08-24)

- Currency formatting: set `valueFormat` to "currency" and `currencyCode` to an ISO 4217
  code (default USD). Symbol placement and separators follow the host locale.
- Compact notation: `compact` abbreviates large numbers, so 1284000 renders as 1.28M and a
  currency value as $1.28M.
- `deltaFormat` overrides the badge format independently of the value, so a currency card
  can carry a percentage change ("$1.28M, up 4.2%"). Percent *values* still report their
  delta in percentage points ("pp"), which is what a change in a rate means.
- An unrecognised currency code falls back to plain number formatting rather than showing
  the wrong symbol.
- `decimals` (0-4) tailors precision in every format: 2-decimal currency, a whole-number
  percentage, and so on. Unset keeps each format's existing default, so upgrading changes
  nothing unless you ask it to.

## 1.0.0.0 (2026-08-13)

- Initial public release.
- KPI card with accent bar, formatted value, optional subtitle and caption, and a direction-aware delta badge.
- Header mode for crisp DOM-rendered text headers.
- Configurable no-data default (defaults to 0) shown when the main measure returns blank.
- Format pane controls for value font size and indicator colours.
- Rendering Events API support and context menu support.

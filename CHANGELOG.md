# Changelog

## 1.5.0.0 (2026-08-28)

Real outward filtering, a wrap-instead-of-scroll option, and fixes from a full
certification re-audit.

- **Scrolling now actually works inside Power BI Desktop.** The Desktop sandbox styles
  the element the visual renders into with `body.visual-sandbox #sandbox-host
  { overflow: hidden }` - an ID selector that outweighs the stylesheet's class rule, so
  every previous `overflow: auto` fix was silently overridden in Desktop: the card hard-
  clipped with no scrolling at all, which is what the certification videos show.
  `overflow: auto` is now set as an inline style from the constructor, which no host
  stylesheet rule can beat. Pinned by a unit test.
- **Scrollbar styling corrected - the 1.4.0.0 fix did not survive on overlay-scrollbar
  hosts.** The standard `scrollbar-width`/`scrollbar-color` properties override
  `::-webkit-scrollbar` on Chromium, and under overlay scrollbars (WebView2 / Power BI
  Desktop with Windows' auto-hide default) they merely restyle the overlay bar - thin,
  fading, zero layout space - so a resized card still showed no scrollbar. The standard
  properties are now served to Firefox only (`@supports (-moz-appearance: none)`), leaving
  the `::-webkit-scrollbar` rules in charge on Chromium, where they force a real painted
  bar. Verified against Edge with overlay scrollbars force-enabled; a unit test now pins
  the guard so it cannot regress.
- **The sample report demonstrates outward filtering.** A fifth card binds Month to the
  Cross-filter field bucket (it labels itself with the month) next to a native column
  chart that visibly filters when the card is clicked.
- **Stale tooltip fix.** Removing the bound data now also drops the tooltip handler and
  selection outline, so hovering the landing page cannot show the previous data's values.
- **Touch tooltips.** A tap shows the same tooltip as hovering - mousemove never fires on
  touch devices.

- **Cross-filter field (new optional bucket).** A measure-only card has no data identity,
  so clicking it could never filter other visuals (the 1180.2.2.3 soft failure). Bind the
  field the card represents - a region, a KPI name - and clicking the card now selects that
  field's value and cross-filters the page; clicking again clears it, Ctrl+click adds to a
  selection. The mapping reduces the field to one row (top 1), so the measures still arrive
  exactly as before. When no caption is set, the card labels itself with the bound value.
- **Wrap text (Format pane > Layout).** Off by default (the card scrolls, as certified).
  Turned on, long values, captions, subtitles and the delta badge break onto further lines
  instead of scrolling sideways. Vertical scrolling still applies when the wrapped content
  is taller than the visual, so nothing becomes unreachable.

## 1.4.0.0 (2026-08-28)

Makes the scroll behaviour *visible*. The certification review of 27 August 2026 failed the
resize test (policy 1180.2.2) again, even though the card has scrolled instead of clipping
since 1.2.0.0.

- **Visible scroll bars.** The root was already `overflow: auto`, but on hosts with overlay
  scrollbars - WebView2 with Windows' default "automatically hide scroll bars", which is
  what Power BI Desktop runs on - an overlay scrollbar occupies no layout space and paints
  nothing until the user actually scrolls. A shrunken card therefore looked clipped with no
  scroll bars, which is exactly what the reviewer's video showed. The scrollbar was
  explicitly styled so a thin bar with a visible track renders whenever content overflows.
  (As shipped here the standard properties reached every engine, which still left overlay
  hosts bar-less - corrected in 1.5.0.0.)
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

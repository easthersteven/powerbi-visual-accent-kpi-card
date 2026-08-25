# Changelog

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

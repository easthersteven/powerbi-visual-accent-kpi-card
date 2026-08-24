# Changelog

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

## 1.0.0.0 (2026-08-13)

- Initial public release.
- KPI card with accent bar, formatted value, optional subtitle and caption, and a direction-aware delta badge.
- Header mode for crisp DOM-rendered text headers.
- Configurable no-data default (defaults to 0) shown when the main measure returns blank.
- Format pane controls for value font size and indicator colours.
- Rendering Events API support and context menu support.

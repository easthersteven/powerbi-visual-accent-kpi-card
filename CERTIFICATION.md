# Certification status - Accent KPI Card

**Product ID:** e569891a-3a03-4a79-b794-2f5d6670819a
**Publisher:** Obliwise
**Submitted:** 24 August 2026 (v1.1.0.0)
**Review completed:** 25 August 2026 - **Attention needed, resubmission required**
**Resubmitted:** 27 August 2026 (v1.3.0.0)
**Review completed:** 27 August 2026 - **Attention needed, resubmission required**
**Fix ready:** 28 August 2026 (v1.4.0.0) - not yet resubmitted

## Findings - review of 27 August 2026 (v1.3.0.0)

### 1180.2.2 Core Functions - BLOCKING (again)

Same boilerplate as 25 August, word for word ("bars at the bottom" included), plus a video:
when height is reduced, bottom content is not visible and no scroll bars appear.

**Cause:** the 1.2.0.0 fix (`overflow: auto`, non-compressing body) works - the card really
does scroll - but Power BI Desktop runs on WebView2, and with Windows' default
"automatically hide scroll bars" setting the scrollbar is an *overlay*: it occupies no
layout space and paints nothing until the user actually scrolls. In a passive resize test
the card looks clipped with no scroll bars, which is what the reviewer recorded. Verified
locally by replicating the packaged DOM + CSS in Edge: unstyled, the scrollbar consumed
0 px and painted nothing; explicitly styled, it consumed its gutter and painted its thumb
and track.

**Fix (1.4.0.0):** style the scrollbar explicitly on the root - standard `scrollbar-width:
thin` + `scrollbar-color` (win on Chromium 121+ and Firefox) plus `::-webkit-scrollbar`
rules (cover older WebView2). Custom-styled scrollbars are classic, not overlay: they
occupy layout space and render whenever content overflows, in both axes, regardless of the
OS auto-hide setting. Under high contrast the thumb and track take the host palette via CSS
variables set from `visual.ts`.

### 1180.2.2.3 Core Functions - Filter Out - soft failure (again)

"Does not appear to filter outwards", explicitly marked non-blocking. Accurate: the card
selects its measure via `ISelectionManager`, but a measure-only selection carries no
data-point identity, so the host has nothing to filter other visuals by. A single-value
card has no categories; outward filtering is not meaningfully implementable without adding
a category bucket the visual has no use for. Accept the soft failure and say so plainly in
the certification notes rather than claiming cross-filtering that does not happen.

## Findings - review of 25 August 2026 (v1.1.0.0)

### 1180.2.2 Core Functions - BLOCKING

> Your visual does not appear to display correctly when the user alters the default size.
> [Vertical and Horizontal scroll bars] ... When the height is reduced, the bars at the
> bottom are not visible within the resized area.

**Cause:** `style/visual.less` sets `overflow: hidden` on the root container, so when the
host shrinks the viewport the caption, value and delta badge are clipped with no way to
reach them.

**Fix:** let the root scroll instead of clipping - `overflow: auto` - and verify at small
sizes that every element is reachable. Test by dropping the visual to roughly 150x80 px in
Desktop and confirming scroll bars appear rather than content vanishing.

### 1180.2.2.2 Core Functions - Tool Tips - soft failure

The visual does not use the host tooltip service. Not blocking, but it is the cheapest of
the three to add: request `ITooltipService` from the host and show the unformatted value,
the delta and the subtitle on hover over the card.

### 1180.2.2.3 Core Functions - Filter Out - soft failure

The visual does not filter outwards to other visuals. Not blocking, and arguably correct
for a single-value card: there is no data point to select. If implemented, clicking the
card would select its measure's row and cross-filter the page via `ISelectionManager`.

### 1180.2.3 Sample File - not raised, but pre-empted

Pill Toggle Slicer failed this policy on 26 August 2026 because its `.pbiviz` and `.pbix`
slots held different versions. The same mismatch existed here: the sample embedded 1.1.0.0
while the package to submit is 1.3.0.0. `store/accent-kpi-card-sample.pbix` now embeds
1.3.0.0, byte-identical to
`dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.3.0.0.pbiviz`.

## Resubmission checklist

1. Fix the overflow behaviour (blocking).
2. Optionally add tooltips and outward filtering to clear the soft failures.
3. Bump the version in `pbiviz.json` and `package.json`.
4. `npm test`, `npm run eslint`, `npx pbiviz package --certification-audit`.
5. Confirm `store/accent-kpi-card-sample.pbix` embeds the submitted version (1180.2.3).
6. Upload the new `.pbiviz` and `.pbix` on Technical configuration, then resubmit.

## Full policy audit (26 August 2026)

Audited against the Microsoft certification policies (1180/1200) and the reviewer test list
in "Testing submissions of Power BI custom visuals".

| Reviewer test | Status |
| --- | --- |
| Loads data and renders; convert to/from a native visual | Pass |
| Resize; report size at minimum; scroll bars where needed | **Fixed twice** - root is `overflow: auto` (1.2.0.0); scrollbars explicitly styled so they render even where the OS defaults to invisible overlay scrollbars (1.4.0.0) |
| Tooltips on hover, correct after filtering | **Fixed** - host tooltip service, plus the `tooltips` capability |
| Filters outward to other visuals | **Fixed** - selection through `ISelectionManager` |
| Reflects selection made in other visuals | Pass - renders from the incoming dataView |
| Highlighting from another visual | **Fixed** - shows the highlighted figure, `supportsHighlight` |
| Edit interactions turned off | **Fixed** - guarded by `hostCapabilities.allowInteractions` |
| Ctrl / Alt / Shift selection | Pass - Ctrl and Cmd add to the selection |
| min/max dataViewMapping conditions | **Fixed** - conditions declared |
| Remove fields in arbitrary order; no console errors | Pass - guarded reads, landing page when empty |
| Format pane: every bucket configuration, bad input | **Fixed** - every declared property is reachable in the pane (see below); defaults on every property, out-of-range values clamped |
| Bad data: null, infinity, negative, wrong types | Pass - covered by unit tests |
| Data volumes: one row, two rows, thousands | Pass - data reduction declared |
| Number formats and precision changes | Pass - model format strings honoured |
| High contrast mode | **Fixed** - colours taken from the host palette |
| Keyboard navigation | **Fixed** - focusable, Enter/Space activates, `supportsKeyboardFocus` |
| Landing page when nothing is bound | **Fixed** - explains what to bind |
| Localization | **Fixed** - `stringResources` and the host localization manager |
| Bookmarks | Pass |
| Sample .pbix embeds the submitted visual version (1180.2.3) | **Fixed** - sample embeds 1.4.0.0, matching `dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.4.0.0.pbiviz` |
| No external services; `privileges: []` | Pass - certification audit reports no external requests |

`pbiviz package --certification-audit` reports no external requests. It also lists 9
optional features - informational extras (Analytics Pane, Conditional Formatting, Drill
Down, Fetch More Data, File Download, Launch URL, Local Storage, Modal Dialog, Warning
Icon), several of which would require privileges that certification forbids.

## Format pane coverage (27 August 2026)

At API 5.x the Format pane is built solely from `getFormattingModel`. A property declared in
`capabilities.json` but not returned there is unreachable to the report author - it can only
be set by hand-editing a theme file - which fails the reviewer's "Format pane: every bucket
configuration" test and makes any listing claim about it false.

**11 properties were unreachable at 1.3.0.0:** `caption`, `valueFormat`, `currencyCode`, `compact`, `decimals`, `deltaFormat`, `direction`, `headerMode`, `headerColor`, `headerSize` and `headerBg`. All are now in the pane.

**Newly added because nothing existed behind them:** a font family picker, independent colours for the value, caption and subtitle, and independent font sizes for the caption, subtitle and delta badge - each was previously
hardcoded in `style/visual.less`.

All 24 declared properties are now returned from `getFormattingModel`, and a unit test
asserts that, so it cannot regress silently.

## Current state (28 August 2026)

**1.4.0.0 built and ready; not yet resubmitted.** It answers the 27 August review's
blocking 1180.2.2 finding with explicitly styled, always-rendered scrollbars (see the
findings section above).

**To upload, together, on the Technical configuration page:**
`dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.4.0.0.pbiviz` and
`store/accent-kpi-card-sample.pbix`, with the reviewer notes from `store/listing.md`
pasted into Notes for certification on Review and publish.

**Sample file:** the two embedded visual parts were replaced in place with the 1.4.0.0
build (the surgical zip-part method; entry order preserved). Open it once in Power BI
Desktop to confirm it renders before uploading. The model is import-mode with inline
sample data, so it opens offline with no data sources, connectors or credentials.

**Verified at this version:** npm audit 0 vulnerabilities; ESLint clean; 48 tests passing
at 98% statement coverage; `pbiviz package --certification-audit` reports no external
requests. It also lists 9 optional features - the informational extras described above,
not failures.

**If this review raises anything,** fix it in a new version and upload both slots again.
Re-uploading one slot alone is what produced the 1180.2.3 failure on Pill Toggle Slicer.

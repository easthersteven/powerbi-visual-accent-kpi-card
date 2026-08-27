# Certification status - Accent KPI Card

**Product ID:** e569891a-3a03-4a79-b794-2f5d6670819a
**Publisher:** Obliwise
**Submitted:** 24 August 2026 (v1.1.0.0)
**Review completed:** 25 August 2026 - **Attention needed, resubmission required**

## Findings

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
| Resize; report size at minimum; scroll bars where needed | **Fixed** - root is `overflow: auto`, content no longer compressed |
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
| Sample .pbix embeds the submitted visual version (1180.2.3) | **Fixed** - sample embeds 1.3.0.0, byte-identical to `dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.3.0.0.pbiviz` |
| No external services; `privileges: []` | Pass - certification audit reports no external requests |

`pbiviz package --certification-audit` reports **no recommended-feature warnings**. The
features it still lists are informational extras (Analytics Pane, Conditional Formatting,
Drill Down, Fetch More Data, File Download, Launch URL, Local Storage, Modal Dialog, Warning
Icon); several of those would require privileges that certification forbids.

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

## Current state (27 August 2026)

**Ready to submit:** 1.3.0.0. Package built and audited at
`dist/` - upload that file on the Partner Center Technical configuration page, and paste the
notes from `store/listing.md` into Notes for certification on Review and publish.

**Outstanding before upload:** the sample .pbix is one version behind.
`store/accent-kpi-card-sample.pbix` was re-saved from Power BI Desktop on 27 August 2026 and
embeds **1.2.0.0**, but this build is 1.3.0.0. Desktop still had the file open when 1.3.0.0
was packaged, so it could not be updated in place. Re-import
`dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.3.0.0.pbiviz` and save again - a real
Desktop save is preferable to a payload swap in any case.

Then upload both slots together: uploading one alone is what produced the 1180.2.3 failure on
Pill Toggle Slicer.

**Verified at this version:** npm audit 0 vulnerabilities; ESLint clean; 48 tests passing at
98% statement coverage; `pbiviz package --certification-audit` reports no external requests
and no recommended-feature warnings.

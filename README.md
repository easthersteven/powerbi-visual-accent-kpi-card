# Accent KPI Card

A Power BI custom visual: a compact KPI card with a coloured accent bar, a formatted main value, an optional subtitle and caption, and a direction-aware delta badge. It also offers a header mode that renders the caption as a crisp DOM text header, which stays sharp under page scaling on high-DPI displays.

## Features

- Accent bar across the top of the card with a configurable colour.
- Main value with selectable formatting: currency (host locale placement, configurable ISO code), percent (one decimal), one decimal place, or whole number with thousands grouping (host locale aware). Optional compact notation abbreviates large numbers ($1.28M).
- Optional subtitle rendered beside the value.
- Optional caption above the value.
- Delta badge with an up or down arrow, coloured by whether the movement is good or bad for the metric ("Up is good", "Down is good", or "Neutral"). Percent deltas are shown in percentage points ("pp").
- Non-numeric delta text renders as a neutral badge.
- Configurable no-data default (Format pane, "No data" card): when the main measure returns blank, or the current filter context has no rows at all (a month with no data yet), the card shows this value instead of an empty card. The default is "0" and numeric defaults are formatted like real values ("0" renders as "0.0%" in percent mode). Any other text (such as "n/a") is shown as-is.
- Header mode: renders only the caption as a text header with configurable size, colour, and background.
- Format pane controls for value font size and all indicator colours.
- Rendering Events API support and context menu support (right-click).

## Data roles

| Role | Kind | Description |
| --- | --- | --- |
| Value | Measure | The main KPI value. |
| Delta | Measure | The change to display in the badge. |
| Subtitle | Measure | Optional text shown beside the value. |

## Format options

Set via the visual's objects (Format pane and report themes):

| Object | Property | Description |
| --- | --- | --- |
| cardStyle | accentColor | Colour of the accent bar. |
| cardStyle | direction | "up", "down", or "neutral": which movement is good. |
| cardStyle | caption | Caption text above the value (or the header text in header mode). |
| cardStyle | valueFormat | "currency", "percent", "decimal1", or empty for whole numbers. |
| cardStyle | currencyCode | ISO 4217 code used by the currency format (default USD, e.g. AUD, GBP). |
| cardStyle | compact | Abbreviate large numbers: 1284000 renders as 1.28M (or $1.28M). |
| cardStyle | decimals | Decimal places (0-4) for the value and the delta. Unset keeps each format's default: 1 for percent and decimal1, 0 for currency and whole numbers, 2 for compact. |
| cardStyle | deltaFormat | Overrides the badge format: "percentChange" shows 4.2% on a currency card; empty follows valueFormat. |
| cardStyle | emptyDefault | Value shown when the main measure returns blank (default "0"). |
| cardStyle | fontSize | Value font size; caption, subtitle, and delta scale from it. |
| cardStyle | goodColor / badColor / neutralColor | Delta badge text colours. |
| cardStyle | headerMode / headerColor / headerSize / headerBg | Header mode and its styling. |

## Building from source

Prerequisites: Node.js 18 or later and npm.

```
npm install
npm run package
```

The packaged visual is written to `dist/*.pbiviz` and can be imported into Power BI Desktop or the Power BI service. Package the build you submit with `npx pbiviz package --certification-audit`; a plain package minifies differently and will not match the sample.

### Testing a new build in Power BI Desktop

Once a visual is published, Power BI loads the latest AppSource version of that GUID even when
you import a `.pbiviz` from a file, so About keeps showing the published version. Microsoft's
documented way to test a newer build is Developer mode, keeping the real GUID
([Testing submissions](https://learn.microsoft.com/en-us/power-bi/developer/visuals/submission-testing#testing-a-new-version-of-a-published-visual)):

1. Open the report or project in Power BI Desktop.
2. File > Options and settings > Options > CURRENT FILE > Report settings > Developer Mode >
   **Turn on developer mode for this session**.
3. Visualizations pane > ... > Import a visual from a file > the `.pbiviz` in `dist/`.
4. Check About: it now reports the imported version. Save As `.pbix`.

Developer mode lasts one Desktop session, so repeat step 2 each time you open the file to check
it. Do not change the GUID for testing; Microsoft explicitly warns against it.

For development with live reload:

```
npm start
```

## Tests

Unit tests run on the Node.js test runner with jsdom and enforce a minimum statement coverage threshold:

```
npm test
```

## Linting

```
npm run lint
```

Linting uses eslint with eslint-plugin-powerbi-visuals.

## Repository layout

- `src/visual.ts` - the visual class (DOM rendering and formatting model).
- `src/logic.ts` - pure helper functions (value formatting and delta classification).
- `capabilities.json` - data roles, data view mappings, and format objects. Privileges are empty; the visual makes no external calls.
- `test/` - unit tests.

The `certification` branch contains the source matching the package submitted for Power BI certification.

## Support

Please report issues at https://github.com/easthersteven/powerbi-visual-accent-kpi-card/issues

## License

MIT, see LICENSE.

# Accent KPI Card

A Power BI custom visual: a compact KPI card with a coloured accent bar, a formatted main value, an optional subtitle and caption, and a direction-aware delta badge. It also offers a header mode that renders the caption as a crisp DOM text header, which stays sharp under page scaling on high-DPI displays.

## Features

- Accent bar across the top of the card with a configurable colour.
- Main value with selectable formatting: percent (one decimal), one decimal place, or whole number with thousands grouping (host locale aware).
- Optional subtitle rendered beside the value.
- Optional caption above the value.
- Delta badge with an up or down arrow, coloured by whether the movement is good or bad for the metric ("Up is good", "Down is good", or "Neutral"). Percent deltas are shown in percentage points ("pp").
- Non-numeric delta text renders as a neutral badge.
- Configurable no-data default (Format pane, "No data" card): when the main measure returns blank, the card shows this value instead of an empty card. The default is "0" and numeric defaults are formatted like real values ("0" renders as "0.0%" in percent mode). Any other text (such as "n/a") is shown as-is.
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
| cardStyle | valueFormat | "percent", "decimal1", or empty for whole numbers. |
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

The packaged visual is written to `dist/*.pbiviz` and can be imported into Power BI Desktop or the Power BI service.

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

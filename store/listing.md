# Partner Center listing - Accent KPI Card

Paste-ready values for the AppSource offer. Field limits are shown in brackets.

**Offer ID** (lowercase, no spaces): `accent-kpi-card`

**Name** (50 chars max): Accent KPI Card

**Summary** (100 chars max, one sentence):
KPI card with accent bar, delta badge, subtitle and a configurable value shown when data is empty.

**Description** (3,000 chars max, rich text allowed):

Accent KPI Card is a clean, crisp KPI tile: a coloured accent bar, a large formatted value, an optional subtitle and caption, and a direction aware delta badge that colours itself by whether up or down is good.

Key features:

- **Direction aware delta badge.** Bind a delta measure and tell the card whether up is good, down is good or neutral. The badge picks the right colour automatically, so a falling defect count shows green.
- **Currency and compact values.** Show the value as currency with any ISO 4217 code, as a percentage, to one decimal place, or as a whole number. Symbol placement and separators follow the host locale, and compact notation turns 1,284,000 into $1.28M for headline figures. Decimal places are yours to set, from whole numbers to four places.
- **Deltas that read correctly.** The badge can carry a different format from the value, so a currency card shows a percentage change ("$1.28M, up 4.2%"). Percent values report their delta in percentage points ("pp"), which is what a change in a rate actually means.
- **Value when empty.** When the measure returns blank (for example no rows yet this month), the card shows a configurable default instead of (Blank). A numeric default such as 0 is formatted exactly like a real value.
- **Header mode.** Flip a toggle and the card renders its caption as a crisp text header, sharper than native text boxes under page scaling on high DPI displays.
- **Cross-filter the page.** Bind the field the card represents to the Cross-filter field bucket and clicking the card filters the rest of the page by it - click again to clear, Ctrl+click to add to a selection. With no caption set, the card labels itself with the bound value.
- **Scroll or wrap.** Shrunk below its content, the card shows real scroll bars so nothing is lost. Prefer wrapping? A Layout toggle wraps long text onto further lines instead.
- **Styleable, properly.** Font family, and a font size and colour for the value, caption, subtitle and delta badge independently. Accent colour, good/bad/neutral colours and header styling too. Every setting the visual has is in the Format pane - none of it is theme-file only.
- **Certified friendly.** No external services, no data leaves your report, and the visual supports the Rendering Events API and context menus.

Ideal for KPI strips across the top of a dashboard where consistency, crisp text and sensible empty states matter.

**Search keywords** (up to 3): KPI, card, metric

**Help link:** https://github.com/easthersteven/powerbi-visual-accent-kpi-card#readme
**Privacy policy link:** https://github.com/easthersteven/powerbi-visual-accent-kpi-card/blob/main/PRIVACY.md
**Support document link:** https://github.com/easthersteven/powerbi-visual-accent-kpi-card/blob/main/SUPPORT.md
**Support (issues) link:** https://github.com/easthersteven/powerbi-visual-accent-kpi-card/issues

**Media:**
- Logo 300x300: `store/icon-300x300.png`
- Screenshot 1366x768 (PNG, under 1024 kb): `store/screenshot-1366x768.png`
  Suggested caption: "KPI cards with accent bars, direction aware deltas and a configurable value when data is empty."

**Properties page:**
- Category (max 2): KPI + Change over time
- Industry (max 2): leave empty - the visual is not industry-specific
- EULA: use the Standard Contract for Microsoft's commercial marketplace
- Privacy policy link: https://github.com/easthersteven/powerbi-visual-accent-kpi-card/blob/main/PRIVACY.md
- Support document link: https://github.com/easthersteven/powerbi-visual-accent-kpi-card/blob/main/SUPPORT.md

**Technical configuration page:**
- PBIVIZ package: `dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.5.0.0.pbiviz`
  (full path: `C:\Users\se518\powerbi-visuals\powerbi-visual-accent-kpi-card\dist\accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.5.0.0.pbiviz`)
- Sample PBIX: `store/accent-kpi-card-sample.pbix` - must open offline with no external
  connections, embed its own sample data, and use this exact visual version.

**Certification:**
1. Offer setup page: tick **Request Power BI certification**.
2. Review and publish page, **Notes for certification** box, paste the block
   below verbatim. It is reviewer-facing only, and each paragraph is a single
   line so it pastes without re-wrapping.

```text
Accent KPI Card 1.5.0.0 - Product ID e569891a-3a03-4a79-b794-2f5d6670819a
Supersedes 1.3.0.0, reviewed 27 August 2026.

SOURCE AND BUILD
Repository: https://github.com/easthersteven/powerbi-visual-accent-kpi-card
Branch: certification - byte-identical to main and to the submitted package.
Access: public repository, no credentials required.
Build: npm install, then npm run package.
Tooling: powerbi-visuals-tools 7.2.1, API 5.11.0.

RESPONSE TO THE REVIEW OF 27 AUGUST 2026
1180.2.2 resize (blocking) - fixed. Two defects compounded: (1) the sandbox styles the element the visual renders into with an ID-selector overflow:hidden rule that outweighs any class rule, so the visual's overflow:auto never took effect inside Power BI Desktop - the card hard-clipped exactly as the review video shows; overflow:auto is now set as an inline style, which host stylesheet rules cannot override. (2) With scrolling active, overlay scrollbars (WebView2 with Windows' "automatically hide scroll bars" default) paint nothing until the user scrolls, so the scrollbars are explicitly styled with ::-webkit-scrollbar rules that render a persistent thin bar with a visible track whenever content overflows, vertically and horizontally (the standard scrollbar-width/scrollbar-color properties are served to Firefox only, where those rules do not exist). Reproducible by sizing the visual to roughly 150x80 px: both scroll bars render and every element (caption, value, subtitle, delta badge) is reachable. Under high contrast the scrollbar takes its colours from the host palette.
1180.2.2.3 filter out (soft) - fixed. A new optional Cross-filter field bucket gives the card a data identity: bind the field the card represents (e.g. a region or KPI name) and clicking the card selects that value and cross-filters the page; clicking again clears it and Ctrl+click adds to a selection. The selected card is outlined, activation works with Enter/Space, the report's Edit interactions setting is honoured, and selection made elsewhere is reflected back through registerOnSelectCallback. Without the bucket the card is measures-only and has no data-point identity to filter by.

NEW IN 1.5.0.0
Wrap text (Format pane, Layout): off by default the card scrolls as certified; turned on, long values, captions, subtitles and the delta badge wrap onto further lines instead of scrolling sideways, with vertical scrolling still available so nothing becomes unreachable. When no caption is set and the Cross-filter field is bound, the card labels itself with the bound value. Tooltips also show from a tap on touch devices, and removing the bound data clears the tooltip and selection state along with the card.

CARRIED OVER FROM 1.3.0.0 (passed 27 August 2026)
Tool tips through the host tooltip service. Every property declared in capabilities.json is returned from getFormattingModel, so the whole configuration surface is reachable in the Format pane, including a font family picker and independent font sizes and colours for the value, caption, subtitle and delta badge.

HOST BEHAVIOUR AND ACCESSIBILITY
High contrast mode takes every colour from the host palette. The card is focusable and Enter or Space activates it; supportsKeyboardFocus is declared. Honours the report's Edit interactions setting. Shows the highlighted figure when another visual highlights a subset (supportsHighlight). Supports the Rendering Events API and context menus. Strings are localised through stringResources and the host localization manager, and a landing page explains the visual when nothing is bound.

SECURITY AND PRIVACY
No external services and no network calls of any kind; no data leaves the report. capabilities.json declares "privileges": []. pbiviz package --certification-audit reports no external requests. npm audit reports 0 vulnerabilities. 54 unit tests pass.

SAMPLE FILE
accent-kpi-card-sample.pbix opens offline: the model is import-mode with inline sample data, with no data sources, connectors or credentials. It embeds visual version 1.5.0.0, matching the submitted .pbiviz. Page 1 shows four cards across the top, left to right: a currency value in compact notation (AUD) with a percentage-change delta, a down-is-good metric (open tickets), a percentage whose delta reads in percentage points, and a card whose measure returns BLANK() to demonstrate the configurable empty value. Below them, a fifth card binds Month to the Cross-filter field bucket (it labels itself with the month) next to a native column chart: clicking that card cross-filters the chart, demonstrating outward filtering (1180.2.2.3); clicking again clears it. Page 2 documents the settings.
```

**Pre-publish checks - passed 28 Aug 2026 (v1.5.0.0), resubmission pending:** npm audit 0
vulnerabilities; eslint clean; 54 unit tests pass; certification audit found no external
requests; logo 300x300 and screenshot 1366x768 within size limits.

**Before resubmitting - the sample .pbix MUST be re-saved from the PBIP:** the sample
project gained the cross-filter demo (a fifth card bound to Month plus a native column
chart), and report bindings cannot be patched into the .pbix by hand. Open
`store/accent-kpi-card-sample.pbip` in Power BI Desktop, import
`dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.5.0.0.pbiviz`, confirm the month
card cross-filters the chart, then Save As over `store/accent-kpi-card-sample.pbix`.
Upload both slots together.

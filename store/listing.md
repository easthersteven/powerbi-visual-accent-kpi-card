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
- **Value formatting.** Show the value as a percentage, to one decimal place, or as a whole number with locale aware thousands separators. Percent deltas are reported in percentage points ("pp"), which is what a change in a rate actually means.
- **Value when empty.** When the measure returns blank (for example no rows yet this month), the card shows a configurable default instead of (Blank). A numeric default such as 0 is formatted exactly like a real value.
- **Header mode.** Flip a toggle and the card renders its caption as a crisp text header, sharper than native text boxes under page scaling on high DPI displays.
- **Styleable.** Accent colour, good/bad/neutral colours, font size and header styling are all in the Format pane.
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
- PBIVIZ package: `dist/accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.0.0.0.pbiviz`
  (full path: `C:\Users\se518\powerbi-visuals\powerbi-visual-accent-kpi-card\dist\accentKpiCardA5954A8F7A18431E8E2729CD89ED8F8E.1.0.0.0.pbiviz`)
- Sample PBIX: `store/accent-kpi-card-sample.pbix` - must open offline with no external
  connections, embed its own sample data, and use this exact visual version.

**Certification:**
1. Offer setup page: tick **Request Power BI certification**.
2. Review and publish page, **Notes for certification** box, paste:

   Source code: https://github.com/easthersteven/powerbi-visual-accent-kpi-card
   Branch: certification (matches the submitted package exactly)
   Access: public repository, no credentials required.
   Build: npm install, then npm run package (powerbi-visuals-tools 7.2.1, API 5.11.0).
   Verified: npm audit clean, eslint clean, `pbiviz package --certification-audit`
   reports no external requests, capabilities declare `"privileges": []`.

**Pre-publish checks (24 Aug 2026, v1.0.0.0):** npm audit 0 vulnerabilities; eslint
clean; unit tests pass; certification audit found no external requests; logo 300x300 and
screenshot 1366x768 within size limits; main and certification branches identical.

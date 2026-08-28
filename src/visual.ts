"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { formatMainValue, deltaDisplay, resolveEmptyDefault, tooltipItems, readSettings, effectiveDeltaFormat, CARD_DEFAULTS, CardSettings } from "./logic";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;

function el(tag: string, cls?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}

export class Visual implements IVisual {
    private events: IVisualEventService;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private tooltipService: ITooltipService;
    private colorPalette: ISandboxExtendedColorPalette;
    private localization: ILocalizationManager;
    private selectionId: ISelectionId | null = null;
    private selected = false;
    private target: HTMLElement;
    private locale: string | undefined;
    // Mirrors the last rendered settings so getFormattingModel shows what the card is
    // actually displaying, including the defaults applied when a property is unset.
    private settings: CardSettings = { ...CARD_DEFAULTS };

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.colorPalette = options.host.colorPalette as ISandboxExtendedColorPalette;
        this.localization = options.host.createLocalizationManager?.();
        this.locale = options.host.locale;
        this.target = options.element;
        this.target.classList.add("accent-kpi-card");
        // Power BI Desktop's sandbox styles this very element with
        // `body.visual-sandbox #sandbox-host { overflow: hidden }` - an ID selector that
        // outweighs any class rule in visual.less. The scroll behaviour policy 1180.2.2
        // requires must therefore be set inline, which no host stylesheet rule can beat.
        this.target.style.overflow = "auto";
        this.target.addEventListener("contextmenu", (ev) => {
            this.selectionManager.showContextMenu(this.selectionId ?? ({} as unknown as ISelectionId), { x: ev.clientX, y: ev.clientY });
            ev.preventDefault();
        });

        // Cross-filter the rest of the page from the card: clicking selects the bound
        // measure, clicking again clears it (certification policy 1180.2.2.3).
        this.target.addEventListener("click", (ev) => this.toggleSelection(ev.ctrlKey || ev.metaKey));

        // Selection can also change from outside the visual (bookmarks, other visuals).
        this.selectionManager.registerOnSelectCallback(() => {
            this.selected = this.selectionManager.getSelectionIds().length > 0;
            this.target.classList.toggle("selected", this.selected);
        });

        this.target.addEventListener("mouseleave", () => this.hideTooltip());

        // Keyboard access: the card is focusable and Enter or Space activates it, so
        // cross-filtering is reachable without a mouse.
        this.target.tabIndex = 0;
        this.target.setAttribute("role", "button");
        this.target.addEventListener("keydown", (ev: KeyboardEvent) => {
            if (ev.key !== "Enter" && ev.key !== " ") return;
            ev.preventDefault();
            this.toggleSelection(ev.ctrlKey || ev.metaKey);
        });
    }

    // Single selection path shared by mouse and keyboard: select the bound measure, or
    // clear when it is already the only selection.
    private toggleSelection(multi: boolean): void {
        // Honour the report's Edit interactions setting: when the author has turned this
        // visual's interactions off, clicking must not filter the page.
        if (!this.selectionId || this.host.hostCapabilities?.allowInteractions === false) return;
        const done = this.selected && !multi
            ? this.selectionManager.clear()
            : this.selectionManager.select(this.selectionId, multi);
        done.then(() => {
            this.selected = this.selectionManager.getSelectionIds().length > 0;
            this.target.classList.toggle("selected", this.selected);
        });
    }

    // Shown when no fields are bound yet, so an empty card explains itself.
    // Localized string with the English text as the fallback, so the card still reads
    // correctly if the host provides no localization manager.
    private text(key: string, fallback: string): string {
        try {
            return this.localization?.getDisplayName(key) || fallback;
        } catch {
            return fallback;
        }
    }

    private renderLandingPage(): void {
        const page = el("div", "kpi-landing");
        page.appendChild(el("div", "kpi-landing-title", this.text("Landing_Title", "Accent KPI Card")));
        page.appendChild(el("div", "kpi-landing-body", this.text("Landing_Body",
            "Add a measure to the Value field to get started. Bind Delta for a direction aware "
            + "badge, Subtitle for text beside the value, and Cross-filter field to let clicks "
            + "filter the page.")));
        this.target.appendChild(page);
    }

    private hideTooltip(): void {
        this.tooltipService?.hide({ immediately: true, isTouchEvent: false });
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);

        try {
            while (this.target.firstChild) this.target.removeChild(this.target.firstChild);
            this.selectionId = null;
            this.hideTooltip();
            // Drop the previous render's tooltip handlers so a card whose data was just
            // removed cannot show stale values from the landing page.
            this.target.onmousemove = null;
            this.target.onpointerdown = null;

            const dv: DataView = options.dataViews?.[0];
            if (!dv?.categorical?.values?.length) {
                this.target.classList.remove("selected");
                this.renderLandingPage();
                this.events.renderingFinished(options);
                return;
            }

            const vals = dv.categorical.values;
            // Optional cross-filter field: the mapping reduces it to one row (top 1), and its
            // value gives the card a real data identity so clicking can filter the page.
            const cat = dv.categorical.categories?.[0];
            const catValue = cat && cat.values?.length ? cat.values[0] : undefined;
            let mainVal: powerbi.PrimitiveValue = null;
            let deltaVal: powerbi.PrimitiveValue = null;
            let subtitleVal: powerbi.PrimitiveValue = null;

            let mainCol: powerbi.DataViewValueColumn | null = null;
            let deltaCol: powerbi.DataViewValueColumn | null = null;
            // When another visual highlights a subset of the data, show the highlighted
            // figure rather than the unfiltered total.
            const pick = (col: powerbi.DataViewValueColumn): powerbi.PrimitiveValue => {
                const h = col.highlights?.[0];
                return h !== undefined && h !== null ? h : col.values[0];
            };
            for (const col of vals) {
                const role = col.source.roles;
                if (role?.["mainValue"]) { mainVal = pick(col); mainCol = col; }
                if (role?.["deltaValue"]) { deltaVal = pick(col); deltaCol = col; }
                if (role?.["subtitle"]) subtitleVal = col.values[0];
            }

            const s = readSettings(dv.metadata?.objects?.["cardStyle"]);
            this.settings = s;
            const fmtOpts = { currencyCode: s.currencyCode, compact: s.compact, decimals: s.decimals };

            // High contrast mode: the host palette replaces the configured colours, so the
            // card stays legible under the user's accessibility theme.
            const hc = this.colorPalette?.isHighContrast === true;
            const hcFore = this.colorPalette?.foreground?.value;
            const hcBack = this.colorPalette?.background?.value;
            const accentColorEff = hc ? hcFore : s.accentColor;
            const goodColorEff = hc ? hcFore : s.goodColor;
            const badColorEff = hc ? hcFore : s.badColor;
            const neutralColorEff = hc ? hcFore : s.neutralColor;
            this.target.style.background = hc ? hcBack : "";
            this.target.style.color = hc ? hcFore : "";
            // The scrollbar follows the palette too, so the scroll affordance required by
            // policy 1180.2.2 stays visible under an accessibility theme.
            if (hc) {
                this.target.style.setProperty("--kpi-scrollbar-thumb", hcFore);
                this.target.style.setProperty("--kpi-scrollbar-track", hcBack);
            } else {
                this.target.style.removeProperty("--kpi-scrollbar-thumb");
                this.target.style.removeProperty("--kpi-scrollbar-track");
            }
            // Font family applies to the whole card, so every element inherits one typeface.
            this.target.style.fontFamily = s.fontFamily;
            // Wrap mode: long text wraps onto further lines instead of scrolling sideways.
            this.target.classList.toggle("wrap", s.wrapText);

            // An unset caption falls back to the cross-filter field's value, so a card bound
            // to e.g. Region labels itself with the region it represents.
            const caption = s.caption || (catValue != null ? String(catValue) : "");

            // HEADER MODE: render the caption as a crisp DOM header (sharper than native visual titles
            // under page scaling on high-DPI displays). Skips the accent/value/delta entirely.
            if (s.headerMode) {
                const hColor = hc ? hcFore : s.headerColor;
                const hBg = hc ? hcBack : s.headerBg;
                this.target.style.background = hBg;
                const h = el("div", "kpi-header", caption);
                h.style.color = hColor;
                h.style.fontSize = s.headerSize + "px";
                this.target.appendChild(h);
                this.events.renderingFinished(options);
                return;
            }

            // NO DATA: when the main measure is bound but returns blank (e.g. no rows for the
            // current period), show the configurable default (a numeric default is formatted
            // like a real value, so "0" renders as "0.0%" in percent mode).
            const hasMain = [...vals].some((col) => col.source.roles?.["mainValue"]);
            const formattedValue = mainVal == null && hasMain
                ? resolveEmptyDefault(s.emptyDefault, s.valueFormat, this.locale, fmtOpts)
                : formatMainValue(mainVal, s.valueFormat, this.locale, fmtOpts);

            // Identity for cross-filtering and tooltips. A category identity (from the
            // cross-filter field) can actually filter other visuals; a measure-only identity
            // cannot, but still gives the tooltip an identity the host can use.
            const queryName = mainCol?.source?.queryName;
            this.selectionId = catValue !== undefined
                ? this.host.createSelectionIdBuilder().withCategory(cat, 0).createSelectionId()
                : queryName
                    ? this.host.createSelectionIdBuilder().withMeasure(queryName).createSelectionId()
                    : null;
            this.target.classList.toggle("selected", this.selected && !!this.selectionId);

            let deltaText = "";

            const accent = el("div", "kpi-accent");
            accent.style.background = accentColorEff;
            this.target.appendChild(accent);

            const body = el("div", "kpi-body");

            if (caption) {
                const capEl = el("div", "kpi-caption", caption);
                capEl.style.color = hc ? hcFore : s.captionColor;
                capEl.style.fontSize = s.captionSize + "px";
                body.appendChild(capEl);
            }

            const valueRow = el("div", "kpi-value-row");
            const valEl = el("span", "kpi-value", formattedValue);
            valEl.style.color = hc ? hcFore : s.valueColor;
            valEl.style.fontSize = s.fontSize + "px";
            valueRow.appendChild(valEl);
            if (subtitleVal != null && subtitleVal !== "") {
                const subEl = el("span", "subtitle-value", String(subtitleVal));
                subEl.style.color = hc ? hcFore : s.subtitleColor;
                subEl.style.fontSize = s.subtitleSize + "px";
                valueRow.appendChild(subEl);
            }
            body.appendChild(valueRow);

            if (deltaVal != null) {
                const d = typeof deltaVal === "number" ? deltaVal : parseFloat(String(deltaVal));
                if (!isNaN(d)) {
                    const delta = deltaDisplay(d, s.direction, s.valueFormat, this.locale, fmtOpts, effectiveDeltaFormat(s.deltaFormat));
                    deltaText = delta.text;
                    const deltaEl = el("span", "delta delta-" + delta.kind, delta.text);
                    deltaEl.style.color = delta.kind === "good" ? goodColorEff : delta.kind === "bad" ? badColorEff : neutralColorEff;
                    if (hc) { deltaEl.style.background = hcBack; deltaEl.style.border = "1px solid " + hcFore; }
                    deltaEl.style.fontSize = s.deltaSize + "px";
                    body.appendChild(deltaEl);
                } else if (typeof deltaVal === "string" && deltaVal.length > 0) {
                    deltaText = String(deltaVal);
                    const dEl = el("span", "delta delta-neutral", String(deltaVal));
                    dEl.style.color = neutralColorEff;
                    if (hc) { dEl.style.background = hcBack; dEl.style.border = "1px solid " + hcFore; }
                    dEl.style.fontSize = s.deltaSize + "px";
                    body.appendChild(dEl);
                }
            }

            this.target.appendChild(body);

            // Tooltip on hover: what the card shows, plus the names of the bound measures
            // (certification policy 1180.2.2.2).
            const items = tooltipItems({
                caption,
                valueName: mainCol?.source?.displayName,
                formattedValue,
                subtitle: subtitleVal != null ? String(subtitleVal) : "",
                deltaText,
                deltaName: deltaCol?.source?.displayName,
            });
            const showTip = (ev: MouseEvent, isTouch: boolean) => {
                const rect = this.target.getBoundingClientRect();
                this.tooltipService?.show({
                    coordinates: [ev.clientX - rect.left, ev.clientY - rect.top],
                    isTouchEvent: isTouch,
                    dataItems: items,
                    identities: this.selectionId ? [this.selectionId] : [],
                });
            };
            this.target.onmousemove = (ev: MouseEvent) => showTip(ev, false);
            // Touch devices get the tooltip from a tap - mousemove never fires there.
            this.target.onpointerdown = (ev: PointerEvent) => { if (ev.pointerType === "touch") showTip(ev, true); };

            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    // --- Format pane -------------------------------------------------------
    // Every property declared in capabilities.json is surfaced here. At API 5.x the pane is
    // built solely from this model, so anything omitted is unreachable to the report author.

    private static desc(propertyName: string): powerbi.visuals.FormattingDescriptor {
        return { objectName: "cardStyle", propertyName };
    }

    private colorSlice(uid: string, displayName: string, prop: string, value: string): powerbi.visuals.FormattingSlice {
        return {
            uid, displayName,
            control: {
                type: powerbi.visuals.FormattingComponent.ColorPicker,
                properties: { descriptor: Visual.desc(prop), value: { value } }
            }
        };
    }

    private numSlice(uid: string, displayName: string, prop: string, value: number, min: number, max: number, unit?: string): powerbi.visuals.FormattingSlice {
        return {
            uid, displayName,
            control: {
                type: powerbi.visuals.FormattingComponent.NumUpDown,
                properties: {
                    descriptor: Visual.desc(prop),
                    value,
                    options: {
                        unitSymbol: unit,
                        minValue: { type: powerbi.visuals.ValidatorType.Min, value: min },
                        maxValue: { type: powerbi.visuals.ValidatorType.Max, value: max }
                    }
                }
            }
        };
    }

    private toggleSlice(uid: string, displayName: string, prop: string, value: boolean): powerbi.visuals.FormattingSlice {
        return {
            uid, displayName,
            control: {
                type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                properties: { descriptor: Visual.desc(prop), value }
            }
        };
    }

    private textSlice(uid: string, displayName: string, prop: string, value: string, placeholder: string): powerbi.visuals.FormattingSlice {
        return {
            uid, displayName,
            control: {
                type: powerbi.visuals.FormattingComponent.TextInput,
                properties: { descriptor: Visual.desc(prop), value, placeholder }
            }
        };
    }

    private dropdownSlice(uid: string, displayName: string, prop: string, value: string, items: powerbi.IEnumMember[]): powerbi.visuals.FormattingSlice {
        return {
            uid, displayName,
            control: {
                type: powerbi.visuals.FormattingComponent.Dropdown,
                properties: {
                    descriptor: Visual.desc(prop),
                    items,
                    value: items.find((i) => i.value === value) ?? items[0]
                }
            }
        };
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const s = this.settings;
        return {
            cards: [
                {
                    uid: "kpiTextCard", displayName: "Text",
                    groups: [
                        {
                            uid: "kpiFontGroup", displayName: "Font",
                            slices: [{
                                uid: "kpiFontFamilySlice", displayName: "Font family",
                                control: {
                                    type: powerbi.visuals.FormattingComponent.FontPicker,
                                    properties: { descriptor: Visual.desc("fontFamily"), value: s.fontFamily }
                                }
                            }]
                        },
                        {
                            uid: "kpiValueTextGroup", displayName: "Value",
                            slices: [
                                this.numSlice("kpiFontSizeSlice", "Font size", "fontSize", s.fontSize, 4, 200, "px"),
                                this.colorSlice("kpiValueColorSlice", "Colour", "valueColor", s.valueColor)
                            ]
                        },
                        {
                            uid: "kpiCaptionGroup", displayName: "Caption",
                            slices: [
                                this.textSlice("kpiCaptionSlice", "Caption text", "caption", s.caption, "e.g. Revenue"),
                                this.numSlice("kpiCaptionSizeSlice", "Font size", "captionSize", s.captionSize, 4, 200, "px"),
                                this.colorSlice("kpiCaptionColorSlice", "Colour", "captionColor", s.captionColor)
                            ]
                        },
                        {
                            uid: "kpiSubtitleGroup", displayName: "Subtitle",
                            slices: [
                                this.numSlice("kpiSubtitleSizeSlice", "Font size", "subtitleSize", s.subtitleSize, 4, 200, "px"),
                                this.colorSlice("kpiSubtitleColorSlice", "Colour", "subtitleColor", s.subtitleColor)
                            ]
                        }
                    ]
                },
                {
                    uid: "kpiFormatCard", displayName: "Value format",
                    groups: [{
                        uid: "kpiFormatGroup", displayName: "Value format",
                        slices: [
                            this.dropdownSlice("kpiValueFormatSlice", "Format", "valueFormat", s.valueFormat, [
                                { value: "number", displayName: "Number" },
                                { value: "currency", displayName: "Currency" },
                                { value: "percent", displayName: "Percentage" },
                                { value: "decimal1", displayName: "Decimal" }
                            ]),
                            this.textSlice("kpiCurrencySlice", "Currency code", "currencyCode", s.currencyCode, "USD"),
                            this.numSlice("kpiDecimalsSlice", "Decimal places", "decimals", s.decimals ?? 0, 0, 4),
                            this.toggleSlice("kpiCompactSlice", "Compact notation", "compact", s.compact)
                        ]
                    }]
                },
                {
                    uid: "kpiDeltaCard", displayName: "Delta badge",
                    groups: [
                        {
                            uid: "kpiDeltaBehaviourGroup", displayName: "Behaviour",
                            slices: [
                                this.dropdownSlice("kpiDirectionSlice", "Good direction", "direction", s.direction, [
                                    { value: "up", displayName: "Up is good" },
                                    { value: "down", displayName: "Down is good" },
                                    { value: "neutral", displayName: "Neutral" }
                                ]),
                                this.dropdownSlice("kpiDeltaFormatSlice", "Delta format", "deltaFormat", s.deltaFormat, [
                                    { value: "auto", displayName: "Follow value format" },
                                    { value: "percent", displayName: "Percentage points (pp)" },
                                    { value: "percentChange", displayName: "Percent change (%)" },
                                    { value: "currency", displayName: "Currency" }
                                ])
                            ]
                        },
                        {
                            uid: "kpiIndicatorGroup", displayName: "Appearance",
                            slices: [
                                this.numSlice("kpiDeltaSizeSlice", "Font size", "deltaSize", s.deltaSize, 4, 200, "px"),
                                this.colorSlice("kpiGoodSlice", "Up / good", "goodColor", s.goodColor),
                                this.colorSlice("kpiBadSlice", "Down / bad", "badColor", s.badColor),
                                this.colorSlice("kpiNeutralSlice", "Neutral", "neutralColor", s.neutralColor)
                            ]
                        }
                    ]
                },
                {
                    uid: "kpiAccentCard", displayName: "Accent bar",
                    groups: [{
                        uid: "kpiAccentGroup", displayName: "Accent bar",
                        slices: [this.colorSlice("kpiAccentSlice", "Colour", "accentColor", s.accentColor)]
                    }]
                },
                {
                    uid: "kpiHeaderCard", displayName: "Header mode",
                    groups: [{
                        uid: "kpiHeaderGroup", displayName: "Header mode",
                        slices: [
                            this.toggleSlice("kpiHeaderModeSlice", "Render caption as header", "headerMode", s.headerMode),
                            this.numSlice("kpiHeaderSizeSlice", "Font size", "headerSize", s.headerSize, 4, 200, "px"),
                            this.colorSlice("kpiHeaderColorSlice", "Text colour", "headerColor", s.headerColor),
                            this.colorSlice("kpiHeaderBgSlice", "Background", "headerBg", s.headerBg)
                        ]
                    }]
                },
                {
                    uid: "kpiLayoutCard", displayName: "Layout",
                    groups: [{
                        uid: "kpiLayoutGroup", displayName: "Layout",
                        slices: [this.toggleSlice("kpiWrapTextSlice", "Wrap text", "wrapText", s.wrapText)]
                    }]
                },
                {
                    uid: "kpiNoDataCard", displayName: "No data",
                    groups: [{
                        uid: "kpiNoDataGroup", displayName: "No data",
                        slices: [this.textSlice("kpiEmptyDefaultSlice", "Value when empty", "emptyDefault", s.emptyDefault, "0")]
                    }]
                }
            ]
        };
    }
}

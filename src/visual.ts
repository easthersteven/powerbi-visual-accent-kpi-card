"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { formatMainValue, deltaDisplay, resolveEmptyDefault, tooltipItems } from "./logic";

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
    private lastFontSize = 30;
    private lastGood = "#0F7A2C";
    private lastBad = "#9E2F24";
    private lastNeutral = "#605E5C";
    private lastAccent = "#1F908C";
    private lastEmptyDefault = "0";

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
            + "badge, and Subtitle for text beside the value.")));
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

            const dv: DataView = options.dataViews?.[0];
            if (!dv?.categorical?.values?.length) {
                this.renderLandingPage();
                this.events.renderingFinished(options);
                return;
            }

            const vals = dv.categorical.values;
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

            const rawObj = dv.metadata?.objects?.["cardStyle"] as unknown;
            const objects = (Array.isArray(rawObj) ? rawObj[0] : rawObj) as Record<string, unknown>;
            const accentColor = (objects?.accentColor as { solid?: { color?: string } })?.solid?.color || "#1F908C";
            const direction = (objects?.direction as string) || "neutral";
            const caption = (objects?.caption as string) || "";
            const valueFormat = (objects?.valueFormat as string) || "";
            const deltaFormat = (objects?.deltaFormat as string) || "";
            const fmtOpts = {
                currencyCode: (objects?.currencyCode as string) || "",
                compact: (objects?.compact as boolean) || false,
                decimals: objects?.decimals as number,
            };
            const fontSize = (objects?.fontSize as number) ?? 30;
            const goodColor = (objects?.goodColor as { solid?: { color?: string } })?.solid?.color || "#0F7A2C";
            const badColor = (objects?.badColor as { solid?: { color?: string } })?.solid?.color || "#9E2F24";
            const neutralColor = (objects?.neutralColor as { solid?: { color?: string } })?.solid?.color || "#605E5C";
            const emptyDefault = (objects?.emptyDefault as string) ?? "0";

            // High contrast mode: the host palette replaces the configured colours, so the
            // card stays legible under the user's accessibility theme.
            const hc = this.colorPalette?.isHighContrast === true;
            const hcFore = this.colorPalette?.foreground?.value;
            const hcBack = this.colorPalette?.background?.value;
            const accentColorEff = hc ? hcFore : accentColor;
            const goodColorEff = hc ? hcFore : goodColor;
            const badColorEff = hc ? hcFore : badColor;
            const neutralColorEff = hc ? hcFore : neutralColor;
            this.target.style.background = hc ? hcBack : "";
            this.target.style.color = hc ? hcFore : "";
            this.lastFontSize = fontSize; this.lastGood = goodColor; this.lastBad = badColor; this.lastNeutral = neutralColor; this.lastAccent = accentColor;
            this.lastEmptyDefault = emptyDefault;

            // HEADER MODE: render the caption as a crisp DOM header (sharper than native visual titles
            // under page scaling on high-DPI displays). Skips the accent/value/delta entirely.
            const headerMode = (objects?.headerMode as boolean) || false;
            if (headerMode) {
                const hColor = hc ? hcFore : ((objects?.headerColor as { solid?: { color?: string } })?.solid?.color || "#023864");
                const hBg = hc ? hcBack : ((objects?.headerBg as { solid?: { color?: string } })?.solid?.color || "transparent");
                const hSize = (objects?.headerSize as number) ?? 14;
                this.target.style.background = hBg;
                const h = el("div", "kpi-header", caption);
                h.style.color = hColor;
                h.style.fontSize = hSize + "px";
                this.target.appendChild(h);
                this.events.renderingFinished(options);
                return;
            }

            // NO DATA: when the main measure is bound but returns blank (e.g. no rows for the
            // current period), show the configurable default (a numeric default is formatted
            // like a real value, so "0" renders as "0.0%" in percent mode).
            const hasMain = [...vals].some((col) => col.source.roles?.["mainValue"]);
            const formattedValue = mainVal == null && hasMain
                ? resolveEmptyDefault(emptyDefault, valueFormat, this.locale, fmtOpts)
                : formatMainValue(mainVal, valueFormat, this.locale, fmtOpts);

            // Identify the bound measure so the card can cross-filter the page and so the
            // tooltip carries an identity the host can use.
            const queryName = mainCol?.source?.queryName;
            this.selectionId = queryName
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
                if (hc) capEl.style.color = hcFore;
                capEl.style.fontSize = (fontSize * 0.37) + "px";
                body.appendChild(capEl);
            }

            const valueRow = el("div", "kpi-value-row");
            const valEl = el("span", "kpi-value", formattedValue);
            if (hc) valEl.style.color = hcFore;
            valEl.style.fontSize = fontSize + "px";
            valueRow.appendChild(valEl);
            if (subtitleVal != null && subtitleVal !== "") {
                const subEl = el("span", "subtitle-value", String(subtitleVal));
                subEl.style.fontSize = (fontSize * 0.53) + "px";
                valueRow.appendChild(subEl);
            }
            body.appendChild(valueRow);

            if (deltaVal != null) {
                const d = typeof deltaVal === "number" ? deltaVal : parseFloat(String(deltaVal));
                if (!isNaN(d)) {
                    const delta = deltaDisplay(d, direction, valueFormat, this.locale, fmtOpts, deltaFormat);
                    deltaText = delta.text;
                    const deltaEl = el("span", "delta delta-" + delta.kind, delta.text);
                    deltaEl.style.color = delta.kind === "good" ? goodColorEff : delta.kind === "bad" ? badColorEff : neutralColorEff;
                    if (hc) { deltaEl.style.background = hcBack; deltaEl.style.border = "1px solid " + hcFore; }
                    deltaEl.style.fontSize = (fontSize * 0.37) + "px";
                    body.appendChild(deltaEl);
                } else if (typeof deltaVal === "string" && deltaVal.length > 0) {
                    deltaText = String(deltaVal);
                    const dEl = el("span", "delta delta-neutral", String(deltaVal));
                    dEl.style.color = neutralColorEff;
                    if (hc) { dEl.style.background = hcBack; dEl.style.border = "1px solid " + hcFore; }
                    dEl.style.fontSize = (fontSize * 0.37) + "px";
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
            this.target.onmousemove = (ev: MouseEvent) => {
                const rect = this.target.getBoundingClientRect();
                this.tooltipService?.show({
                    coordinates: [ev.clientX - rect.left, ev.clientY - rect.top],
                    isTouchEvent: false,
                    dataItems: items,
                    identities: this.selectionId ? [this.selectionId] : [],
                });
            };

            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return {
            cards: [
                {
                    uid: "kpiTextCard", displayName: "Text",
                    groups: [{
                        uid: "kpiTextGroup", displayName: "Text",
                        slices: [{
                            uid: "kpiFontSizeSlice", displayName: "Value font size",
                            control: {
                                type: powerbi.visuals.FormattingComponent.NumUpDown,
                                properties: { descriptor: { objectName: "cardStyle", propertyName: "fontSize" }, value: this.lastFontSize }
                            }
                        }]
                    }]
                },
                {
                    uid: "kpiNoDataCard", displayName: "No data",
                    groups: [{
                        uid: "kpiNoDataGroup", displayName: "No data",
                        slices: [{
                            uid: "kpiEmptyDefaultSlice", displayName: "Value when empty",
                            control: {
                                type: powerbi.visuals.FormattingComponent.TextInput,
                                properties: { descriptor: { objectName: "cardStyle", propertyName: "emptyDefault" }, value: this.lastEmptyDefault, placeholder: "0" }
                            }
                        }]
                    }]
                },
                {
                    uid: "kpiIndicatorCard", displayName: "Indicators",
                    groups: [{
                        uid: "kpiIndicatorGroup", displayName: "Indicator colours",
                        slices: [
                            {
                                uid: "kpiGoodSlice", displayName: "Up / good",
                                control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: { descriptor: { objectName: "cardStyle", propertyName: "goodColor" }, value: { value: this.lastGood } } }
                            },
                            {
                                uid: "kpiBadSlice", displayName: "Down / bad",
                                control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: { descriptor: { objectName: "cardStyle", propertyName: "badColor" }, value: { value: this.lastBad } } }
                            },
                            {
                                uid: "kpiNeutralSlice", displayName: "Neutral",
                                control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: { descriptor: { objectName: "cardStyle", propertyName: "neutralColor" }, value: { value: this.lastNeutral } } }
                            },
                            {
                                uid: "kpiAccentSlice", displayName: "Accent bar",
                                control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: { descriptor: { objectName: "cardStyle", propertyName: "accentColor" }, value: { value: this.lastAccent } } }
                            }
                        ]
                    }]
                }
            ]
        };
    }
}

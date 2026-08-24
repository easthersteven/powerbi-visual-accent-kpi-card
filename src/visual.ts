"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import { formatMainValue, deltaDisplay, resolveEmptyDefault } from "./logic";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataView = powerbi.DataView;

function el(tag: string, cls?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}

export class Visual implements IVisual {
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
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
        this.selectionManager = options.host.createSelectionManager();
        this.locale = options.host.locale;
        this.target = options.element;
        this.target.classList.add("accent-kpi-card");
        this.target.addEventListener("contextmenu", (ev) => {
            this.selectionManager.showContextMenu({} as unknown as powerbi.visuals.ISelectionId, { x: ev.clientX, y: ev.clientY });
            ev.preventDefault();
        });
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);

        try {
            while (this.target.firstChild) this.target.removeChild(this.target.firstChild);

            const dv: DataView = options.dataViews?.[0];
            if (!dv?.categorical?.values) {
                this.events.renderingFinished(options);
                return;
            }

            const vals = dv.categorical.values;
            let mainVal: powerbi.PrimitiveValue = null;
            let deltaVal: powerbi.PrimitiveValue = null;
            let subtitleVal: powerbi.PrimitiveValue = null;

            for (const col of vals) {
                const role = col.source.roles;
                if (role?.["mainValue"]) mainVal = col.values[0];
                if (role?.["deltaValue"]) deltaVal = col.values[0];
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
            this.lastFontSize = fontSize; this.lastGood = goodColor; this.lastBad = badColor; this.lastNeutral = neutralColor; this.lastAccent = accentColor;
            this.lastEmptyDefault = emptyDefault;

            // HEADER MODE: render the caption as a crisp DOM header (sharper than native visual titles
            // under page scaling on high-DPI displays). Skips the accent/value/delta entirely.
            const headerMode = (objects?.headerMode as boolean) || false;
            if (headerMode) {
                const hColor = (objects?.headerColor as { solid?: { color?: string } })?.solid?.color || "#023864";
                const hBg = (objects?.headerBg as { solid?: { color?: string } })?.solid?.color || "transparent";
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

            const accent = el("div", "kpi-accent");
            accent.style.background = accentColor;
            this.target.appendChild(accent);

            const body = el("div", "kpi-body");

            if (caption) {
                const capEl = el("div", "kpi-caption", caption);
                capEl.style.fontSize = (fontSize * 0.37) + "px";
                body.appendChild(capEl);
            }

            const valueRow = el("div", "kpi-value-row");
            const valEl = el("span", "kpi-value", formattedValue);
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
                    const deltaEl = el("span", "delta delta-" + delta.kind, delta.text);
                    deltaEl.style.color = delta.kind === "good" ? goodColor : delta.kind === "bad" ? badColor : neutralColor;
                    deltaEl.style.fontSize = (fontSize * 0.37) + "px";
                    body.appendChild(deltaEl);
                } else if (typeof deltaVal === "string" && deltaVal.length > 0) {
                    const dEl = el("span", "delta delta-neutral", String(deltaVal));
                    dEl.style.color = neutralColor;
                    dEl.style.fontSize = (fontSize * 0.37) + "px";
                    body.appendChild(dEl);
                }
            }

            this.target.appendChild(body);
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

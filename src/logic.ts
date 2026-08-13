// Pure, testable helpers for the Accent KPI Card visual (no DOM or Power BI dependencies).

// Format the main value according to the card's value format setting.
export function formatMainValue(mainVal: unknown, valueFormat: string, locale?: string): string {
    if (typeof mainVal !== "number" || !isFinite(mainVal)) return mainVal != null ? String(mainVal) : "-";
    if (valueFormat === "percent") return (mainVal * 100).toFixed(1) + "%";
    if (valueFormat === "decimal1") return mainVal.toFixed(1);
    return mainVal.toLocaleString(locale, { maximumFractionDigits: 0 });
}

// Resolve the text to show when the main measure returns blank. A numeric setting
// (e.g. "0") is formatted like a real value so it matches the card's value format;
// any other text is shown as-is. An empty setting falls back to a dash.
export function resolveEmptyDefault(emptyDefault: string, valueFormat: string, locale?: string): string {
    const t = (emptyDefault ?? "").trim();
    if (t === "") return "-";
    const n = Number(t.replace(/,/g, ""));
    return isFinite(n) && t !== "" ? formatMainValue(n, valueFormat, locale) : t;
}

export type DeltaKind = "good" | "bad" | "neutral";
export interface DeltaDisplay { kind: DeltaKind; text: string; }

// Decide the delta badge: arrow, good/bad/neutral kind, and formatted magnitude.
// "direction" is the good direction for the metric: "up", "down", or "neutral".
export function deltaDisplay(d: number, direction: string, valueFormat: string, locale?: string): DeltaDisplay {
    let arrow = "-";
    let kind: DeltaKind = "neutral";
    if (direction === "up") {
        if (d > 0) { arrow = "▲"; kind = "good"; }
        else if (d < 0) { arrow = "▼"; kind = "bad"; }
    } else if (direction === "down") {
        if (d < 0) { arrow = "▼"; kind = "good"; }
        else if (d > 0) { arrow = "▲"; kind = "bad"; }
    } else {
        if (d > 0) arrow = "▲";
        else if (d < 0) arrow = "▼";
    }
    const absVal = Math.abs(d);
    const formatted = valueFormat === "percent"
        ? (absVal * 100).toFixed(1) + "pp"
        : absVal.toLocaleString(locale, { maximumFractionDigits: 1 });
    return { kind, text: arrow + " " + formatted };
}

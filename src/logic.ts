// Pure, testable helpers for the Accent KPI Card visual (no DOM or Power BI dependencies).

// Formatting options that apply on top of the value format setting.
export interface FormatOptions {
    currencyCode?: string;   // ISO 4217 code used by the "currency" format (default USD)
    compact?: boolean;       // abbreviate large numbers: 1284000 -> 1.28M
    decimals?: number;       // 0-4 decimal places; unset keeps each format's own default
}

// Decimal places for a format, honouring an explicit setting when one is given.
// Anything out of range (or unset) leaves the format's own default in place.
export function decimalsOf(opts: FormatOptions | undefined, fallback: number): number {
    const d = opts?.decimals;
    if (typeof d !== "number" || !isFinite(d) || d < 0) return fallback;
    return Math.min(4, Math.floor(d));
}

const DEFAULT_CURRENCY = "USD";

// Intl rejects unknown currency codes and, on older hosts, the compact notation option.
// Any rejection falls back to plain formatting rather than showing a wrong symbol.
function intl(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat | null {
    try {
        return new Intl.NumberFormat(locale, options);
    } catch {
        return null;
    }
}

function currencyOf(opts?: FormatOptions): string {
    const c = (opts?.currencyCode ?? "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(c) ? c : DEFAULT_CURRENCY;
}

// Format the main value according to the card's value format setting.
export function formatMainValue(mainVal: unknown, valueFormat: string, locale?: string, opts?: FormatOptions): string {
    if (typeof mainVal !== "number" || !isFinite(mainVal)) return mainVal != null ? String(mainVal) : "-";
    if (valueFormat === "percent") return (mainVal * 100).toFixed(decimalsOf(opts, 1)) + "%";
    if (valueFormat === "decimal1") return mainVal.toFixed(decimalsOf(opts, 1));

    const compact = !!opts?.compact;
    if (valueFormat === "currency") {
        const dp = decimalsOf(opts, compact ? 2 : 0);
        const f = intl(locale, compact
            ? { style: "currency", currency: currencyOf(opts), notation: "compact", maximumFractionDigits: dp }
            : { style: "currency", currency: currencyOf(opts), minimumFractionDigits: dp, maximumFractionDigits: dp });
        if (f) return f.format(mainVal);
    }
    if (compact) {
        const f = intl(locale, { notation: "compact", maximumFractionDigits: decimalsOf(opts, 2) });
        if (f) return f.format(mainVal);
    }
    const dp = decimalsOf(opts, 0);
    return mainVal.toLocaleString(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Resolve the text to show when the main measure returns blank. A numeric setting
// (e.g. "0") is formatted like a real value so it matches the card's value format;
// any other text is shown as-is. An empty setting falls back to a dash.
export function resolveEmptyDefault(emptyDefault: string, valueFormat: string, locale?: string, opts?: FormatOptions): string {
    const t = (emptyDefault ?? "").trim();
    if (t === "") return "-";
    const n = Number(t.replace(/,/g, ""));
    return isFinite(n) && t !== "" ? formatMainValue(n, valueFormat, locale, opts) : t;
}

export type DeltaKind = "good" | "bad" | "neutral";
export interface DeltaDisplay { kind: DeltaKind; text: string; }

// Decide the delta badge: arrow, good/bad/neutral kind, and formatted magnitude.
// "direction" is the good direction for the metric: "up", "down", or "neutral".
// "deltaFormat" overrides how the magnitude reads, so a currency card can carry a
// percentage delta ("revenue is $1.28M, up 4.2%"); empty means follow the value format.
export function deltaDisplay(
    d: number,
    direction: string,
    valueFormat: string,
    locale?: string,
    opts?: FormatOptions,
    deltaFormat?: string,
): DeltaDisplay {
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
    const fmt = (deltaFormat ?? "").trim() || valueFormat;
    let formatted: string;
    if (fmt === "percent") {
        // A change in a rate is measured in percentage points, not percent.
        formatted = (absVal * 100).toFixed(decimalsOf(opts, 1)) + "pp";
    } else if (fmt === "percentChange") {
        // A proportional change in an absolute quantity, e.g. revenue up 4.2%.
        formatted = (absVal * 100).toFixed(decimalsOf(opts, 1)) + "%";
    } else if (fmt === "currency") {
        formatted = formatMainValue(absVal, "currency", locale, opts);
    } else if (opts?.compact) {
        formatted = formatMainValue(absVal, "", locale, opts);
    } else {
        const dp = decimalsOf(opts, 1);
        formatted = absVal.toLocaleString(locale, { maximumFractionDigits: dp });
    }
    return { kind, text: arrow + " " + formatted };
}

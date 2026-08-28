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

export interface TooltipItem { displayName: string; value: string; }
export interface TooltipInput {
    caption?: string;          // the card's caption, used as the tooltip title
    valueName?: string;        // display name of the bound measure
    formattedValue: string;    // the value exactly as the card renders it
    subtitle?: string;
    deltaText?: string;        // the delta badge text, arrow included
    deltaName?: string;        // display name of the bound delta measure
}

// Build the tooltip rows for the card. Only rows with content are shown, so a card bound to
// a value alone gets a one-row tooltip rather than a list of blanks.
export function tooltipItems(input: TooltipInput): TooltipItem[] {
    const items: TooltipItem[] = [];
    const name = (input.valueName ?? "").trim() || (input.caption ?? "").trim() || "Value";
    items.push({ displayName: name, value: input.formattedValue });
    const sub = (input.subtitle ?? "").trim();
    if (sub) items.push({ displayName: "Subtitle", value: sub });
    const delta = (input.deltaText ?? "").trim();
    if (delta) items.push({ displayName: (input.deltaName ?? "").trim() || "Change", value: delta });
    return items;
}

// ---------------------------------------------------------------------------
// Format pane settings
// ---------------------------------------------------------------------------

// Every property the Format pane can set, resolved to a concrete value. The visual reads
// this once per update and hands the same object to getFormattingModel, so the pane always
// shows what the card is actually rendering.
export interface CardSettings {
    fontFamily: string;
    fontSize: number;
    valueColor: string;
    caption: string;
    captionSize: number;
    captionColor: string;
    subtitleSize: number;
    subtitleColor: string;
    deltaSize: number;
    accentColor: string;
    direction: string;
    valueFormat: string;
    deltaFormat: string;
    currencyCode: string;
    compact: boolean;
    decimals: number | undefined;
    emptyDefault: string;
    goodColor: string;
    badColor: string;
    neutralColor: string;
    headerMode: boolean;
    headerColor: string;
    headerSize: number;
    headerBg: string;
    wrapText: boolean;
}

export const CARD_DEFAULTS: Readonly<CardSettings> = Object.freeze({
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    fontSize: 30,
    valueColor: "#023864",
    caption: "",
    captionSize: 11,
    captionColor: "#023864",
    subtitleSize: 16,
    subtitleColor: "#605E5C",
    deltaSize: 11,
    accentColor: "#1F908C",
    direction: "neutral",
    valueFormat: "number",
    deltaFormat: "auto",
    currencyCode: "",
    compact: false,
    decimals: undefined,
    emptyDefault: "0",
    goodColor: "#0F7A2C",
    badColor: "#9E2F24",
    neutralColor: "#605E5C",
    headerMode: false,
    headerColor: "#023864",
    headerSize: 14,
    headerBg: "transparent",
    wrapText: false,
});

type Raw = Record<string, unknown> | undefined;

function colorOf(raw: Raw, key: string, fallback: string): string {
    const c = (raw?.[key] as { solid?: { color?: string } })?.solid?.color;
    return typeof c === "string" && c !== "" ? c : fallback;
}

// Sizes come back from the pane as numbers but a hand-edited theme file can supply anything.
// Out-of-range values fall back to the default rather than rendering an unreadable card.
function sizeOf(raw: Raw, key: string, fallback: number): number {
    const n = raw?.[key];
    if (typeof n !== "number" || !isFinite(n) || n < 4 || n > 200) return fallback;
    return n;
}

function textOf(raw: Raw, key: string, fallback: string): string {
    const t = raw?.[key];
    return typeof t === "string" && t !== "" ? t : fallback;
}

// Read the cardStyle object off the dataView metadata. Power BI hands the object back as
// either a bare object or a single-element array depending on the host, so both are accepted.
export function readSettings(rawObjects: unknown): CardSettings {
    const raw = (Array.isArray(rawObjects) ? rawObjects[0] : rawObjects) as Raw;
    const d = CARD_DEFAULTS;
    return {
        fontFamily: textOf(raw, "fontFamily", d.fontFamily),
        fontSize: sizeOf(raw, "fontSize", d.fontSize),
        valueColor: colorOf(raw, "valueColor", d.valueColor),
        caption: typeof raw?.["caption"] === "string" ? (raw["caption"] as string) : d.caption,
        captionSize: sizeOf(raw, "captionSize", d.captionSize),
        captionColor: colorOf(raw, "captionColor", d.captionColor),
        subtitleSize: sizeOf(raw, "subtitleSize", d.subtitleSize),
        subtitleColor: colorOf(raw, "subtitleColor", d.subtitleColor),
        deltaSize: sizeOf(raw, "deltaSize", d.deltaSize),
        accentColor: colorOf(raw, "accentColor", d.accentColor),
        direction: textOf(raw, "direction", d.direction),
        valueFormat: textOf(raw, "valueFormat", d.valueFormat),
        deltaFormat: textOf(raw, "deltaFormat", d.deltaFormat),
        currencyCode: typeof raw?.["currencyCode"] === "string" ? (raw["currencyCode"] as string) : d.currencyCode,
        compact: raw?.["compact"] === true,
        decimals: typeof raw?.["decimals"] === "number" ? (raw["decimals"] as number) : d.decimals,
        emptyDefault: typeof raw?.["emptyDefault"] === "string" ? (raw["emptyDefault"] as string) : d.emptyDefault,
        goodColor: colorOf(raw, "goodColor", d.goodColor),
        badColor: colorOf(raw, "badColor", d.badColor),
        neutralColor: colorOf(raw, "neutralColor", d.neutralColor),
        headerMode: raw?.["headerMode"] === true,
        headerColor: colorOf(raw, "headerColor", d.headerColor),
        headerSize: sizeOf(raw, "headerSize", d.headerSize),
        headerBg: colorOf(raw, "headerBg", d.headerBg),
        wrapText: raw?.["wrapText"] === true,
    };
}

// "auto" means the delta badge follows the value format; logic below keys off an empty string.
export function effectiveDeltaFormat(deltaFormat: string): string {
    return deltaFormat === "auto" ? "" : deltaFormat;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMainValue, deltaDisplay, resolveEmptyDefault, tooltipItems } from "../.tmp/test-build/logic.js";

test("formatMainValue formats percent values", () => {
    assert.equal(formatMainValue(0.825, "percent"), "82.5%");
    assert.equal(formatMainValue(1.25, "percent"), "125.0%");
});

test("formatMainValue formats one-decimal values", () => {
    assert.equal(formatMainValue(3.14159, "decimal1"), "3.1");
});

test("formatMainValue defaults to whole numbers with grouping", () => {
    assert.equal(formatMainValue(1234.6, "", "en-US"), "1,235");
});

test("formatMainValue passes strings through and shows a dash for null", () => {
    assert.equal(formatMainValue("n/a", "percent"), "n/a");
    assert.equal(formatMainValue(null, ""), "-");
    assert.equal(formatMainValue(undefined, ""), "-");
});

test("resolveEmptyDefault formats numeric defaults like real values", () => {
    assert.equal(resolveEmptyDefault("0", "percent"), "0.0%");
    assert.equal(resolveEmptyDefault("0", "", "en-US"), "0");
    assert.equal(resolveEmptyDefault("1,000", "", "en-US"), "1,000");
});

test("resolveEmptyDefault passes non-numeric text through", () => {
    assert.equal(resolveEmptyDefault("n/a", "percent"), "n/a");
});

test("resolveEmptyDefault falls back to a dash when the setting is empty", () => {
    assert.equal(resolveEmptyDefault("", "percent"), "-");
    assert.equal(resolveEmptyDefault("   ", ""), "-");
});

test("deltaDisplay marks increases as good when up is good", () => {
    const d = deltaDisplay(0.05, "up", "percent");
    assert.equal(d.kind, "good");
    assert.equal(d.text, "▲ 5.0pp");
});

test("deltaDisplay marks increases as bad when down is good", () => {
    const d = deltaDisplay(0.05, "down", "percent");
    assert.equal(d.kind, "bad");
    assert.equal(d.text, "▲ 5.0pp");
});

test("deltaDisplay marks decreases as good when down is good", () => {
    const d = deltaDisplay(-2.5, "down", "", "en-US");
    assert.equal(d.kind, "good");
    assert.equal(d.text, "▼ 2.5");
});

test("deltaDisplay is neutral without a direction", () => {
    assert.equal(deltaDisplay(3, "neutral", "", "en-US").kind, "neutral");
    assert.equal(deltaDisplay(3, "neutral", "", "en-US").text, "▲ 3");
    assert.equal(deltaDisplay(-3, "", "", "en-US").text, "▼ 3");
});

test("deltaDisplay shows a dash arrow for zero", () => {
    assert.equal(deltaDisplay(0, "up", "", "en-US").text, "- 0");
    assert.equal(deltaDisplay(0, "up", "", "en-US").kind, "neutral");
});

test("formatMainValue formats currency with the host locale", () => {
    assert.equal(formatMainValue(1284000, "currency", "en-US", { currencyCode: "USD" }), "$1,284,000");
    assert.equal(formatMainValue(1284000, "currency", "en-AU", { currencyCode: "AUD" }), "$1,284,000");
    assert.equal(formatMainValue(1284000, "currency", "en-US", { currencyCode: "GBP" }), "£1,284,000");
});

test("formatMainValue abbreviates large numbers when compact is set", () => {
    assert.equal(formatMainValue(1284000, "currency", "en-US", { currencyCode: "USD", compact: true }), "$1.28M");
    assert.equal(formatMainValue(1284000, "", "en-US", { compact: true }), "1.28M");
    assert.equal(formatMainValue(37, "", "en-US", { compact: true }), "37");
});

test("formatMainValue falls back to a plain number for an invalid currency code", () => {
    assert.equal(formatMainValue(1234, "currency", "en-US", { currencyCode: "not a code" }), "$1,234");
    assert.equal(formatMainValue(1234, "currency", "en-US", {}), "$1,234");
});

test("resolveEmptyDefault formats a numeric default as currency", () => {
    assert.equal(resolveEmptyDefault("0", "currency", "en-US", { currencyCode: "USD" }), "$0");
});

test("deltaDisplay reports percent deltas in percentage points", () => {
    assert.equal(deltaDisplay(0.011, "up", "percent").text, "▲ 1.1pp");
});

test("deltaDisplay can carry a percentage change on a currency card", () => {
    const d = deltaDisplay(0.042, "up", "currency", "en-US", { currencyCode: "AUD" }, "percentChange");
    assert.equal(d.text, "▲ 4.2%");
    assert.equal(d.kind, "good");
});

test("deltaDisplay formats a currency delta as currency", () => {
    const d = deltaDisplay(-52000, "up", "currency", "en-US", { currencyCode: "USD", compact: true });
    assert.equal(d.text, "▼ $52K");
    assert.equal(d.kind, "bad");
});

test("deltaDisplay follows the value format when no delta format is set", () => {
    assert.equal(deltaDisplay(12, "down", "", "en-US").text, "▲ 12");
});

test("decimals setting tailors precision in every format", () => {
    assert.equal(formatMainValue(0.96449, "percent", "en-US", { decimals: 0 }), "96%");
    assert.equal(formatMainValue(0.96449, "percent", "en-US", { decimals: 2 }), "96.45%");
    assert.equal(formatMainValue(1234.567, "", "en-US", { decimals: 2 }), "1,234.57");
    assert.equal(formatMainValue(1234.5, "", "en-US", { decimals: 0 }), "1,235");
    assert.equal(formatMainValue(1234.5, "currency", "en-US", { currencyCode: "USD", decimals: 2 }), "$1,234.50");
    assert.equal(formatMainValue(3.14159, "decimal1", "en-US", { decimals: 3 }), "3.142");
});

test("decimals is clamped and ignored when unset or invalid", () => {
    assert.equal(formatMainValue(1.23456789, "decimal1", "en-US", { decimals: 9 }), "1.2346");
    assert.equal(formatMainValue(0.825, "percent", "en-US", {}), "82.5%");
    assert.equal(formatMainValue(0.825, "percent", "en-US", { decimals: -1 }), "82.5%");
    assert.equal(formatMainValue(1234.6, "", "en-US"), "1,235");
});

test("decimals applies to the delta badge too", () => {
    assert.equal(deltaDisplay(0.011, "up", "percent", "en-US", { decimals: 2 }).text, "▲ 1.10pp");
    assert.equal(deltaDisplay(0.042, "up", "currency", "en-US", { decimals: 0 }, "percentChange").text, "▲ 4%");
});

test("tooltipItems always reports the value, named after the measure", () => {
    const items = tooltipItems({ valueName: "Revenue", formattedValue: "$1.28M" });
    assert.deepEqual(items, [{ displayName: "Revenue", value: "$1.28M" }]);
});

test("tooltipItems falls back to the caption, then to a generic name", () => {
    assert.equal(tooltipItems({ caption: "Revenue", formattedValue: "1" })[0].displayName, "Revenue");
    assert.equal(tooltipItems({ formattedValue: "1" })[0].displayName, "Value");
});

test("tooltipItems includes subtitle and delta only when present", () => {
    const full = tooltipItems({
        valueName: "Revenue", formattedValue: "$1.28M", subtitle: "YTD",
        deltaText: "▲ 4.2%", deltaName: "Revenue change",
    });
    assert.deepEqual(full.map((i) => i.displayName), ["Revenue", "Subtitle", "Revenue change"]);
    assert.equal(full[2].value, "▲ 4.2%");
    const bare = tooltipItems({ formattedValue: "0", subtitle: "  ", deltaText: "" });
    assert.equal(bare.length, 1);
});

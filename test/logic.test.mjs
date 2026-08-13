import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMainValue, deltaDisplay, resolveEmptyDefault } from "../.tmp/test-build/logic.js";

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

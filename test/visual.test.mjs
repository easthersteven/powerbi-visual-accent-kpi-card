import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;

const { Visual } = await import("../.tmp/test-build/visual.js");

function makeHost(captured) {
    return {
        eventService: {
            renderingStarted: () => captured.events.push("started"),
            renderingFinished: () => captured.events.push("finished"),
            renderingFailed: (_o, e) => captured.events.push("failed:" + e)
        },
        createSelectionManager: () => ({
            showContextMenu: () => { captured.contextMenus++; },
            select: (id, multi) => { captured.selected.push({ id, multi }); captured.ids = [id]; return Promise.resolve([id]); },
            clear: () => { captured.cleared++; captured.ids = []; return Promise.resolve(); },
            getSelectionIds: () => captured.ids,
            registerOnSelectCallback: (cb) => { captured.onSelect = cb; }
        }),
        tooltipService: {
            show: (o) => { captured.tooltips.push(o); },
            hide: () => { captured.tooltipHides++; }
        },
        colorPalette: captured.palette,
        get hostCapabilities() { return captured.hostCapabilities; },
        createSelectionIdBuilder: () => ({
            withMeasure: (queryName) => ({ createSelectionId: () => ({ measure: queryName }) })
        }),
        locale: "en-US"
    };
}

function makeVisual(highContrast = false) {
    const captured = {
        events: [], contextMenus: 0, tooltips: [], tooltipHides: 0, selected: [], cleared: 0, ids: [],
        palette: { isHighContrast: false, foreground: { value: "#ffffff" }, background: { value: "#000000" } }
    };
    const element = document.createElement("div");
    document.body.appendChild(element);
    captured.palette.isHighContrast = highContrast;
    const visual = new Visual({ host: makeHost(captured), element });
    return { visual, element, captured };
}

function dataView({ main, delta, subtitle, objects } = {}) {
    const values = [];
    if (main !== undefined) values.push({ source: { roles: { mainValue: true }, queryName: "Sales.Revenue", displayName: "Revenue" }, values: [main] });
    if (delta !== undefined) values.push({ source: { roles: { deltaValue: true }, queryName: "Sales.Change", displayName: "Revenue change" }, values: [delta] });
    if (subtitle !== undefined) values.push({ source: { roles: { subtitle: true } }, values: [subtitle] });
    return { metadata: { objects }, categorical: { values } };
}

test("renders a percent-formatted value with caption and a good delta badge", () => {
    const { visual, element, captured } = makeVisual();
    const objects = { cardStyle: { caption: "Completion rate", valueFormat: "percent", direction: "up" } };
    visual.update({ dataViews: [dataView({ main: 0.82, delta: 0.05, objects })] });
    assert.equal(element.querySelector(".kpi-value").textContent, "82.0%");
    assert.equal(element.querySelector(".kpi-caption").textContent, "Completion rate");
    const badge = element.querySelector(".delta");
    assert.equal(badge.textContent, "▲ 5.0pp");
    assert.equal(badge.classList.contains("delta-good"), true);
    assert.deepEqual(captured.events, ["started", "finished"]);
});

test("renders the subtitle next to the value", () => {
    const { visual, element } = makeVisual();
    visual.update({ dataViews: [dataView({ main: 12, subtitle: "of 20 sites" })] });
    assert.equal(element.querySelector(".subtitle-value").textContent, "of 20 sites");
});

test("inverts delta colouring when down is good", () => {
    const { visual, element } = makeVisual();
    const objects = { cardStyle: { valueFormat: "percent", direction: "down" } };
    visual.update({ dataViews: [dataView({ main: 0.3, delta: -0.02, objects })] });
    const badge = element.querySelector(".delta");
    assert.equal(badge.classList.contains("delta-good"), true);
    assert.equal(badge.textContent, "▼ 2.0pp");
});

test("renders a non-numeric delta string as a neutral badge", () => {
    const { visual, element } = makeVisual();
    visual.update({ dataViews: [dataView({ main: 5, delta: "no change" })] });
    const badge = element.querySelector(".delta");
    assert.equal(badge.classList.contains("delta-neutral"), true);
    assert.equal(badge.textContent, "no change");
});

test("header mode renders only the header element", () => {
    const { visual, element } = makeVisual();
    const objects = { cardStyle: { headerMode: true, caption: "Section title", headerSize: 16 } };
    visual.update({ dataViews: [dataView({ main: 5, objects })] });
    const header = element.querySelector(".kpi-header");
    assert.equal(header.textContent, "Section title");
    assert.equal(element.querySelector(".kpi-value"), null);
    assert.equal(element.querySelector(".kpi-accent"), null);
});

test("shows a formatted zero when the main measure returns blank", () => {
    const { visual, element } = makeVisual();
    const objects = { cardStyle: { caption: "Attendance", valueFormat: "percent" } };
    visual.update({ dataViews: [dataView({ main: null, objects })] });
    assert.equal(element.querySelector(".kpi-value").textContent, "0.0%");
    assert.equal(element.querySelector(".kpi-caption").textContent, "Attendance");
});

test("uses the configured empty default from the Format pane", () => {
    const { visual, element } = makeVisual();
    const objects = { cardStyle: { emptyDefault: "n/a" } };
    visual.update({ dataViews: [dataView({ main: null, objects })] });
    assert.equal(element.querySelector(".kpi-value").textContent, "n/a");
});

test("shows the landing page instead of an empty card when there is no data", () => {
    const { visual, element, captured } = makeVisual();
    visual.update({ dataViews: [] });
    assert.ok(element.querySelector(".kpi-landing-title"), "landing page renders");
    assert.equal(element.querySelector(".kpi-value"), null, "no value is rendered");
    assert.deepEqual(captured.events, ["started", "finished"]);
});

test("getFormattingModel exposes text, no-data, and indicator cards", () => {
    const { visual } = makeVisual();
    assert.equal(visual.getFormattingModel().cards.length, 3);
});

test("right-click opens the context menu", () => {
    const { visual, element, captured } = makeVisual();
    visual.update({ dataViews: [dataView({ main: 1 })] });
    element.dispatchEvent(new dom.window.MouseEvent("contextmenu", { bubbles: true }));
    assert.equal(captured.contextMenus, 1);
});

// ---- certification policy 1180.2.2.x -------------------------------------------------

test("scrolls rather than clipping when the host shrinks the visual (1180.2.2)", async () => {
    const { readFileSync } = await import("node:fs");
    const less = readFileSync(new URL("../style/visual.less", import.meta.url), "utf8");
    const root = less.slice(less.indexOf(".accent-kpi-card"), less.indexOf(".kpi-accent"));
    assert.match(root, /overflow:\s*auto/, "the root container must scroll, not clip");
    assert.doesNotMatch(root, /overflow:\s*hidden/, "overflow:hidden clips content when resized");
});

test("shows a tooltip naming the measures on hover (1180.2.2.2)", () => {
    const { visual, element, captured } = makeVisual();
    const objects = { cardStyle: { caption: "Revenue", direction: "up" } };
    visual.update({ dataViews: [dataView({ main: 1284000, delta: 0.042, subtitle: "YTD", objects })] });
    element.dispatchEvent(new dom.window.MouseEvent("mousemove", { clientX: 10, clientY: 12 }));
    assert.equal(captured.tooltips.length, 1);
    const shown = captured.tooltips[0];
    assert.deepEqual(shown.dataItems.map((i) => i.displayName), ["Revenue", "Subtitle", "Revenue change"]);
    assert.equal(shown.dataItems[0].value, "1,284,000");
    assert.equal(shown.identities.length, 1);
    element.dispatchEvent(new dom.window.MouseEvent("mouseleave"));
    assert.ok(captured.tooltipHides > 0);
});

test("clicking the card cross-filters, clicking again clears it (1180.2.2.3)", async () => {
    const { visual, element, captured } = makeVisual();
    visual.update({ dataViews: [dataView({ main: 42 })] });
    element.dispatchEvent(new dom.window.MouseEvent("click"));
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(captured.selected.length, 1);
    assert.equal(captured.selected[0].id.measure, "Sales.Revenue");
    assert.equal(element.classList.contains("selected"), true);
    element.dispatchEvent(new dom.window.MouseEvent("click"));
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(captured.cleared, 1);
    assert.equal(element.classList.contains("selected"), false);
});

test("does not attempt to select when no measure is bound", async () => {
    const { visual, element, captured } = makeVisual();
    visual.update({ dataViews: [{ metadata: {}, categorical: { values: [] } }] });
    element.dispatchEvent(new dom.window.MouseEvent("click"));
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(captured.selected.length, 0);
});

test("keyboard: Enter and Space activate the card so filtering works without a mouse", async () => {
    const { visual, element, captured } = makeVisual();
    visual.update({ dataViews: [dataView({ main: 42 })] });
    assert.equal(element.getAttribute("role"), "button");
    assert.equal(element.tabIndex, 0);
    element.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter" }));
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(captured.selected.length, 1);
});

test("high contrast: colours come from the host palette, not the Format pane", () => {
    const { visual, element } = makeVisual(true);
    const objects = { cardStyle: { caption: "Revenue", accentColor: { solid: { color: "#1F908C" } }, direction: "up" } };
    visual.update({ dataViews: [dataView({ main: 100, delta: 5, objects })] });
    assert.equal(element.style.background, "rgb(0, 0, 0)");
    assert.equal(element.querySelector(".kpi-accent").style.background, "rgb(255, 255, 255)");
    assert.equal(element.querySelector(".kpi-value").style.color, "rgb(255, 255, 255)");
    assert.equal(element.querySelector(".delta").style.color, "rgb(255, 255, 255)");
});

test("bad data: null, infinity and wrong types do not break the card", () => {
    for (const bad of [Infinity, -Infinity, NaN, "not a number", null]) {
        const { visual, element } = makeVisual();
        visual.update({ dataViews: [dataView({ main: bad, delta: bad })] });
        assert.ok(element.querySelector(".kpi-value"), "a value element renders for " + String(bad));
    }
});

test("landing page explains the visual when no fields are bound", () => {
    const { visual, element } = makeVisual();
    visual.update({ dataViews: [{ metadata: {}, categorical: { values: [] } }] });
    assert.ok(element.querySelector(".kpi-landing-title"), "landing page renders");
    assert.match(element.querySelector(".kpi-landing-body").textContent, /Add a measure/);
});

test("shows the highlighted figure when another visual highlights a subset", () => {
    const { visual, element } = makeVisual();
    const values = [{ source: { roles: { mainValue: true }, queryName: "Sales.Revenue", displayName: "Revenue" }, values: [1000], highlights: [250] }];
    visual.update({ dataViews: [{ metadata: {}, categorical: { values } }] });
    assert.equal(element.querySelector(".kpi-value").textContent, "250");
});

test("respects Edit interactions being turned off", async () => {
    const { visual, element, captured } = makeVisual();
    captured.hostCapabilities = { allowInteractions: false };
    visual.update({ dataViews: [dataView({ main: 42 })] });
    element.dispatchEvent(new dom.window.MouseEvent("click"));
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(captured.selected.length, 0, "clicking must not filter when interactions are off");
});

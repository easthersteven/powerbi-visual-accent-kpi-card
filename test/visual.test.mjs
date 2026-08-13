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
            showContextMenu: () => { captured.contextMenus++; }
        }),
        locale: "en-US"
    };
}

function makeVisual() {
    const captured = { events: [], contextMenus: 0 };
    const element = document.createElement("div");
    document.body.appendChild(element);
    const visual = new Visual({ host: makeHost(captured), element });
    return { visual, element, captured };
}

function dataView({ main, delta, subtitle, objects } = {}) {
    const values = [];
    if (main !== undefined) values.push({ source: { roles: { mainValue: true } }, values: [main] });
    if (delta !== undefined) values.push({ source: { roles: { deltaValue: true } }, values: [delta] });
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

test("finishes rendering without content when there is no data", () => {
    const { visual, element, captured } = makeVisual();
    visual.update({ dataViews: [] });
    assert.equal(element.childNodes.length, 0);
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

const test = require("node:test");
const assert = require("node:assert/strict");

const { selectEnding } = require("../ghost-story/ending-selector");

test("ending selector returns perfect only for full accuracy", () => {
  assert.equal(selectEnding(1), "perfect");
});

test("ending selector returns partial for mid accuracy", () => {
  assert.equal(selectEnding(0.5), "partial");
  assert.equal(selectEnding(0.75), "partial");
});

test("ending selector returns failed below partial threshold", () => {
  assert.equal(selectEnding(0.49), "failed");
  assert.equal(selectEnding(0), "failed");
});

const test = require("node:test");
const assert = require("node:assert/strict");

const TEMPLATES = require("../templates");

test("every fillword template exposes supported counts and variant assignments", () => {
  assert.ok(Array.isArray(TEMPLATES));
  assert.ok(TEMPLATES.length >= 6);

  for (const template of TEMPLATES) {
    assert.equal(typeof template.id, "string");
    assert.equal(typeof template.title, "string");
    assert.ok(Array.isArray(template.supportedPlayerCounts));
    assert.ok(template.supportedPlayerCounts.length > 0);
    assert.equal(typeof template.variants, "object");
    assert.ok(Array.isArray(template.fields));
    assert.equal(typeof template.script, "string");

    for (const count of template.supportedPlayerCounts) {
      const variant = template.variants[count];
      assert.ok(variant, `missing variant for ${template.id}:${count}`);
      assert.equal(typeof variant.resultTitle, "string");
      assert.equal(typeof variant.script, "string");
      assert.ok(Array.isArray(variant.promptGroups));
      assert.ok(variant.promptGroups.length > 0);
      assert.ok(variant[count]);
      assert.ok(Array.isArray(variant[count].assignments));
      assert.equal(variant[count].assignments.length, count);
    }
  }
});

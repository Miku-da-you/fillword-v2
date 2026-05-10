const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.join(__dirname, "..", "..");

test("root workspace stays on the clean 1.0 baseline instead of the deprecated multi-mode layout", () => {
  const deprecatedPaths = [
    "public/scripts/shared/content",
    "public/scripts/shared/game-catalog.js",
    "public/scripts/shared/mode-definitions.js",
    "public/scripts/shared/result-renderers.js",
    "public/scripts/pages/player-mode-renderers.js",
    "server/game-modes",
    "server/tests/mode-registry.test.js",
    "server/tests/turtle-soup-mode.test.js",
    "server/tests/ghost-story-mode.test.js",
    "server/tests/server-flow-modes.test.js"
  ];

  deprecatedPaths.forEach(relativePath => {
    assert.equal(
      fs.existsSync(path.join(workspaceRoot, relativePath)),
      false,
      relativePath + " should not exist in the restored 1.0 baseline"
    );
  });

  const hostHtml = fs.readFileSync(path.join(workspaceRoot, "public", "host.html"), "utf8");
  assert.equal(hostHtml.includes("game-catalog.js"), false);
  assert.equal(hostHtml.includes("mode-definitions.js"), false);
  assert.equal(hostHtml.includes("result-renderers.js"), false);
  assert.equal(hostHtml.includes("./scripts/shared/content/"), false);
});

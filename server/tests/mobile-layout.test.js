const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.join(__dirname, "..", "..");

function readPublicFile(name) {
  return fs.readFileSync(path.join(workspaceRoot, "public", name), "utf8");
}

test("host and player pages redirect into the unified mobile-first app shell", () => {
  const hostHtml = readPublicFile("host.html");
  const playerHtml = readPublicFile("player.html");

  assert.match(hostHtml, /app\.html/);
  assert.match(hostHtml, /window\.location\.replace/);

  assert.match(playerHtml, /app\.html/);
  assert.match(playerHtml, /window\.location\.replace/);
});

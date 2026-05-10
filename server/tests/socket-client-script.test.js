const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.join(__dirname, "..", "..");

function readPublicFile(name) {
  return fs.readFileSync(path.join(workspaceRoot, "public", name), "utf8");
}

test("host and player pages include the Socket.IO browser client before app socket wrapper", () => {
  const hostHtml = readPublicFile("host.html");
  const playerHtml = readPublicFile("player.html");

  for (const html of [hostHtml, playerHtml]) {
    assert.match(html, /app\.html/);
    assert.ok(/redirect|location|replace/.test(html));
  }
});

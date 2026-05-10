const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.join(__dirname, "..", "..");

function readFile(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

test("server startup logs expose only the unified app entry", () => {
  const serverSource = readFile(path.join("server", "server.js"));

  assert.match(serverSource, /统一入口/);
  assert.doesNotMatch(serverSource, /兼容主持人入口/);
  assert.doesNotMatch(serverSource, /兼容玩家入口/);
});

test("legacy host and player shells redirect into the unified app entry", () => {
  const hostHtml = readFile(path.join("public", "host.html"));
  const playerHtml = readFile(path.join("public", "player.html"));

  assert.match(hostHtml, /app\.html/);
  assert.match(playerHtml, /app\.html/);
  assert.doesNotMatch(hostHtml, /主持人入口/);
  assert.doesNotMatch(playerHtml, /玩家入口/);
});

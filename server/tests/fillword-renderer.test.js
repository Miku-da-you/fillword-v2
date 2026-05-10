const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workspaceRoot = path.join(__dirname, "..", "..");

function loadRenderer() {
  const scriptPath = path.join(workspaceRoot, "public", "scripts", "renderers", "fillword-renderer.js");
  const source = fs.readFileSync(scriptPath, "utf8");
  const sandbox = {
    window: {
      FillwordUtils: {
        escapeHtml(value) {
          return String(value || "");
        }
      }
    }
  };

  vm.runInNewContext(source, sandbox, { filename: scriptPath });
  return sandbox.window.FillwordFillwordRenderer;
}

test("fillword player view hides the host row and shows only player participants", () => {
  const renderer = loadRenderer();
  const view = renderer.renderRoom({
    mode: "fillword",
    viewerRole: "player",
    isHost: false,
    status: "waiting",
    viewerPlayerName: "问问",
    viewerSubmitted: false,
    playerId: "p1",
    hostPlayerId: "host-1",
    assignedFieldKeys: ["nickname", "weapon", "skill"],
    assignedPrompts: [{ key: "nickname", label: "昵称" }],
    players: [
      { playerId: "host-1", playerName: "主持人", isHost: true, isViewer: false, submitted: false, connected: true, assignedFieldKeys: [] },
      { playerId: "p1", playerName: "问问", isHost: false, isViewer: true, submitted: false, connected: true, assignedFieldKeys: ["nickname", "weapon", "skill"] },
      { playerId: "p2", playerName: "小李", isHost: false, isViewer: false, submitted: false, connected: true, assignedFieldKeys: ["place"] }
    ]
  });

  assert.match(view.title, /欢迎你，问问/);
  assert.match(view.subtitle, /玩家视角/);
  assert.doesNotMatch(view.playersHtml, /主持人/);
  assert.match(view.playersHtml, /问问/);
  assert.match(view.playersHtml, /小李/);
});

test("fillword host view counts only joined players and excludes host from player totals", () => {
  const renderer = loadRenderer();
  const view = renderer.renderRoom({
    mode: "fillword",
    viewerRole: "host",
    isHost: true,
    status: "waiting",
    joinedPlayerCount: 1,
    targetPlayerCount: 2,
    submittedPlayerCount: 0,
    hostPlayerId: "host-1",
    canGenerate: false,
    players: [
      { playerId: "host-1", playerName: "主持人", isHost: true, isViewer: true, submitted: false, connected: true, assignedFieldKeys: [] },
      { playerId: "p1", playerName: "问问", isHost: false, isViewer: false, submitted: false, connected: true, assignedFieldKeys: ["nickname", "weapon", "skill"] }
    ]
  });

  assert.match(view.title, /主持人控制台/);
  assert.match(view.subtitle, /0\/2 名玩家已提交/);
  assert.match(view.content, /已加入 1\/2 名玩家/);
  assert.match(view.content, /你不参与填词/);
  assert.doesNotMatch(view.playersHtml, /主持人/);
  assert.match(view.playersHtml, /问问/);
});

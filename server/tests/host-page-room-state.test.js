const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workspaceRoot = path.join(__dirname, "..", "..");
const hostScriptPath = path.join(workspaceRoot, "public", "scripts", "pages", "host.js");
const hostScript = fs.readFileSync(hostScriptPath, "utf8");

function createElement(overrides = {}) {
  return {
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    dataset: {},
    classList: {
      add() {},
      remove() {}
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    ...overrides
  };
}

function loadHostPage() {
  const elements = {
    selectionSummary: createElement(),
    createRoomBtn: createElement(),
    templateGrid: createElement(),
    playerCountSelect: createElement({ value: "2" }),
    displayRoomCode: createElement(),
    "stat-target": createElement(),
    "stat-joined": createElement(),
    "stat-submitted": createElement(),
    playersList: createElement(),
    generateResultBtn: createElement(),
    closeRoomBtn: createElement(),
    closeRoomResultBtn: createElement(),
    playAgainBtn: createElement(),
    resultTag: createElement(),
    resultTitle: createElement(),
    resultScript: createElement(),
    resultPlayers: createElement()
  };

  const socketCallbacks = {};
  const sandbox = {
    window: {
      TEMPLATES: [
        { id: "social-death-intro", title: "社死自我介绍", emoji: "🙃", supportedPlayerCounts: [2, 3] }
      ]
    },
    document: {
      getElementById(id) {
        return elements[id] || createElement();
      },
      querySelectorAll() {
        return [];
      }
    },
    FillwordSocket: {
      onRoomState(handler) {
        socketCallbacks.roomState = handler;
      },
      onResultGenerated(handler) {
        socketCallbacks.resultGenerated = handler;
      },
      onRoomClosed(handler) {
        socketCallbacks.roomClosed = handler;
      },
      disconnect() {},
      closeRoom() {
        return Promise.resolve();
      },
      createRoom() {
        return Promise.resolve();
      },
      generateResult() {
        return Promise.resolve();
      }
    },
    FillwordUtils: {
      setText(id, value) {
        elements[id].textContent = String(value);
      },
      showPage() {},
      showError() {},
      escapeHtml(value) {
        return String(value);
      }
    },
    console
  };

  sandbox.window.FillwordSocket = sandbox.FillwordSocket;
  sandbox.window.FillwordUtils = sandbox.FillwordUtils;
  vm.runInNewContext(hostScript, sandbox, { filename: hostScriptPath });

  return { elements, socketCallbacks };
}

test("host room list only shows joined players and hides the host row", () => {
  const { elements, socketCallbacks } = loadHostPage();

  socketCallbacks.roomState({
    roomCode: "ABCD",
    targetPlayerCount: 3,
    joined: 2,
    canGenerate: false,
    status: "waiting",
    hostPlayerId: "host-1",
    players: [
      {
        playerId: "host-1",
        playerName: "主持人",
        isHost: true,
        submitted: false,
        assignedFieldKeys: []
      },
      {
        playerId: "player-1",
        playerName: "Alice",
        isHost: false,
        submitted: false,
        assignedFieldKeys: ["enemy1", "rival1"]
      }
    ]
  });

  assert.equal(elements["stat-joined"].textContent, "2");
  assert.match(elements.playersList.innerHTML, /Alice/);
  assert.doesNotMatch(elements.playersList.innerHTML, /主持人/);
});

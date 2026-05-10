const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { TurtleSoupManager } = require("../turtle-soup/manager");

const CASES = [
  {
    id: "late-night-elevator",
    title: "深夜电梯",
    opening: "一个人深夜进入电梯，按下楼层后突然崩溃。为什么？",
    askPoints: [],
    coreFacts: [
      "他看到了镜子里的自己",
      "他发现自己刚刚失控大哭过",
      "所以他立刻崩溃"
    ],
    requiredFactGroups: [
      ["镜子"],
      ["自己"],
      ["哭", "失控"],
      ["崩溃"]
    ],
    closeHint: "你已经很接近真相了，还差最后一个关键原因。",
    fullTruth: "他看到镜子里的自己，意识到自己刚刚失控大哭过。",
    difficulty: 2,
  }
];

function createManager() {
  return new TurtleSoupManager({
    cases: CASES,
    adjudicator: {
      judgeQuestion: async () => ({ verdict: "no", reply: "否", source: "test-ai" })
    }
  });
}

function loadRenderer() {
  const workspaceRoot = path.join(__dirname, "..", "..");
  const scriptPath = path.join(workspaceRoot, "public", "scripts", "renderers", "turtle-renderer.js");
  const source = fs.readFileSync(scriptPath, "utf8");
  const sandbox = {
    window: {
      FillwordUtils: {
        escapeHtml(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }
      }
    }
  };
  vm.runInNewContext(source, sandbox, { filename: scriptPath });
  return sandbox.window.FillwordTurtleRenderer;
}

test("host can abandon turtle game and reveal an abandoned outcome", async () => {
  const manager = createManager();
  const created = manager.createRoom("late-night-elevator", 2, "host-socket", "host-client");
  const joined = manager.joinRoom(created.roomId, "Alice", "socket-a", "player-client");

  manager.startRoom(created.roomId, created.playerId);
  const wrongGuessState = await manager.submitGuess(joined.playerId, "也许是听到了声音");
  assert.equal(wrongGuessState.questionCount, 1);

  const revealed = manager.abandonGame(created.roomId, created.playerId);

  assert.equal(revealed.status, "truth_reveal");
  assert.equal(revealed.result.outcome, "abandoned");
  assert.equal(revealed.result.failureReason, "host_abandoned");
  assert.match(revealed.result.fullTruth, /镜子里的自己/);
});

test("non-host cannot abandon turtle game", () => {
  const manager = createManager();
  const created = manager.createRoom("late-night-elevator", 2, "host-socket", "host-client");
  const joined = manager.joinRoom(created.roomId, "Alice", "socket-a", "player-client");

  manager.startRoom(created.roomId, created.playerId);

  assert.throws(
    () => manager.abandonGame(created.roomId, joined.playerId),
    error => error && error.code === "NOT_HOST"
  );
});

test("turtle renderer shows abandon button for host during asking and abandoned reveal copy", () => {
  const renderer = loadRenderer();
  const asking = renderer.renderRoom({
    viewerRole: "host",
    isHost: true,
    status: "asking",
    caseTitle: "深夜电梯",
    opening: "题面",
    questionCount: 3,
    questionLimit: 20,
    remainingQuestions: 17,
    qaHistory: [],
    players: []
  });

  assert.equal(asking.dangerLabel, "放弃本局");

  const revealed = renderer.renderRoom({
    viewerRole: "host",
    isHost: true,
    status: "truth_reveal",
    questionCount: 3,
    questionLimit: 20,
    remainingQuestions: 17,
    players: [],
    result: {
      outcome: "abandoned",
      fullTruth: "官方真相",
      questionCount: 3,
      questionLimit: 20,
      guesses: []
    }
  });

  assert.equal(revealed.title, "主持人终止");
  assert.match(revealed.subtitle, /主持人已选择放弃本局/);
});

test("turtle renderer shows close guidance when a final guess is almost correct", () => {
  const renderer = loadRenderer();
  const asking = renderer.renderRoom({
    viewerRole: "player",
    isHost: false,
    status: "asking",
    caseTitle: "深夜电梯",
    opening: "题面",
    questionCount: 4,
    questionLimit: 20,
    remainingQuestions: 16,
    qaHistory: [],
    players: [],
    guessFeedback: {
      outcome: "close",
      hostHint: "你已经很接近真相了，还差最后一个关键原因。"
    }
  });

  assert.match(asking.content, /你已经很接近真相了/);
});

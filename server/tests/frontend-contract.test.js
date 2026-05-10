const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workspaceRoot = path.join(__dirname, "..", "..");

function readPublicScript(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, "public", relativePath), "utf8");
}

function createAppSocketContext() {
  const calls = [];
  const context = {
    window: {},
  };
  context.window.FillwordIdentity = {
    getClientId: () => "stable-client-id",
  };
  context.window.FillwordSocket = {
    calls,
    createRoom: async (templateId, targetPlayerCount, extra) => {
      calls.push({ method: "createRoom", templateId, targetPlayerCount, extra });
      return { success: true };
    },
    joinRoom: async (roomCode, playerName, extra) => {
      calls.push({ method: "joinRoom", roomCode, playerName, extra });
      return { success: true };
    },
    connect: () => {},
    disconnect: () => {},
    startRoom: () => {},
    submitAnswers: () => {},
    submitGhostAnswers: () => {},
    submitTurtleGuess: () => {},
    submitTurtleQuestion: () => {},
    generateResult: () => {},
    closeRoom: () => {},
    leaveRoom: () => {},
    onRoomClosed: () => {},
    onRoomState: () => {},
    onResultGenerated: () => {},
  };
  vm.createContext(context);
  vm.runInContext(readPublicScript("scripts/shared/app-socket.js"), context);
  return context;
}

function createRendererContext(scriptPath) {
  const context = {
    window: {},
  };
  context.window.FillwordUtils = {
    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  };
  vm.createContext(context);
  vm.runInContext(readPublicScript(scriptPath), context);
  return context.window;
}

test("app socket forwards selected turtle case and ghost pack ids when creating rooms", async () => {
  const context = createAppSocketContext();
  const appSocket = context.window.FillwordAppSocket;

  await appSocket.createRoom({ mode: "turtle", targetPlayerCount: 4, caseId: "mirror-breakdown" });
  await appSocket.createRoom({ mode: "ghost", targetPlayerCount: 3, packId: "dormitory-rule-13" });
  await appSocket.joinRoom({ roomCode: "abcd", playerName: "Alice" });

  const normalizedCalls = JSON.parse(JSON.stringify(context.window.FillwordSocket.calls));

  assert.deepEqual(normalizedCalls[0], {
    method: "createRoom",
    targetPlayerCount: 4,
    extra: {
      clientId: "stable-client-id",
      mode: "turtle",
      caseId: "mirror-breakdown",
    }
  });
  assert.deepEqual(normalizedCalls[1], {
    method: "createRoom",
    targetPlayerCount: 3,
    extra: {
      clientId: "stable-client-id",
      mode: "ghost",
      packId: "dormitory-rule-13",
    }
  });
  assert.deepEqual(normalizedCalls[2], {
    method: "joinRoom",
    roomCode: "abcd",
    playerName: "Alice",
    extra: { clientId: "stable-client-id" }
  });
});

test("fillword renderer communicates that host does not fill prompts", () => {
  const window = createRendererContext("scripts/renderers/fillword-renderer.js");
  const rendered = window.FillwordFillwordRenderer.renderRoom({
    isHost: true,
    hostPlayerId: "host",
    playerId: "host",
    joinedPlayerCount: 1,
    targetPlayerCount: 2,
    canGenerate: false,
    players: [
      { playerId: "host", playerName: "主持人", submitted: false, assignedFieldKeys: [] },
      { playerId: "p1", playerName: "Alice", submitted: false, assignedFieldKeys: ["a", "b"] },
    ]
  });

  assert.equal(rendered.primaryLabel, "等待全部提交");
  assert.equal(rendered.primaryDisabled, true);
  assert.match(rendered.subtitle, /主持人/);
  assert.match(rendered.subtitle, /公布结果/);
  assert.match(rendered.playersHtml, /负责 2 项/);
  assert.doesNotMatch(rendered.playersHtml, /主持人<\/strong>/);
});

test("turtle renderer shows question counter and solved or failed reveal messages", () => {
  const window = createRendererContext("scripts/renderers/turtle-renderer.js");
  const asking = window.FillwordTurtleRenderer.renderRoom({
    viewerRole: "player",
    status: "asking",
    players: [],
    caseTitle: "深夜电梯",
    opening: "题面",
    questionCount: 7,
    questionLimit: 20,
    remainingQuestions: 13,
    qaHistory: [],
  });
  assert.match(asking.subtitle, /剩余 13 次/);
  assert.match(asking.content, /已提问 7 \/ 20/);

  const failed = window.FillwordTurtleRenderer.renderRoom({
    viewerRole: "player",
    status: "truth_reveal",
    players: [],
    questionCount: 20,
    questionLimit: 20,
    remainingQuestions: 0,
    result: {
      outcome: "failed",
      fullTruth: "官方真相",
      questionCount: 20,
      questionLimit: 20,
      guesses: [],
    }
  });
  assert.match(failed.subtitle, /本局失败/);
  assert.match(failed.content, /AI 主持人提问计数/);

  const solved = window.FillwordTurtleRenderer.renderRoom({
    viewerRole: "player",
    status: "truth_reveal",
    players: [],
    questionCount: 3,
    questionLimit: 20,
    remainingQuestions: 17,
    result: {
      outcome: "solved",
      solvedBy: { playerName: "Alice" },
      fullTruth: "官方真相",
      guesses: [],
    }
  });
  assert.equal(solved.title, "成功通关");
  assert.match(solved.subtitle, /Alice/);
});

test("ghost renderer exposes rule review and current chapter clues while preserving answer UI", () => {
  const window = createRendererContext("scripts/renderers/ghost-renderer.js");
  const rendered = window.FillwordGhostRenderer.renderRoom({
    viewerRole: "player",
    status: "chapter_answering",
    viewerAlive: true,
    viewerSubmittedCurrentChapter: false,
    currentChapterIndex: 0,
    currentChapterTitle: "第一夜",
    currentChapterContent: "门响了四下。",
    currentChapterClues: ["门外有人叫你的名字。"],
    currentChapterQuestions: [
      { id: "q1", question: "你应该开门吗？", options: ["开门", "不开门"] },
      { id: "q2", question: "蓝色纸条可信吗？", type: "true_false", correctAnswer: false },
    ],
    players: [],
    intro: "欢迎来到宿舍",
    rules: [
      { id: "r1", text: "不要回应敲门。", severity: "critical" },
      { id: "r2", text: "不要阅读蓝色纸条。", severity: "warning" },
    ],
  });

  assert.match(rendered.content, /查看规则列表/);
  assert.match(rendered.content, /规则 1/);
  assert.match(rendered.content, /高危/);
  assert.match(rendered.content, /本章线索/);
  assert.match(rendered.content, /门外有人叫你的名字/);
  assert.match(rendered.content, /name="ghost_q1"/);
  assert.match(rendered.content, /name="ghost_q2"/);
  assert.equal(rendered.primaryLabel, "提交本章答案");
});

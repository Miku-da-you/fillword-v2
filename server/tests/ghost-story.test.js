const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const { GhostStoryManager } = require("../ghost-story/manager");
const DEFAULT_PACKS = require("../ghost-story/packs");

function createNarrator({ failIntro = false, failEnding = false } = {}) {
  return {
    async narrateIntro(pack) {
      if (failIntro) throw new Error("intro unavailable");
      return `你翻开了《${pack.title}》的夹页。`;
    },
    async narrateEnding({ endingText }) {
      if (failEnding) throw new Error("ending unavailable");
      return `结局记录：${endingText}`;
    }
  };
}

function createStartedRoom(manager) {
  const created = manager.createRoom("dormitory-rule-13", 2, "host-socket", "host-client");
  const joined = manager.joinRoom(created.roomId, "Alice", "socket-a", "client-a");
  return { created, joined };
}

function loadRenderer() {
  const workspaceRoot = path.join(__dirname, "..", "..");
  const scriptPath = path.join(workspaceRoot, "public", "scripts", "renderers", "ghost-renderer.js");
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
  return sandbox.window.FillwordGhostRenderer;
}

test("ghost story starts by exposing only the current chapter", async () => {
  const manager = new GhostStoryManager({ narrator: createNarrator() });
  const { created, joined } = createStartedRoom(manager);

  const started = await manager.startRoom(created.roomId, created.playerId);
  const playerState = manager.buildRoomState(manager.rooms.get(created.roomId), joined.playerId, "client-a");

  assert.equal(started.status, "chapter_answering");
  assert.equal(started.currentChapterIndex, 0);
  assert.equal(started.currentChapterTitle, "第一章：敲门声");
  assert.equal(Array.isArray(started.currentChapterQuestions), true);
  assert.equal(started.currentChapterQuestions.length, 2);
  assert.equal(playerState.viewerAlive, true);
  assert.match(playerState.currentChapterContent, /门外说：我忘带钥匙了/);
  assert.match(playerState.introNarration, /宿舍守则第13条/);
});

test("ghost story keeps submitted survivors waiting until all alive players finish the chapter", async () => {
  const manager = new GhostStoryManager({ narrator: createNarrator() });
  const { created, joined } = createStartedRoom(manager);

  await manager.startRoom(created.roomId, created.playerId);
  const waiting = await manager.submitAnswers(created.playerId, { c1q1: 2, c1q2: false });
  const pendingPlayerState = manager.buildRoomState(manager.rooms.get(created.roomId), joined.playerId, "client-a");

  assert.equal(waiting.status, "chapter_answering");
  assert.equal(waiting.viewerSubmittedCurrentChapter, true);
  assert.equal(pendingPlayerState.viewerSubmittedCurrentChapter, false);
  assert.equal(pendingPlayerState.viewerAlive, true);
  assert.equal(pendingPlayerState.currentChapterIndex, 0);
});

test("ghost story resolves a chapter into a transition scene before survivors continue", async () => {
  const manager = new GhostStoryManager({ narrator: createNarrator() });
  const { created, joined } = createStartedRoom(manager);

  await manager.startRoom(created.roomId, created.playerId);
  await manager.submitAnswers(created.playerId, { c1q1: 2, c1q2: false });
  const resolved = await manager.submitAnswers(joined.playerId, { c1q1: 0, c1q2: true });
  const room = manager.rooms.get(created.roomId);
  const failedPlayerState = manager.buildRoomState(room, joined.playerId, "client-a");

  assert.equal(resolved.status, "chapter_resolved");
  assert.equal(resolved.currentChapterIndex, 0);
  assert.equal(resolved.chapterResolution.nextChapterTitle, "第二章：蓝色纸条");
  assert.match(resolved.chapterResolution.transitionNarration, /少了一个原本熟悉的呼吸声/);
  assert.equal(resolved.viewerAlive, false);
  assert.equal(failedPlayerState.viewerAlive, false);
  assert.equal(failedPlayerState.viewerFailedAtChapterIndex, 0);
  assert.equal(failedPlayerState.viewerFailureDetails.selectedAnswer, "值班老师巡查");
  assert.equal(failedPlayerState.viewerFailureDetails.correctAnswer, "门外的东西开始模仿宿舍成员");
  assert.match(failedPlayerState.viewerFailureDetails.failureReason, /值班老师只会敲三下/);

  const survivorState = manager.buildRoomState(room, created.playerId, "host-client");
  assert.equal(survivorState.viewerAlive, true);
  assert.equal(survivorState.viewerReadyForNextChapter, false);
  const continued = manager.continueChapter(created.playerId);
  assert.equal(continued.status, "chapter_answering");
  assert.equal(continued.currentChapterIndex, 1);
  assert.equal(continued.currentChapterTitle, "第二章：蓝色纸条");
});

test("ghost story eliminated players cannot submit later chapters and survivors reach ending", async () => {
  const manager = new GhostStoryManager({ narrator: createNarrator() });
  const { created, joined } = createStartedRoom(manager);

  await manager.startRoom(created.roomId, created.playerId);
  await manager.submitAnswers(created.playerId, { c1q1: 2, c1q2: false });
  await manager.submitAnswers(joined.playerId, { c1q1: 0, c1q2: true });
  manager.continueChapter(created.playerId);

  await assert.rejects(
    () => manager.submitAnswers(joined.playerId, { c2q1: 2 }),
    error => error && error.code === "PLAYER_ELIMINATED"
  );

  await manager.submitAnswers(created.playerId, { c2q1: 2, c2q2: 1 });
  manager.continueChapter(created.playerId);
  await manager.submitAnswers(created.playerId, { c3q1: 1, c3q2: false });
  manager.continueChapter(created.playerId);
  const ending = await manager.submitAnswers(created.playerId, { c4q1: 1, c4q2: false });
  assert.equal(ending.status, "ending_reveal");
  assert.equal(ending.result.endingKey, "perfect");
  assert.equal(ending.result.playerOutcomes.length, 2);
  assert.equal(ending.result.playerOutcomes.find(item => item.playerName === "Alice").status, "failed");
});

test("ghost story narrator failures fall back without blocking the room", async () => {
  const manager = new GhostStoryManager({ narrator: createNarrator({ failIntro: true, failEnding: true }) });
  const { created, joined } = createStartedRoom(manager);

  const started = await manager.startRoom(created.roomId, created.playerId);
  assert.match(started.introNarration, /宿舍/);

  await manager.submitAnswers(created.playerId, { c1q1: 2, c1q2: false });
  await manager.submitAnswers(joined.playerId, { c1q1: 2, c1q2: false });
  manager.continueChapter(created.playerId);
  manager.continueChapter(joined.playerId);
  await manager.submitAnswers(created.playerId, { c2q1: 2, c2q2: 1 });
  await manager.submitAnswers(joined.playerId, { c2q1: 2, c2q2: 1 });
  manager.continueChapter(created.playerId);
  manager.continueChapter(joined.playerId);
  await manager.submitAnswers(created.playerId, { c3q1: 1, c3q2: false });
  await manager.submitAnswers(joined.playerId, { c3q1: 1, c3q2: false });
  manager.continueChapter(created.playerId);
  manager.continueChapter(joined.playerId);
  await manager.submitAnswers(created.playerId, { c4q1: 1, c4q2: false });
  const ending = await manager.submitAnswers(joined.playerId, { c4q1: 1, c4q2: false });

  assert.equal(ending.status, "ending_reveal");
  assert.equal(typeof ending.result.aiEndingSummary, "string");
});

test("ghost story host reconnect is restored by stable client id", () => {
  const manager = new GhostStoryManager({ narrator: createNarrator() });
  const { created } = createStartedRoom(manager);

  const disconnected = manager.handleDisconnect("host-socket");
  const room = manager.rooms.get(created.roomId);
  const hostRecord = room.players.find(player => player.playerId === created.playerId);

  assert.equal(disconnected.type, "updated");
  assert.equal(hostRecord.connected, false);

  const rejoined = manager.joinRoom(created.roomId, "Ignored", "host-socket-2", "host-client");
  assert.equal(rejoined.playerId, created.playerId);
  assert.equal(rejoined.roomState.viewerRole, "host");
});

test("default ghost packs keep chapter-scoped questions and clues", () => {
  const pack = DEFAULT_PACKS.find(item => item.id === "dormitory-rule-13");

  assert.ok(pack);
  assert.ok(Array.isArray(pack.rules));
  assert.ok(Array.isArray(pack.chapters));
  assert.ok(pack.chapters.length >= 4);
  assert.ok(pack.chapters.every(chapter => Array.isArray(chapter.questions) && chapter.questions.length > 0));
  assert.ok(pack.chapters.every(chapter => Array.isArray(chapter.clues)));
  assert.ok(pack.rules.every(rule => rule.id && rule.text && rule.severity));
});

test("ghost renderer shows current chapter, transition scene, and failure waiting page", () => {
  const renderer = loadRenderer();
  const activeView = renderer.renderRoom({
    viewerRole: "player",
    isHost: false,
    status: "chapter_answering",
    viewerAlive: true,
    viewerSubmittedCurrentChapter: false,
    currentChapterIndex: 0,
    currentChapterTitle: "第一章：敲门声",
    currentChapterContent: "门外有人叫你的名字。",
    currentChapterClues: ["敲门声响了四下。"],
    currentChapterQuestions: [
      { id: "c1q1", type: "single", question: "应该开门吗？", options: ["开门", "不开门"] }
    ],
    rules: [{ id: "r1", text: "不要回应敲门。", severity: "critical" }],
    players: [{ playerId: "p1", playerName: "Alice", alive: true, submitted: false, connected: true }]
  });

  assert.match(activeView.title, /第一章：敲门声/);
  assert.match(activeView.content, /敲门声响了四下/);
  assert.match(activeView.primaryLabel, /提交本章答案/);

  const transitionView = renderer.renderRoom({
    viewerRole: "player",
    isHost: false,
    status: "chapter_resolved",
    viewerAlive: true,
    chapterResolution: {
      chapterTitle: "第一章：敲门声",
      transitionNarration: "走廊重新安静了下来，但宿舍里少了一个原本熟悉的呼吸声。",
      survivors: [{ playerName: "房主" }],
      eliminated: [{ playerName: "Alice" }],
      nextChapterTitle: "第二章：蓝色纸条"
    },
    players: [
      { playerId: "host", playerName: "房主", alive: true, submitted: false, connected: true },
      { playerId: "p1", playerName: "Alice", alive: false, submitted: false, connected: true }
    ]
  });

  assert.match(transitionView.title, /第一章：敲门声 已结束/);
  assert.match(transitionView.content, /仍可继续的人/);
  assert.match(transitionView.content, /第二章：蓝色纸条/);
  assert.equal(transitionView.primaryLabel, "继续前进");

  const failedView = renderer.renderRoom({
    viewerRole: "player",
    isHost: false,
    status: "chapter_resolved",
    viewerAlive: false,
    viewerFailedAtChapterIndex: 0,
    viewerSubmittedCurrentChapter: false,
    viewerFailureDetails: {
      question: "第二轮敲门声最可能意味着什么？",
      selectedAnswer: "值班老师巡查",
      correctAnswer: "门外的东西开始模仿宿舍成员",
      failedRuleIds: ["r2"],
      failureReason: "你忽略了值班老师只会敲三下。",
      failureNarration: "门外的东西学会了你的声音。"
    },
    rules: [{ id: "r2", text: "值班老师只会敲三下。", severity: "warning" }],
    players: [{ playerId: "p1", playerName: "Alice", alive: false, submitted: false, connected: true }]
  });

  assert.match(failedView.title, /你已失败/);
  assert.match(failedView.content, /失败等待页/);
  assert.match(failedView.content, /你的选择/);
  assert.match(failedView.content, /正确答案/);
  assert.match(failedView.content, /值班老师只会敲三下/);
  assert.match(failedView.content, /门外的东西学会了你的声音/);
});

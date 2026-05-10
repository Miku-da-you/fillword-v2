const test = require("node:test");
const assert = require("node:assert/strict");

const { TurtleSoupManager } = require("../turtle-soup/manager");
const { createAiAdjudicator } = require("../turtle-soup/ai-adjudicator");

const CASES = [
  {
    id: "late-night-elevator",
    title: "深夜电梯",
    opening: "一个人深夜进入电梯，按下楼层后，电梯里响起提示音，他立刻崩溃并大声尖叫。这是为什么？",
    askPoints: [
      {
        key: "mirror",
        question: "他是不是看到了自己？",
        truth: "他看见了镜子里的自己",
        keywordGroups: [["镜子", "倒影"], ["自己", "样子"]]
      }
    ],
    coreFacts: [
      "他看到了镜子里的自己",
      "他发现自己刚刚哭过",
      "这个发现让他当场崩溃"
    ],
    requiredFactGroups: [
      ["镜子", "倒影"],
      ["自己"],
      ["哭", "泪痕", "刚刚哭过"],
      ["崩溃", "失控", "尖叫"]
    ],
    closeHint: "你已经很接近真相了，还差他为什么会当场崩溃这一层。",
    fullTruth: "他看到镜子里的自己，发现自己满脸泪痕，意识到自己刚刚失控，所以当场崩溃了。",
    difficulty: 2
  }
];

function createAdjudicator(reply = "接近了") {
  return {
    calls: [],
    async judgeQuestion(payload) {
      this.calls.push(payload);
      return { verdict: "close", reply, source: "ai" };
    }
  };
}

function createManager({ adjudicator = createAdjudicator(), solvedWords = ["镜子", "自己"] } = {}) {
  return new TurtleSoupManager({
    cases: CASES,
    adjudicator,
    scoring: {
      scoreGuess: guess => {
        const text = String(guess || "");
        const solved = solvedWords.every(word => text.includes(word));
        return { label: solved ? "完全命中" : "未命中", solved };
      },
      isSolved: score => score.solved === true
    }
  });
}

function createStartedRoom(manager) {
  const created = manager.createRoom("late-night-elevator", 2, "host-socket", "host-client");
  const joined = manager.joinRoom(created.roomId, "Alice", "socket-a", "player-client");
  manager.startRoom(created.roomId, created.playerId);
  return { created, joined };
}

test("turtle soup starts with AI-hosted question accounting fields", () => {
  const manager = createManager();
  const created = manager.createRoom("late-night-elevator", 2, "host-socket", "host-client");
  const joined = manager.joinRoom(created.roomId, "Alice", "socket-a", "player-client");

  const started = manager.startRoom(created.roomId, created.playerId);
  const playerState = manager.buildRoomState(manager.rooms.get(created.roomId), joined.playerId, "player-client");

  assert.equal(started.status, "asking");
  assert.equal(started.questionCount, 0);
  assert.equal(started.questionLimit, 20);
  assert.equal(started.remainingQuestions, 20);
  assert.equal(playerState.viewerRole, "player");
  assert.equal(playerState.opening, CASES[0].opening);
});

test("turtle soup sends questions to the AI host and broadcasts numbered history", async () => {
  const adjudicator = createAdjudicator("是");
  const manager = createManager({ adjudicator });
  const { created, joined } = createStartedRoom(manager);

  const state = await manager.submitQuestion(joined.playerId, "他是不是在电梯里看到自己了？");

  assert.equal(adjudicator.calls.length, 1);
  assert.equal(adjudicator.calls[0].gameCase.id, "late-night-elevator");
  assert.equal(adjudicator.calls[0].question, "他是不是在电梯里看到自己了？");
  assert.equal(state.status, "asking");
  assert.equal(state.questionCount, 1);
  assert.equal(state.remainingQuestions, 19);
  assert.deepEqual(state.qaHistory[0], {
    playerId: joined.playerId,
    playerName: "Alice",
    question: "他是不是在电梯里看到自己了？",
    reply: "是",
    verdict: "close",
    source: "ai",
    index: 1,
  });
  assert.equal(manager.rooms.get(created.roomId).qaHistory.length, 1);
});

test("turtle soup reveals failure and truth on the twentieth unanswered question", async () => {
  const manager = createManager({ solvedWords: ["never-match"] });
  const { joined } = createStartedRoom(manager);

  let state;
  for (let index = 0; index < 20; index++) {
    state = await manager.submitQuestion(joined.playerId, `第 ${index + 1} 个问题`);
  }

  assert.equal(state.status, "truth_reveal");
  assert.equal(state.questionCount, 20);
  assert.equal(state.remainingQuestions, 0);
  assert.equal(state.failureReason, "question_limit_exceeded");
  assert.equal(state.result.outcome, "failed");
  assert.equal(state.result.failureReason, "question_limit_exceeded");
  assert.equal(state.result.questionLimit, 20);
  assert.equal(state.result.fullTruth, CASES[0].fullTruth);
});

test("turtle soup keeps asking after a wrong guess and solves immediately on a correct guess", async () => {
  const manager = createManager();
  const { created, joined } = createStartedRoom(manager);

  const wrong = await manager.submitGuess(created.playerId, "他只是被提示音吓到了");
  assert.equal(wrong.status, "asking");
  assert.equal(wrong.result, null);
  assert.equal(wrong.hasSubmittedGuess, true);
  assert.equal(wrong.questionCount, 1);
  assert.equal(wrong.remainingQuestions, 19);

  const solved = await manager.submitGuess(joined.playerId, "他看见了镜子里的自己，又发现自己刚刚哭过，所以直接崩溃了");
  assert.equal(solved.status, "truth_reveal");
  assert.equal(solved.result.outcome, "solved");
  assert.equal(solved.result.solvedBy.playerId, joined.playerId);
  assert.equal(solved.result.solvedBy.playerName, "Alice");
  assert.equal(solved.result.guesses.length, 2);
  assert.equal(solved.result.guesses.find(item => item.playerId === joined.playerId).solved, true);
});

test("turtle soup rejects questions and guesses once truth has been revealed", async () => {
  const manager = createManager();
  const { joined } = createStartedRoom(manager);

  await manager.submitGuess(joined.playerId, "他看见了镜子里的自己，又发现自己刚刚哭过，所以直接崩溃了");

  await assert.rejects(() => manager.submitGuess(joined.playerId, "再次猜测"), /ROOM_NOT_ASKING/);
  await assert.rejects(() => manager.submitQuestion(joined.playerId, "还能继续问吗？"), /ROOM_NOT_ASKING/);
});

test("AI adjudicator falls back to rule judging when Spark is unavailable", async () => {
  const adjudicator = createAiAdjudicator();
  const judged = await adjudicator.judgeQuestion({
    gameCase: CASES[0],
    question: "他是不是看到了镜子里的自己？",
    history: [],
  });

  assert.equal(judged.source, "rule");
  assert.ok(["yes", "close", "no", "irrelevant"].includes(judged.verdict));
  assert.equal(typeof judged.reply, "string");
});

test("turtle soup treats a close final guess as guidance instead of immediate failure", async () => {
  const manager = createManager();
  const { joined } = createStartedRoom(manager);

  const state = await manager.submitGuess(joined.playerId, "他看到了镜子里的自己，而且像是刚刚哭过。");

  assert.equal(state.status, "asking");
  assert.equal(state.hasSubmittedGuess, true);
  assert.equal(state.guessFeedback.outcome, "close");
  assert.match(state.guessFeedback.hostHint, /接近|关键/);
});

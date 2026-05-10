const test = require("node:test");
const assert = require("node:assert/strict");

const CASES = require("../turtle-soup/cases");
const { createFinalGuessAdjudicator } = require("../turtle-soup/final-guess-adjudicator");

test("existing turtle cases define core fact metadata and close hints", () => {
  const elevator = CASES.find(item => item.id === "late-night-elevator");
  const train = CASES.find(item => item.id === "last-train-seat");

  for (const gameCase of [elevator, train]) {
    assert.ok(gameCase);
    assert.ok(Array.isArray(gameCase.coreFacts));
    assert.ok(gameCase.coreFacts.length >= 2);
    assert.ok(Array.isArray(gameCase.requiredFactGroups));
    assert.ok(gameCase.requiredFactGroups.length >= 2);
    assert.equal(typeof gameCase.closeHint, "string");
    assert.ok(gameCase.closeHint.length > 0);
  }
});

test("turtle cases include two new playable stories", () => {
  assert.ok(CASES.some(item => item.id === "rainy-night-garbage"));
  assert.ok(CASES.some(item => item.id === "midnight-corridor"));
});

test("final guess adjudicator solves when the player captures the core causal chain without exact wording", async () => {
  const gameCase = CASES.find(item => item.id === "late-night-elevator");
  const adjudicator = createFinalGuessAdjudicator();

  const result = await adjudicator.judgeGuess({
    gameCase,
    guess: "他在电梯里看到镜子里的自己，又发现自己刚刚哭过，所以一下子崩溃了。",
  });

  assert.equal(result.outcome, "solved");
});

test("final guess adjudicator returns close when the player is missing the final causal step", async () => {
  const gameCase = CASES.find(item => item.id === "late-night-elevator");
  const adjudicator = createFinalGuessAdjudicator();

  const result = await adjudicator.judgeGuess({
    gameCase,
    guess: "他看到了镜子里的自己，而且脸上有哭过的痕迹。",
  });

  assert.equal(result.outcome, "close");
  assert.equal(typeof result.hostHint, "string");
  assert.ok(result.hostHint.length > 0);
});

test("final guess adjudicator returns wrong when the guess misses the core logic", async () => {
  const gameCase = CASES.find(item => item.id === "late-night-elevator");
  const adjudicator = createFinalGuessAdjudicator();

  const result = await adjudicator.judgeGuess({
    gameCase,
    guess: "电梯坏了，所以提示音把他吓到了。",
  });

  assert.equal(result.outcome, "wrong");
});

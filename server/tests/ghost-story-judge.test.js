const test = require("node:test");
const assert = require("node:assert/strict");

const { judgeAnswers } = require("../ghost-story/judge");

test("ghost story judge scores choice and true-false questions", () => {
  const result = judgeAnswers([
    { id: "q1", correctIndex: 2 },
    { id: "q2", type: "true_false", answer: true }
  ], {
    q1: 2,
    q2: true
  });

  assert.equal(result.correctCount, 2);
  assert.equal(result.totalCount, 2);
  assert.equal(result.accuracy, 1);
});

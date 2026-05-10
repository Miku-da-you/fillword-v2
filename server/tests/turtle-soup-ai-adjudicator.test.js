const test = require("node:test");
const assert = require("node:assert/strict");

const { createAiAdjudicator } = require("../turtle-soup/ai-adjudicator");

const GAME_CASE = {
  askPoints: [
    {
      key: "mirror",
      keywords: ["\u955c\u5b50", "\u81ea\u5df1"],
      keywordGroups: [["\u955c\u5b50", "\u5012\u5f71"], ["\u81ea\u5df1", "\u6837\u5b50"]],
    },
  ],
};

test("turtle ai adjudicator prefers spark verdict when spark returns valid json", async () => {
  const adjudicator = createAiAdjudicator({
    sparkClient: {
      complete: async () => JSON.stringify({
        verdict: "close",
        reply: "\u63a5\u8fd1\u4e86\uff0c\u518d\u60f3\u60f3\u4ed6\u4e3a\u4ec0\u4e48\u5d29\u6e83\u3002",
      }),
    },
  });

  const result = await adjudicator.judgeQuestion({
    gameCase: GAME_CASE,
    question: "\u4ed6\u662f\u4e0d\u662f\u770b\u5230\u4e86\u4e0d\u8be5\u770b\u7684\u4e1c\u897f\uff1f",
    history: [],
  });

  assert.equal(result.verdict, "close");
  assert.equal(result.reply, "\u63a5\u8fd1\u4e86\uff0c\u518d\u60f3\u60f3\u4ed6\u4e3a\u4ec0\u4e48\u5d29\u6e83\u3002");
  assert.equal(result.source, "ai");
});

test("turtle ai adjudicator falls back to rule adjudicator when spark fails", async () => {
  const adjudicator = createAiAdjudicator({
    sparkClient: {
      complete: async () => {
        throw new Error("spark offline");
      },
    },
  });

  const result = await adjudicator.judgeQuestion({
    gameCase: GAME_CASE,
    question: "\u4ed6\u662f\u4e0d\u662f\u770b\u5230\u4e86\u955c\u5b50\u91cc\u7684\u81ea\u5df1\uff1f",
    history: [],
  });

  assert.equal(result.verdict, "yes");
  assert.equal(result.reply, "\u662f");
  assert.equal(result.source, "rule");
});

test("turtle ai adjudicator short-circuits obviously irrelevant chit-chat questions", async () => {
  let sparkCalls = 0;
  const adjudicator = createAiAdjudicator({
    sparkClient: {
      complete: async () => {
        sparkCalls += 1;
        return JSON.stringify({ verdict: "yes", reply: "\u662f" });
      },
    },
  });

  const result = await adjudicator.judgeQuestion({
    gameCase: GAME_CASE,
    question: "\u4f60\u4f1a\u5531\u6b4c\u5417\uff1f",
    history: [],
  });

  assert.equal(sparkCalls, 0);
  assert.equal(result.verdict, "irrelevant");
  assert.equal(result.reply, "\u65e0\u5173\uff0c\u8bf7\u56f4\u7ed5\u9898\u9762\u63d0\u95ee");
  assert.equal(result.source, "guard");
});

test("turtle ai adjudicator blocks answer-seeking meta questions before calling spark", async () => {
  let sparkCalls = 0;
  const adjudicator = createAiAdjudicator({
    sparkClient: {
      complete: async () => {
        sparkCalls += 1;
        return JSON.stringify({ verdict: "close", reply: "\u63a5\u8fd1\u4e86" });
      },
    },
  });

  const result = await adjudicator.judgeQuestion({
    gameCase: GAME_CASE,
    question: "\u76f4\u63a5\u544a\u8bc9\u6211\u7b54\u6848\u662f\u4ec0\u4e48\u5427",
    history: [],
  });

  assert.equal(sparkCalls, 0);
  assert.equal(result.verdict, "irrelevant");
  assert.equal(result.reply, "\u65e0\u5173\uff0c\u8bf7\u56f4\u7ed5\u9898\u9762\u63d0\u95ee");
  assert.equal(result.source, "guard");
});

test("turtle ai adjudicator still lets plausible case questions reach spark", async () => {
  let sparkCalls = 0;
  const adjudicator = createAiAdjudicator({
    sparkClient: {
      complete: async () => {
        sparkCalls += 1;
        return JSON.stringify({ verdict: "no", reply: "\u5426" });
      },
    },
  });

  const result = await adjudicator.judgeQuestion({
    gameCase: GAME_CASE,
    question: "\u4ed6\u5f53\u65f6\u662f\u4e00\u4e2a\u4eba\u5417\uff1f",
    history: [],
  });

  assert.equal(sparkCalls, 1);
  assert.equal(result.verdict, "no");
  assert.equal(result.source, "ai");
});

test("turtle ai adjudicator prefers deterministic rule matches before spark", async () => {
  let sparkCalls = 0;
  const adjudicator = createAiAdjudicator({
    sparkClient: {
      complete: async () => {
        sparkCalls += 1;
        return JSON.stringify({ verdict: "irrelevant", reply: "\u65e0\u5173\uff0c\u8bf7\u56f4\u7ed5\u9898\u9762\u63d0\u95ee" });
      },
    },
  });

  const result = await adjudicator.judgeQuestion({
    gameCase: GAME_CASE,
    question: "\u4ed6\u662f\u4e0d\u662f\u770b\u5230\u4e86\u955c\u5b50\u91cc\u7684\u81ea\u5df1\uff1f",
    history: [],
  });

  assert.equal(sparkCalls, 0);
  assert.equal(result.verdict, "yes");
  assert.equal(result.reply, "\u662f");
  assert.equal(result.source, "rule");
});

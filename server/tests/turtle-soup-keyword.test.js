const test = require("node:test");
const assert = require("node:assert/strict");

const { matchAskPoint } = require("../turtle-soup/keyword-matcher");

test("keyword matcher finds the best ask point for a matching question", () => {
  const matched = matchAskPoint("他是不是看到了镜子里的自己？", [
    {
      key: "scream_cause",
      keywordGroups: [
        ["镜子", "倒影"],
        ["自己", "自己的样子"]
      ]
    },
    {
      key: "situation",
      keywordGroups: [
        ["哭", "流泪"],
        ["红肿"]
      ]
    }
  ]);

  assert.equal(matched.askPoint.key, "scream_cause");
  assert.ok(matched.score > 0);
});

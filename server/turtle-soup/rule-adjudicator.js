"use strict";

const { matchAskPoint } = require("./keyword-matcher");

function createRuleAdjudicator() {
  return {
    judgeQuestion({ question, askPoints }) {
      const matched = matchAskPoint(question, askPoints);
      if (!matched.askPoint || matched.score <= 0) {
        return {
          verdict: "irrelevant",
          reply: "无关",
          source: "rule",
          matchedKey: null,
        };
      }

      return {
        verdict: matched.score >= 1 ? "yes" : "close",
        reply: matched.score >= 1 ? "是" : "接近了",
        source: "rule",
        matchedKey: matched.askPoint.key,
      };
    }
  };
}

module.exports = { createRuleAdjudicator };

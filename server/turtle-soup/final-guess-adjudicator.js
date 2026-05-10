"use strict";

function normalize(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

function groupMatched(normalizedGuess, group) {
  return group.some(keyword => normalizedGuess.includes(normalize(keyword)));
}

function createFinalGuessAdjudicator() {
  return {
    async judgeGuess({ gameCase, guess }) {
      const normalizedGuess = normalize(guess);
      const groups = Array.isArray(gameCase.requiredFactGroups) ? gameCase.requiredFactGroups : [];
      const matchedCount = groups.filter(group => groupMatched(normalizedGuess, group)).length;
      const total = groups.length;

      if (total > 0 && matchedCount >= total) {
        return {
          outcome: "solved",
          reason: "core-causal-chain-captured",
          hostHint: "对，你已经抓住核心了。",
          scoreLabel: "完全命中",
          solved: true,
        };
      }

      if (total > 1 && matchedCount >= total - 1) {
        return {
          outcome: "close",
          reason: "missing-final-core-fact",
          hostHint: gameCase.closeHint || "你已经很接近真相了，还差最后一个关键原因。",
          scoreLabel: "接近真相",
          solved: false,
        };
      }

      return {
        outcome: "wrong",
        reason: "core-causal-chain-missed",
        hostHint: "这个方向还不够关键，再换个角度想想。",
        scoreLabel: matchedCount > 0 ? "部分命中" : "未命中",
        solved: false,
      };
    }
  };
}

module.exports = { createFinalGuessAdjudicator };

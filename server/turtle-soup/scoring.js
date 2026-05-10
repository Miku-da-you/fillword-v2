"use strict";

function tokenize(text) {
  return Array.from(new Set(String(text || "").toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]+/g) || []));
}

function createScoring() {
  return {
    scoreGuess(guess, fullTruth) {
      const guessTokens = tokenize(guess);
      const truthTokens = tokenize(fullTruth);
      const overlap = guessTokens.filter(token => truthTokens.includes(token)).length;
      const label = overlap >= 2 ? "完全命中" : overlap >= 1 ? "部分命中" : "未命中";
      return { label, overlap, solved: overlap >= 2 };
    },

    isSolved(score) {
      if (!score) return false;
      if (score.solved === true) return true;
      return ["完全命中", "破解成功", "成功破解"].includes(score.label);
    }
  };
}

module.exports = { createScoring };

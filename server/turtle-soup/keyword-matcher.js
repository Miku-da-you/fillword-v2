"use strict";

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function scoreAskPoint(question, askPoint) {
  const normalized = normalize(question);
  let score = 0;

  for (const group of askPoint.keywordGroups || []) {
    const hits = group.filter(keyword => normalized.includes(normalize(keyword))).length;
    if (hits > 0) {
      score += hits / group.length;
    }
  }

  return score;
}

function matchAskPoint(question, askPoints) {
  let best = null;
  for (const askPoint of askPoints || []) {
    const score = scoreAskPoint(question, askPoint);
    if (!best || score > best.score) {
      best = { askPoint, score };
    }
  }
  return best || { askPoint: null, score: 0 };
}

module.exports = { matchAskPoint };

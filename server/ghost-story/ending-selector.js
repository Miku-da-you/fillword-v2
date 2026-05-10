"use strict";

function selectEnding(accuracy) {
  if (accuracy >= 1) return "perfect";
  if (accuracy >= 0.5) return "partial";
  return "failed";
}

module.exports = { selectEnding };

"use strict";

const turtleCases = require("./turtle-soup/cases");
const ghostPacks = require("./ghost-story/packs");

function buildTurtleCaseSummaries(cases = turtleCases) {
  return cases.map(item => ({
    id: item.id,
    emoji: item.emoji || "🐢",
    title: item.title,
    summary: item.summary || item.opening,
  }));
}

function buildGhostPackSummaries(packs = ghostPacks) {
  return packs.map(item => ({
    id: item.id,
    emoji: item.emoji || "👻",
    title: item.title,
    summary: item.summary || item.intro,
  }));
}

module.exports = {
  buildGhostPackSummaries,
  buildTurtleCaseSummaries,
};

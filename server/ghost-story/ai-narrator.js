"use strict";

const { buildNarrationPrompt } = require("./prompt-builder");

function createGhostNarrator({ sparkClient } = {}) {
  async function fallbackIntro(pack) {
    return `欢迎进入《${pack.title}》。请留意所有看似普通、但其实不对劲的细节。`;
  }

  async function fallbackEnding({ endingText }) {
    return `AI总结：${endingText}`;
  }

  return {
    async narrateIntro(pack) {
      if (!sparkClient) return fallbackIntro(pack);
      try {
        return await sparkClient.complete({
          messages: [{ role: "user", content: buildNarrationPrompt({ pack, stage: "intro" }) }]
        });
      } catch (_error) {
        return fallbackIntro(pack);
      }
    },
    async narrateEnding({ pack, endingText }) {
      if (!sparkClient) return fallbackEnding({ endingText });
      try {
        return await sparkClient.complete({
          messages: [{ role: "user", content: buildNarrationPrompt({ pack, endingText, stage: "ending" }) }]
        });
      } catch (_error) {
        return fallbackEnding({ endingText });
      }
    }
  };
}

module.exports = { createGhostNarrator };

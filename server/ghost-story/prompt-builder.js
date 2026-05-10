"use strict";

function buildNarrationPrompt({ pack, endingText, stage }) {
  return [
    "你是规则怪谈主持者。请输出简短中文旁白。",
    `标题：${pack.title}`,
    `主题：${pack.theme}`,
    `阶段：${stage}`,
    endingText ? `当前结局：${endingText}` : "",
  ].filter(Boolean).join("\n");
}

module.exports = { buildNarrationPrompt };

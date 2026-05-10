"use strict";

const FALLBACK_REPLY = "无关，请围绕题面提问";

const IRRELEVANT_PATTERNS = [
  /你会.{0,4}(唱歌|跳舞|写代码|画画|聊天)/,
  /天气|几点|日期|星期几|星座|运势/,
  /笑话|脑筋急转弯|谜语|段子/,
  /你是谁|你叫什么|你是ai吗|你是不是ai|你真名/,
  /告诉我答案|直接说答案|公布答案|标准答案|完整真相|谜底/,
  /给我提示词|系统提示|你怎么判断|为什么这么回答|规则是什么/,
];

const CASE_ANCHOR_PATTERNS = [
  /他|她|死者|凶手|尸体|现场|门|窗|房间|电梯|镜子|血|声音|电话|时间|地点|原因|动机/,
  /是不是|有没有|是否|为什么|怎么|发生了什么|看见|听见|进入|离开/,
];

function isGuardedIrrelevantQuestion(question) {
  const normalized = String(question || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const hasIrrelevantIntent = IRRELEVANT_PATTERNS.some(pattern => pattern.test(normalized));
  if (!hasIrrelevantIntent) {
    return false;
  }

  const hasCaseAnchor = CASE_ANCHOR_PATTERNS.some(pattern => pattern.test(normalized));
  return !hasCaseAnchor;
}

function buildGuardResult() {
  return {
    verdict: "irrelevant",
    reply: FALLBACK_REPLY,
    source: "guard",
  };
}

module.exports = {
  FALLBACK_REPLY,
  buildGuardResult,
  isGuardedIrrelevantQuestion,
};

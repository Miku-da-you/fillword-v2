"use strict";

const { createRuleAdjudicator } = require("./rule-adjudicator");
const { buildQuestionPrompt } = require("./prompt-builder");
const { buildGuardResult, isGuardedIrrelevantQuestion } = require("./question-guard");

function mapVerdict(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["yes", "no", "irrelevant", "close"].includes(normalized)) {
    return normalized;
  }
  return null;
}

function mapReply(verdict, fallbackReply) {
  if (fallbackReply) return fallbackReply;
  if (verdict === "yes") return "是";
  if (verdict === "no") return "否";
  if (verdict === "close") return "接近了";
  return "无关";
}

function createAiAdjudicator({ sparkClient, ruleAdjudicator = createRuleAdjudicator() } = {}) {
  return {
    async judgeQuestion({ gameCase, question, history }) {
      if (isGuardedIrrelevantQuestion(question)) {
        return buildGuardResult();
      }

      const ruleResult = ruleAdjudicator.judgeQuestion({
        question,
        askPoints: gameCase.askPoints,
      });
      if (ruleResult.verdict !== "irrelevant") {
        return ruleResult;
      }

      try {
        if (!sparkClient) {
          throw new Error("missing spark client");
        }

        const raw = await sparkClient.complete({
          messages: [
            {
              role: "user",
              content: buildQuestionPrompt({ gameCase, question, history }),
            }
          ]
        });

        const parsed = JSON.parse(raw);
        const verdict = mapVerdict(parsed.verdict);
        if (!verdict) {
          throw new Error("invalid verdict");
        }

        return {
          verdict,
          reply: mapReply(verdict, parsed.reply),
          source: "ai",
        };
      } catch (_error) {
        return ruleResult;
      }
    }
  };
}

module.exports = { createAiAdjudicator };

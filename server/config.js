"use strict";

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig(env = process.env) {
  return {
    sparkApiPassword: String(env.SPARK_API_PASSWORD || "").trim(),
    sparkModel: String(env.SPARK_MODEL || "lite").trim(),
    sparkApiBaseUrl: String(
      env.SPARK_API_BASE_URL || "https://spark-api-open.xf-yun.com/v1/chat/completions"
    ).trim(),
    sparkTimeoutMs: toPositiveInt(env.SPARK_TIMEOUT_MS, 12000),
  };
}

module.exports = { getConfig };

"use strict";

const https = require("https");
const { URL } = require("url");

function requestJson(url, { method = "GET", headers = {}, body, timeoutMs = 12000, requestImpl = https.request } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = requestImpl(target, {
      method,
      headers,
      timeout: timeoutMs,
    }, (response) => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (error) {
          reject(error);
          return;
        }
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          json: async () => parsed,
        });
      });
    });

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("Spark request timed out"));
    });
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function createSparkLiteClient({
  apiPassword,
  model = "lite",
  baseUrl = "https://spark-api-open.xf-yun.com/v1/chat/completions",
  timeoutMs = 12000,
  fetchImpl = global.fetch,
  requestImpl = https.request,
} = {}) {
  async function complete({ messages, temperature = 0.2 }) {
    if (!apiPassword) {
      throw new Error("SPARK_API_PASSWORD is required");
    }

    const payload = JSON.stringify({
      model,
      messages,
      temperature,
    });
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiPassword}`,
    };
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = typeof fetchImpl === "function"
        ? await fetchImpl(baseUrl, {
          method: "POST",
          headers,
          body: payload,
          signal: controller ? controller.signal : undefined,
        })
        : await requestJson(baseUrl, {
          method: "POST",
          headers,
          body: payload,
          timeoutMs,
          requestImpl,
        });

      if (!response.ok) {
        throw new Error(`Spark request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Spark response missing content");
      }
      return String(content).trim();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return { complete };
}

module.exports = { createSparkLiteClient };

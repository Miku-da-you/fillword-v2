const test = require("node:test");
const assert = require("node:assert/strict");

const { getConfig } = require("../config");

test("config defaults Spark HTTP model to lite", () => {
  const config = getConfig({});

  assert.equal(config.sparkModel, "lite");
  assert.equal(config.sparkApiBaseUrl, "https://spark-api-open.xf-yun.com/v1/chat/completions");
  assert.equal(config.sparkTimeoutMs, 12000);
});

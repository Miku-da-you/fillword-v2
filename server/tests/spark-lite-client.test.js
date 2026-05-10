const test = require("node:test");
const assert = require("node:assert/strict");

const { createSparkLiteClient } = require("../integrations/spark-lite-client");

test("spark lite client sends bearer auth and returns assistant text", async () => {
  const calls = [];
  const client = createSparkLiteClient({
    apiPassword: "secret-password",
    model: "spark-lite",
    baseUrl: "https://spark-api-open.xf-yun.com/v1/chat/completions",
    timeoutMs: 1200,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "是"
              }
            }
          ]
        })
      };
    }
  });

  const text = await client.complete({
    messages: [{ role: "user", content: "测试问题" }]
  });

  assert.equal(text, "是");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://spark-api-open.xf-yun.com/v1/chat/completions");
  assert.equal(calls[0].options.headers.Authorization, "Bearer secret-password");
});

test("spark lite client throws when apiPassword is missing", async () => {
  const client = createSparkLiteClient({
    apiPassword: "",
    baseUrl: "https://spark-api-open.xf-yun.com/v1/chat/completions",
    fetchImpl: async () => ({ ok: true, json: async () => ({}) })
  });

  await assert.rejects(() => client.complete({ messages: [] }), /SPARK_API_PASSWORD/);
});

test("spark lite client defaults to lite model for the HTTP chat completions API", async () => {
  const calls = [];
  const client = createSparkLiteClient({
    apiPassword: "secret-password",
    baseUrl: "https://spark-api-open.xf-yun.com/v1/chat/completions",
    timeoutMs: 1200,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "连通成功"
              }
            }
          ]
        })
      };
    }
  });

  await client.complete({
    messages: [{ role: "user", content: "测试默认模型" }]
  });

  assert.match(calls[0].options.body, /"model":"lite"/);
});

test("spark lite client falls back to https request when fetch is unavailable", async () => {
  const calls = [];
  const payloads = [];
  const originalFetch = global.fetch;
  global.fetch = undefined;

  try {
    const client = createSparkLiteClient({
      apiPassword: "secret-password",
      model: "spark-lite",
      baseUrl: "https://spark-api-open.xf-yun.com/v1/chat/completions",
      timeoutMs: 1200,
      requestImpl: (url, options, onResponse) => {
        calls.push({ url, options });
        const handlers = {};
        const responseHandlers = {};
        queueMicrotask(() => {
          onResponse({
            statusCode: 200,
            on(event, handler) {
              responseHandlers[event] = handler;
            }
          });
          responseHandlers.data?.(Buffer.from(JSON.stringify({
            choices: [
              {
                message: {
                  content: "连通成功"
                }
              }
            ]
          })));
          responseHandlers.end?.();
        });
        return {
          on(event, handler) {
            handlers[event] = handler;
          },
          write(chunk) {
            payloads.push(String(chunk));
          },
          end() {},
          destroy(error) {
            handlers.error?.(error);
          }
        };
      }
    });

    const text = await client.complete({
      messages: [{ role: "user", content: "测试问题" }]
    });

    assert.equal(text, "连通成功");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers.Authorization, "Bearer secret-password");
    assert.match(payloads[0], /spark-lite/);
  } finally {
    global.fetch = originalFetch;
  }
});

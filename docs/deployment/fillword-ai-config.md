# Fillword AI 配置说明

## 适用范围

- 适用于 Fillword 1.1 的两个 AI 相关模式：
  - `海龟汤`：`Spark Lite` 主裁判，规则匹配兜底
  - `恐怖怪谈`：固定故事包 + AI 旁白 / 结果解释

## 环境变量

- `SPARK_API_PASSWORD`
  - 必填
  - 使用讯飞 Spark HTTP 调用凭证
- `SPARK_MODEL`
  - 可选
  - 默认值：`lite`
  - **注意**：讯飞通用 HTTP 接口的正确模型名是 `lite`，不是 `spark-lite`（`spark-lite` 是旧版 WebSocket 接口的 domain 参数，会导致 400 错误）
- `SPARK_API_BASE_URL`
  - 可选
  - 默认值：`https://spark-api-open.xf-yun.com/v1/chat/completions`
- `SPARK_TIMEOUT_MS`
  - 可选
  - 默认值：`12000`

## pm2 注入方式

- 编辑服务器上的环境变量后，执行：
  - `pm2 restart fillword --update-env`
- `server/ecosystem.config.js` 已预留以下字段：
  - `SPARK_API_PASSWORD`
  - `SPARK_MODEL`
  - `SPARK_API_BASE_URL`
  - `SPARK_TIMEOUT_MS`

## 推荐配置示例

```bash
export SPARK_API_PASSWORD='你的凭证'
export SPARK_MODEL='lite'
export SPARK_API_BASE_URL='https://spark-api-open.xf-yun.com/v1/chat/completions'
export SPARK_TIMEOUT_MS='12000'
pm2 restart fillword --update-env
```

## 安全约束

- 不要把 `SPARK_API_PASSWORD` 写进仓库
- 不要把密钥写进前端脚本
- 只允许服务端 `server/config.js` 读取该值

## 验证方式

- 先确认当前进程是否真的读到了 Spark 环境变量：

```bash
cd /opt/fillword/server
node -e "console.log(JSON.stringify({ hasPassword: Boolean(process.env.SPARK_API_PASSWORD), model: process.env.SPARK_MODEL || 'lite', baseUrl: process.env.SPARK_API_BASE_URL || 'https://spark-api-open.xf-yun.com/v1/chat/completions', timeout: process.env.SPARK_TIMEOUT_MS || '12000' }))"
```

- 判定规则：
  - 如果输出 `hasPassword: true`
    - 才允许继续做 Spark 成功链路验证
  - 如果输出 `hasPassword: false`
    - 说明当前进程没有拿到凭证
    - 这一轮只能验证规则兜底 / fallback 文案
    - **不能**宣称 “Spark Lite 已成功接入”
- 进程拿到凭证后，再做一次直连 smoke：

```bash
cd /opt/fillword/server
node <<'EOF'
const { createSparkLiteClient } = require("./integrations/spark-lite-client");

const client = createSparkLiteClient({
  apiPassword: process.env.SPARK_API_PASSWORD,
  model: process.env.SPARK_MODEL || "lite",
  baseUrl: process.env.SPARK_API_BASE_URL || "https://spark-api-open.xf-yun.com/v1/chat/completions",
  timeoutMs: Number(process.env.SPARK_TIMEOUT_MS || 12000),
});

client.complete({
  messages: [{ role: "user", content: "请只回复“连通成功”四个字。" }]
}).then(result => {
  console.log("SPARK_SMOKE_OK");
  console.log(result);
}).catch(error => {
  console.error("SPARK_SMOKE_FAIL");
  console.error(error.message);
  process.exit(1);
});
EOF
```

- 启动后先看 `pm2 logs fillword --lines 100`
- 再访问：
  - `http://117.72.205.240/fillword/app.html`
- 本地或公网验证时重点确认：
  - 至少一条真实 AI 调用成功，或明确记录失败原因
  - 海龟汤可以正常提问
  - AI 超时或失败时仍能回退到规则裁判
  - 恐怖怪谈在开局和结局阶段仍有 AI 文案

## 排障

- 如果提示 `SPARK_API_PASSWORD is required`
  - 说明环境变量没有注入到 pm2 进程
  - 重新 `export` 后执行 `pm2 restart fillword --update-env`
- 如果本地能玩，但 `hasPassword: false`
  - 说明当前只验证了降级链路
  - 还没有完成 Spark 成功接入验收
- 如果 AI 接口超时
  - 先确认服务器能访问讯飞接口
  - 再视情况提高 `SPARK_TIMEOUT_MS`
- 如果接口返回 `invalid param model`
  - 先确认 `SPARK_MODEL` 是否为 `lite`
  - 当前这个 HTTP 接口下，`spark-lite` 会被判定为无效模型名
- 如果海龟汤仍可继续玩
  - 说明规则兜底生效，这是预期行为

# Fillword 1.1 灰度发布清单

## 发布目标

- 保持 Fillword 1.0 主链路稳定
- 上线统一入口 `app.html`
- 接入 `海龟汤` 与 `恐怖怪谈`
- 验证房主/玩家统一识别、AI 能力和降级逻辑

## 发布前检查

- 本地 `server/` 执行 `npm test`
- 确认以下页面存在：
  - `public/app.html`
  - `public/host.html`
  - `public/player.html`
- 确认服务器环境变量已配置（通过 `source /etc/fillword/spark.env`）：
  - `SPARK_API_PASSWORD`
  - `SPARK_MODEL`
  - `SPARK_API_BASE_URL`
  - `SPARK_TIMEOUT_MS`
- 先在服务器进程环境里确认：
  - `cd /opt/fillword/server && source /etc/fillword/spark.env && node -e "console.log(JSON.stringify({ hasPassword: Boolean(process.env.SPARK_API_PASSWORD), model: process.env.SPARK_MODEL }))"`
  - 只有 `hasPassword: true` 才允许把本次发布判定为"已验证 Spark 成功接入"

## 灰度步骤

1. 上传新版本到 `/opt/fillword`
2. 进入 `server/` 执行 `bash deploy.sh`
3. 浏览器先验证：
   - `http://117.72.205.240/fillword/app.html`
4. 再验证兼容入口：
   - `http://117.72.205.240/fillword/host.html`
   - `http://117.72.205.240/fillword/player.html`
5. 用两台设备做最小回归：
   - Fillword 一轮
   - 海龟汤一轮
   - 恐怖怪谈一轮

## 核心验收点

- 房主建房后拿到 4 位房号
- 玩家只输入房号和昵称即可进入对应模式
- 海龟汤和恐怖怪谈中，房主显示名固定为 `房主`
- 房主刷新或断线后，用同一浏览器重新进入仍能识别为房主
- Fillword 结果链路不受影响

## AI 降级验证

- **重要：Spark Lite HTTP API 的正确模型名是 `lite`，不是 `spark-lite`**
  - 讯飞开放平台的通用接口（`spark-api-open.xf-yun.com`）对 `spark-lite` 返回 400：`invalid param model:spark-lite`
  - `spark-lite` 是旧版 WebSocket 接口的 domain 参数，不适用于新版 HTTP 接口
  - 默认值已修正为 `lite`（`server/config.js`），无需手动配置
- 先做 Spark smoke，确认能拿到真实返回：
  ```bash
  cd /opt/fillword/server
  source /etc/fillword/spark.env
  node <<'EOF'
  const { createSparkLiteClient } = require("./integrations/spark-lite-client");
  const client = createSparkLiteClient({
    apiPassword: process.env.SPARK_API_PASSWORD,
    model: process.env.SPARK_MODEL || "lite",
    baseUrl: process.env.SPARK_API_BASE_URL || "https://spark-api-open.xf-yun.com/v1/chat/completions",
    timeoutMs: Number(process.env.SPARK_TIMEOUT_MS || 12000),
  });
  client.complete({
    messages: [{ role: "user", content: "请只回复"连通成功"四个字。" }]
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
- 海龟汤正常提问一轮，确认有 AI 裁判回复
- 再模拟 Spark 不可用场景，确认海龟汤仍能继续完成一轮
- 恐怖怪谈至少验证一次：
  - 开场旁白存在
  - 结局解释存在
- 如果 `hasPassword: false`
  - 本轮只能验 fallback
  - 发布记录里必须明确写"Spark 成功链路未完成验收"

## 回滚条件

- Fillword 建房 / 入房 / 出结果任一链路异常
- 统一入口无法进入
- `host.html` 或 `player.html` 不再能跳转
- 房主重连后丢失房主身份

## 回滚方法

- 查看最近备份：
  - `ls -lh /opt/fillword_backups`
- 按需恢复：
  - `cd /opt/fillword/server && bash restore.sh <backup-name>`

## 发布后观察

- `pm2 logs fillword --lines 100`
- `tail -n 100 /www/wwwlogs/smartresume.error.log`
- 若 AI 模式报错，优先检查：
  - 环境变量是否生效
  - 讯飞接口是否可达（注意：HTTP 接口需要 `model: "lite"`，不是 `spark-lite`）
  - 是否已正确回退到规则裁判
- 若海龟汤或怪谈能玩但没有真实 AI 成功证据
  - 不要记为 "Spark 已接通"
  - 只记为 "fallback 可用，待服务器凭证验证成功链路"

## Spark 环境文件

服务器上通过以下文件注入环境变量：

```
/etc/fillword/spark.env
```

内容示例：

```bash
export SPARK_API_PASSWORD='你的凭证'
export SPARK_MODEL='lite'
export SPARK_API_BASE_URL='https://spark-api-open.xf-yun.com/v1/chat/completions'
export SPARK_TIMEOUT_MS='12000'
```

`deploy.sh` 和 `restore.sh` 会在启动 pm2 前自动 `source /etc/fillword/spark.env`，无需手动注入。
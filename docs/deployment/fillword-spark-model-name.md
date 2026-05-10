# Spark Lite 模型名说明

## 背景

讯飞开放平台的通用 HTTP 接口（`spark-api-open.xf-yun.com/v1/chat/completions`）与旧版 WebSocket 接口使用不同的模型标识方式：

| 接口类型 | URL | 模型名 |
|----------|-----|--------|
| 通用 HTTP 接口（新版） | `spark-api-open.xf-yun.com` | `lite`、`pro`、`max` 等 |
| WebSocket 接口（旧版） | `spark-api.xf-yun.com` | 通过 `domain` 参数指定（如 `general`、`generalv3.5`） |

## 错误与正确

- **错误**：`model: "spark-lite"` → 讯飞 HTTP 接口返回 `400 invalid param model:spark-lite`
- **正确**：`model: "lite"` → 讯飞 HTTP 接口返回 `200`，AI 正常响应

## 当前配置

- `server/config.js` 默认值已修正为 `"lite"`
- `SPARK_MODEL` 环境变量无需手动配置（`/etc/fillword/spark.env` 里已写入 `lite`）
- 任何文档里看到 `SPARK_MODEL='spark-lite'` 都应改为 `SPARK_MODEL='lite'`

## 本地调试

如果本地想要验证 Spark 连通性，在 `server/` 目录执行：

```bash
node -e "const {createSparkLiteClient}=require('./integrations/spark-lite-client'); createSparkLiteClient({apiPassword:process.env.SPARK_API_PASSWORD}).complete({messages:[{role:'user',content:'请只回复连通成功四个字。'}]}).then(r=>console.log('OK:',r)).catch(e=>console.error('FAIL:',e.message))"
```
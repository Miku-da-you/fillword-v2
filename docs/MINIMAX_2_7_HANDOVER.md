# Minimax 2.7 接手文档

> 目的：让 `minimax 2.7` 在**不依赖历史对话**的前提下，直接接手当前 Fillword 项目，并清楚知道哪里可以动、哪里不能改、当前已经完成到什么程度、下一步先做什么。

## 先读这个

- `docs/CODEOX_HANDOVER.md` 已经过时，只能当历史材料看，**不能**再作为当前项目事实来源。
- 当前真实架构以这些文件为准：
  - `public/app.html`
  - `public/host.html`
  - `public/player.html`
  - `public/scripts/pages/app.js`
  - `server/server.js`
- 当前线上已部署并可访问：
  - `http://117.72.205.240/fillword/app.html`
  - `http://117.72.205.240/fillword/host.html`
  - `http://117.72.205.240/fillword/player.html`
- 当前本地测试基线已通过：
  - 在 `server/` 目录执行 `npm test`

## 当前真实状态

### 已完成

- Fillword、海龟汤、规则怪谈三种模式都已经有真实实现，不是待开发草案。
- 统一入口已经落地：
  - `app.html` 是主入口
  - `host.html`、`player.html` 当前是兼容入口，最终会进入统一入口
- 服务端是单入口分发，不是旧文档里那种拆散的多套路由：
  - `server/server.js` 同时接 Fillword / Turtle / Ghost
- 创建页内容摘要已经统一由服务端提供：
  - `server/mode-content.js`
  - `/fillword/content-manifest`
  - `public/scripts/pages/app.js`
- 怪谈主链路已经修到可用：
  - 玩家提交后会进入等待态
  - 全员提交后会进入结局页
- 海龟汤主链路已经修到可用：
  - 提问链路可走通
  - 最终猜测可走通
  - 玩家提交猜测后会进入等待态，不会再误导成"还没提交"
- 公网三模式 smoke 已通过。
- **Spark Lite HTTP 接口已成功接入**，服务已上线。

### 当前唯一关键未收口项

- ~~Spark Lite 代码接线已经存在，但还不能算成功接入~~（**已解决**）
- ~~原因不是代码没写，而是当前进程环境没有注入 `SPARK_API_PASSWORD`~~（**已解决**）
- 已修复的核心问题：
  - `server/config.js` 的默认模型名从 `spark-lite` 改为 `lite`（讯飞通用接口的正确名称）
  - `server/integrations/spark-lite-client.js` 添加了 Node 16 环境 `fetch` 不可用时的 `https` fallback
  - `server/deploy.sh` 和 `server/restore.sh` 在 pm2 启动前自动 `source /etc/fillword/spark.env` 注入环境变量
  - 服务器上已写入 `/etc/fillword/spark.env`，包含讯飞凭证、`SPARK_MODEL='lite'` 等配置

## 代码结构速览

### Fillword 核心

- 服务端：
  - `server/room-manager.js`
  - `server/templates.js`
- 前端：
  - `public/scripts/renderers/fillword-renderer.js`
  - `public/scripts/shared/templates.js`

### 海龟汤核心

- 服务端：
  - `server/turtle-soup/manager.js`
  - `server/turtle-soup/ai-adjudicator.js`
  - `server/turtle-soup/rule-adjudicator.js`
  - `server/turtle-soup/cases.js`
- 前端：
  - `public/scripts/renderers/turtle-renderer.js`

### 规则怪谈核心

- 服务端：
  - `server/ghost-story/manager.js`
  - `server/ghost-story/ai-narrator.js`
  - `server/ghost-story/judge.js`
  - `server/ghost-story/ending-selector.js`
  - `server/ghost-story/packs.js`
- 前端：
  - `public/scripts/renderers/ghost-renderer.js`

### 统一入口与共享层

- 页面编排：
  - `public/scripts/pages/app.js`
- socket 共享层：
  - `public/scripts/shared/app-socket.js`
  - `public/scripts/shared/socket.js`
  - `public/scripts/shared/client-identity.js`
- 服务端总入口：
  - `server/server.js`

### 部署与 AI

- 部署：
  - `server/deploy.sh`
  - `server/restore.sh`
  - `server/ecosystem.config.js`
  - `/etc/fillword/spark.env`（服务器端，无需进仓库）
- AI 配置：
  - `server/config.js`
  - `server/integrations/spark-lite-client.js`
  - `docs/deployment/fillword-ai-config.md`
  - `docs/deployment/fillword-v1.1-rollout.md`

## 你可以修改的地方

### 允许修改的范围

- 海龟汤主链路 bug 修复：
  - `server/turtle-soup/*`
  - `public/scripts/renderers/turtle-renderer.js`
- 规则怪谈主链路 bug 修复：
  - `server/ghost-story/*`
  - `public/scripts/renderers/ghost-renderer.js`
- 三模式共享层的**最小必要**修复：
  - `server/server.js`
  - `public/scripts/pages/app.js`
  - `public/scripts/shared/*`
- 与当前问题直接相关的测试补齐：
  - `server/tests/*.test.js`
- Spark 接入所需的配置修正：
  - `server/config.js`
  - `server/ecosystem.config.js`
  - `server/integrations/spark-lite-client.js`
  - `docs/deployment/fillword-ai-config.md`
  - `docs/deployment/fillword-v1.1-rollout.md`

### 允许修改时的前提

- 修改必须服务于下面两类目标之一：
  - 海龟汤 / 规则怪谈可用性收口
  - Spark 成功接入验证
- 修改共享层前，先看现有测试是否已覆盖对应行为。
- 只要动了共享层，就必须重新验证 Fillword。
- 优先做最小修复，不要顺手重写结构。

## 你不可以修改的地方

### 禁改规则

- **不要改 Fillword 玩法**
  - 不改 `server/room-manager.js` 的业务规则
  - 不改 `public/scripts/renderers/fillword-renderer.js` 的用户可见交互语义
  - 不改 `public/scripts/shared/templates.js` 的玩法定位，除非是纯数据勘误且已确认不改变玩法
- **不要把 Spark 密钥写进仓库**
  - 不要把 `SPARK_API_PASSWORD` 写进任何 `.js`、`.md`、前端脚本或提交产物
  - 密钥只能通过服务器 `/etc/fillword/spark.env` 注入，deploy.sh/restore.sh 会自动加载
- **不要基于 `_rollback_1_0/` 继续开发新功能**
  - `_rollback_1_0/` 只是历史基线和回滚素材
  - 不是当前主开发目录
- **不要回到旧的多入口拆散路线**
  - 当前真实入口是 `app.html`
  - 不要把项目重新拆回旧文档那种 `host-turtle.html` / `player-ghost.html` 主导的路线
- **不要做无关大重构**
  - 当前目标是稳定收口
  - 不要为了"架构更优雅"去大面积移动文件或重写状态机

### Fillword 的正确边界

- Fillword 当前视为稳定基线。
- 对 Fillword 允许做的事只有：
  - 共享层变更后的回归保护
  - 不改变用户可见行为的兼容性修复
- 不允许做的事：
  - 改流程
  - 改文案语义
  - 改房主 / 玩家规则
  - 改结果生成玩法

## 部署与 Spark 边界

### 当前部署事实

- 服务器：
  - `117.72.205.240`
- 部署目录：
  - `/opt/fillword/`
- pm2 配置：
  - `server/ecosystem.config.js`
- 健康检查：
  - `http://117.72.205.240/healthz`
- 环境变量文件（服务器端，无需进仓库）：
  - `/etc/fillword/spark.env`

### 当前 Spark 事实

- `server/server.js` 会读取 `getConfig()`，并在有密码时创建 `sparkClient`。
- `server/ecosystem.config.js` 已支持透传：
  - `SPARK_API_PASSWORD`
  - `SPARK_MODEL`
  - `SPARK_API_BASE_URL`
  - `SPARK_TIMEOUT_MS`
- `server/deploy.sh` 和 `server/restore.sh` 会在 pm2 启动前自动 `source /etc/fillword/spark.env`。
- **模型名约定**：
  - HTTP 通用接口（`spark-api-open.xf-yun.com`）的正确模型名是 `lite`，**不是** `spark-lite`
  - `spark-lite` 是旧版 WebSocket 接口的 `domain` 参数，对新版 HTTP 接口会返回 400
  - `server/config.js` 默认值已修正为 `lite`

### Spark 的硬规则

- 只要 `hasPassword: false`，就**不能**写"Spark 已接通"。
- 只有同时满足下面条件，才算 Spark 成功接入：
  - 服务器进程已拿到 `SPARK_API_PASSWORD`
  - smoke 成功返回（注意模型名用 `lite`，不是 `spark-lite`）
  - 至少一个真实业务链路命中 AI 返回

## 接手后第一优先级

- 按这个顺序做：
  1. 读 `docs/deployment/fillword-ai-config.md`
  2. 读 `docs/deployment/fillword-v1.1-rollout.md`
  3. 去服务器确认当前进程是否拿到 `SPARK_API_PASSWORD`：
     ```bash
     cd /opt/fillword/server && source /etc/fillword/spark.env && node -e "console.log(JSON.stringify({ hasPassword: Boolean(process.env.SPARK_API_PASSWORD), model: process.env.SPARK_MODEL }))"
     ```
  4. 如果有密码，跑文档里的 Spark smoke 确认真实连通
  5. 再跑一次海龟汤或规则怪谈业务链路，确认真实命中 AI
  6. 如果过程中动了共享层，最后复跑 Fillword

## 接手时优先参考的文档

- 发布清单：
  - `docs/deployment/fillword-v1.1-rollout.md`
- AI 配置说明：
  - `docs/deployment/fillword-ai-config.md`
- 最新可用性计划：
  - `.trae/documents/2026-05-04-turtle-ghost-availability-plan.md`

## 最后提醒

- 你现在接手的不是"待开发 1.1"，而是"已经上线、Spark 成功链路已验收的 1.1"。
- 最大风险不是功能没写，而是：
  - 动了 Fillword 稳定基线
  - 把 fallback 误写成 Spark 成功
  - 按旧交接文档的过时架构继续改
  - 用错误的模型名（`spark-lite` 而不是 `lite`）导致讯飞接口返回 400
- 只要守住这四条边界，后续工作基本不会跑偏。
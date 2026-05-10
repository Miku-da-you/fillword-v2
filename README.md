# Fillword Party

> 一个支持多人实时联机的派对游戏项目，包含 `Fillword`、`海龟汤`、`恐怖怪谈` 三种玩法。

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Status](https://img.shields.io/badge/status-active-2ea44f)](https://github.com/Miku-da-you/fillword-v2)
[![Deploy](https://img.shields.io/badge/deploy-PM2%20%2B%20Nginx-blue)](./docs/deployment/fillword-jdcloud.md)

Fillword Party 是一个面向小型聚会、朋友局和轻推理场景的浏览器多人游戏项目。整个项目围绕“统一入口 + 房间号加入 + 多模式共存”来设计，目前已经实现三种核心玩法：

- `Fillword`：多人分工填词，由房主汇总并生成最终结果
- `海龟汤`：玩家自由提问，主持人按 `是 / 否 / 接近 / 无关` 裁决并推进推理
- `恐怖怪谈`：玩家阅读章节、回答问题，并根据表现解锁不同结局

在线入口：

- 游戏主页：[http://117.72.205.240/fillword/app.html](http://117.72.205.240/fillword/app.html)
- 健康检查：[http://117.72.205.240/healthz](http://117.72.205.240/healthz)

## 项目亮点

- 统一的移动端优先入口，房主和玩家共用一套进入流程
- 基于 `Socket.IO` 的实时房间同步
- 一个项目内承载三种不同风格的派对玩法
- `海龟汤` 支持 AI 主持 + 规则兜底
- `恐怖怪谈` 支持 AI 旁白增强 + 确定性流程控制
- 支持 `PM2 + Nginx` 单机部署
- 已完成开源清理，仓库内不包含服务器密码和 AI 密钥

## 玩法说明

### 1. Fillword

这是项目最早的协作填词模式，适合快节奏朋友局。

- 房主创建房间并选择模板
- 每位玩家拿到不同的填写字段
- 玩家分别提交自己的答案
- 全员完成后，由房主一键生成最终结果文案

适合场景：

- 朋友聚会破冰
- 轻松搞笑的多人协作
- 即兴创作类小游戏

### 2. 海龟汤

这是一个偏推理和问答主持的模式。

- 房主先选择题包并开局
- 玩家使用自然语言自由提问
- 主持系统返回 `是 / 否 / 接近 / 无关`
- 跑题问题会被优先拦截，避免整局节奏被带偏
- 明显命中题面线索的问题会优先走规则裁决，减少 AI 波动

当前主持策略特点：

- 明显无关的问题会直接判为 `irrelevant`
- 试图直接套答案、问规则、闲聊的内容会被拦下
- 明确命中关键词的问题优先由规则裁决
- 其余相关但不够精确的问题，仍然交给 AI 增强判断

### 3. 恐怖怪谈

这是一个章节式、带结局分支的阅读推理模式。

- 房主选择故事包
- 玩家阅读当前章节并回答题目
- 正确率会影响后续推进与结局
- AI 可用于强化开场旁白和结尾氛围，但核心逻辑仍然是可控的

适合场景：

- 氛围型聚会
- 多人短篇规则怪谈体验
- 轻量剧情推理解谜

## 技术栈

- 前端：原生 HTML / CSS / JavaScript
- 后端：Node.js、Express、Socket.IO
- 进程管理：PM2
- 反向代理：Nginx
- AI 接入：Spark HTTP Chat Completions API
- 测试：Node.js 内置测试运行器

## 快速开始

### 环境要求

- Node.js `16+`
- npm

### 安装依赖

```bash
cd server
npm install
```

### 本地启动

```bash
cd server
npm start
```

启动后访问：

- `http://127.0.0.1:3000/fillword/app.html`

### 开发模式

```bash
cd server
npm run dev
```

### 运行测试

```bash
cd server
npm test
```

## 环境变量

仓库中不会提交任何真实密钥或服务器口令。

部署相关环境变量可以参考 [.env.example](./.env.example)：

```env
FILLWORD_SSH_HOST=example.com
FILLWORD_SSH_USER=root
FILLWORD_SSH_PASSWORD=replace-me
FILLWORD_PUBLIC_HOST=example.com
FILLWORD_PUBLIC_URL=http://example.com/fillword
FILLWORD_LOCAL_ARCHIVE=C:\path\to\fillword-deploy.tar.gz
FILLWORD_REMOTE_ARCHIVE=/root/fillword-deploy.tar.gz
```

AI 相关环境变量主要包括：

- `SPARK_API_PASSWORD`
- `SPARK_MODEL`
- `SPARK_API_BASE_URL`
- `SPARK_TIMEOUT_MS`

详细说明见：

- [docs/deployment/fillword-ai-config.md](./docs/deployment/fillword-ai-config.md)
- [docs/deployment/fillword-spark-model-name.md](./docs/deployment/fillword-spark-model-name.md)

## 部署说明

当前项目采用 Linux 单机部署，使用 `PM2 + Nginx`。

高层流程如下：

1. 打包项目文件
2. 上传到服务器
3. 执行 `server/deploy.sh`
4. 重启 PM2 进程
5. 校验 `/healthz` 与 `/fillword/app.html`

相关文件：

- [server/deploy.sh](./server/deploy.sh)
- [server/restore.sh](./server/restore.sh)
- [server/ecosystem.config.js](./server/ecosystem.config.js)
- [docs/deployment/fillword-jdcloud.md](./docs/deployment/fillword-jdcloud.md)
- [docs/deployment/fillword-backup-restore.md](./docs/deployment/fillword-backup-restore.md)

仓库中的辅助部署脚本已经改为从环境变量读取 SSH 信息，不再在源码里写死敏感数据：

- [deploy_remote_fillword.py](./deploy_remote_fillword.py)
- [deploy_fix_remote.py](./deploy_fix_remote.py)
- [cutover_fillword.py](./cutover_fillword.py)

## 目录结构

```text
fillword_v2/
|- public/                 # 前端统一入口与静态资源
|  |- app.html
|  |- scripts/
|  |  |- pages/            # 页面逻辑
|  |  |- renderers/        # 各模式渲染器
|  |  `- shared/           # 共享前端工具
|  `- styles/
|- server/                 # Express + Socket.IO 服务端
|  |- turtle-soup/         # 海龟汤相关逻辑
|  |- ghost-story/         # 恐怖怪谈相关逻辑
|  |- integrations/        # AI / 外部服务接入
|  |- tests/               # 自动化测试
|  `- server.js
|- docs/                   # 部署文档、交接文档、设计文档
|- dist/                   # 部署用静态产物
|- _rollback_1_0/          # 早期稳定版本回滚快照
`- .env.example            # 安全的环境变量示例
```

## 实时流程

项目的核心实时链路大致如下：

1. 房主从统一入口创建房间
2. 后端根据模式把房间交给对应的 manager 管理
3. 玩家通过房间号加入同一局
4. `Socket.IO` 广播房间状态变化
5. 前端根据身份、模式和状态切换不同渲染内容

主入口文件位于 [server/server.js](./server/server.js)。

## 当前状态

目前已经具备：

- 统一游戏入口
- Fillword 房间流程可用
- 海龟汤主持逻辑可用，并带 AI + 规则双保险
- 恐怖怪谈章节推进与结局逻辑可用
- 后端与前端契约测试已覆盖
- 仓库已公开，且完成敏感信息清理

## 安全说明

- 仓库中不保存服务器密码
- 仓库中不保存 AI API key
- 部署脚本已改为依赖环境变量注入凭据
- Spark 相关密钥应只存在于服务器环境中，不应进入版本库

如果你 fork 这个项目，请继续保持这一约束。

## 仓库与线上地址

- GitHub 仓库：[https://github.com/Miku-da-you/fillword-v2](https://github.com/Miku-da-you/fillword-v2)
- 在线版本：[http://117.72.205.240/fillword/app.html](http://117.72.205.240/fillword/app.html)

## 备注

- 当前线上环境仍然是 Node.js 16
- 安装 PM2 时可能看到 engine warning，但目前部署仍可正常运行
- 仓库暂时还没有单独提供 `LICENSE` 文件


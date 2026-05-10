# Fillword 1.1 项目交接文档

> **编写时间**：2026-05-03
> **编写人**：当前 Claude/Trae 会话
> **目的**：让 Codex（或接手此项目的 AI Agent）能独立继续 Fillword 1.1 的开发，不需要再翻历史对话

---

## 一、项目背景

### 1.1 是什么

Fillword 是一个多人派对填词游戏，有三种玩法：

| 模块 | 描述 | 当前状态 |
|------|------|---------|
| **Fillword** | 多人分工填词，主持人一键生成离谱成品 | ✅ 1.0 稳定在线 |
| **海龟汤** | 系统出题，玩家自由提问，系统关键词裁判，最后猜真相 | ❌ 待实现 |
| **恐怖怪谈** | 阅读推理题，选择题+判断题，根据正确率解锁不同结局 | ❌ 待实现 |

### 用户的核心诉求

- 用户优先目标是**稳定上线、可完美运行**
- 用户明确要求：Fillword 1.0 不改动，海龟汤和怪谈要**真正独立**，遵循各自原有规则
- 不接受"换皮填词"——海龟汤必须是问答推理，怪谈必须是阅读推理
- 剧本/题包要精彩、有梗、内容丰富

---

## 二、当前项目结构

### 代码根目录
```
c:\Users\Chandler Qi\Desktop\fillword_v2\
```

### 已确认稳定的 1.0 文件（直接可用）

```
_rollback_1_0\                      ← 干净 1.0 回退包源代码
  public\
    host.html                       ← 主持人入口（简洁，无模式选择）
    player.html                      ← 玩家入口
    scripts\
      shared\
        templates.js                ← 6 套剧本（社死自我介绍、打工人周报、中二觉醒、家族群迷惑文学、网红带货、宿舍夜谈）
        utils.js                     ← 通用工具（escapeHtml/collectAnswers/showError 等）
        socket.js                    ← Socket.IO 封装（createRoom/joinRoom/submitAnswers/generateResult/closeRoom）
      pages\
        host.js                     ← 主持人逻辑（选模板、建房、等人、生成结果）
        player.js                    ← 玩家逻辑（入房、填词、提交、等待结果）
    styles\
      tokens.css                     ← CSS 变量
      base.css                       ← 基础布局
      host.css                       ← 主持人页样式
      player.css                     ← 玩家页样式
      result.css                     ← 结果页样式
  server\
    server.js                       ← Express + Socket.IO 主入口（纯 1.0 协议）
    room-manager.js                   ← 房间管理器（纯 1.0 逻辑，无 mode 字段）
    templates.js                      ← 模块入口：`module.exports = require("../public/scripts/shared/templates.js")`
    utils.js                          ← generateRoomCode / createError / createPlayerId
    package.json                      ← 依赖：express, socket.io, socket.io-client
    ecosystem.config.js               ← pm2 配置（cwd: /opt/fillword/server）
    deploy.sh                         ← 部署脚本（含 python3 回退、pm2 重启、nginx reload）
  docs\
    deployment\
      fillword-jdcloud.md           ← 京东云部署说明
```

### 已被回退的错误代码（不要用）

```
public\scripts\shared\content\      ← 旧版 1.1 的内容目录（已废弃）
public\scripts\shared\game-catalog.js
public\scripts\shared\mode-definitions.js
public\scripts\shared\result-renderers.js
public\scripts\pages\player-mode-renderers.js
server\game-modes\                   ← 旧版 1.1 的模式层（已废弃）
  index.js
  fillword-mode.js
  turtle-soup-mode.js
  ghost-story-mode.js
server\tests\                        ← 旧版 1.1 的多模式测试（已废弃）
  mode-registry.test.js
  turtle-soup-mode.test.js
  ghost-story-mode.test.js
  server-flow-modes.test.js
```

**重要**：这些文件虽然在本地还有，但服务器上已经彻底删除了。交接后实现新功能时，**不要基于这些旧文件继续开发**，而是重新按设计文档来。

---

## 三、服务器环境

| 项目 | 值 |
|------|---|
| IP | 117.72.205.240 |
| SSH 端口 | 22 |
| 用户名 | root |
| 密码 | `<通过环境变量或密码管理器提供>` |
| 服务端口 | 3000 |
| 公网地址 | http://117.72.205.240/fillword |
| 主持人入口 | http://117.72.205.240/fillword/host.html |
| 玩家入口 | http://117.72.205.240/fillword/player.html |
| 健康检查 | http://117.72.205.240/healthz |

**当前部署**：pm2 管理，`pm2 start ecosystem.config.js`，`cwd: /opt/fillword/server`

**部署路径**：`/opt/fillword/`

**发布方式**：本地打包 `tar.gz` → `pscp` 上传 → `plink` 执行远端解压 + `pm2 restart fillword`

**npm 命令**：
```bash
# 安装依赖
cd /opt/fillword/server && npm install

# 重启服务
pm2 restart fillword

# 查看日志
pm2 logs fillword
```

**nginx 配置**：宝塔面板管理，`smartresume.conf`，反向代理到 `http://127.0.0.1:3000/fillword/`

**Node 版本**：v16.20.2（CentOS 7 上无法升级）

**已知警告**：`pm2 EBADENGINE` 警告（pm2@7.0.1 需要 Node >= 18），当前不阻断运行，忽略即可。

---

## 四、设计文档（核心参考）

**设计文档路径**：
```
c:\Users\Chandler Qi\Desktop\fillword_v2\docs\superpowers\specs\2026-05-03-fillword-v1.1-corrected-design.md
```

**设计文档核心内容摘要**：

### A. Fillword（保持 1.0）

- 流程：主持人选剧本 → 建房 → 玩家入房拿分配字段 → 提交 → 主持人生成结果
- 状态：`waiting → collecting → all_submitted → result_ready → closed`
- 代码要求：**完全不改**

### B. 海龟汤（新实现）

**玩法**：
- 系统展示开场题面
- 玩家输入自由问题
- 系统用关键词匹配回答"是 / 否 / 无关 / 接近了"
- 每 N 轮未问到关键点，系统自动释放提示
- 猜测阶段：玩家提交真相猜测
- 公布真相，判定命中程度

**服务端题包结构**：
```js
{
  id: "late-night-elevator",
  title: "深夜电梯",
  opening: "一个人深夜进入电梯...",
  askPoints: [
    {
      key: "scream_cause",
      question: "他为什么尖叫？",
      answerType: "yes_no",
      truth: "他看见了镜子里的自己",
      keywordGroups: [
        ["镜子", "镜子里", "倒影"],
        ["自己的脸", "自己的样子"]
      ],
      hint: "提示层级1：和他看到的东西有关",
      hint2: "提示层级2：不是灵异，是他自己的形象"
    }
  ],
  fullTruth: "完整真相故事...",
  difficulty: 3
}
```

**状态**：`lobby → opening → asking → hinting → guessing → truth_reveal → closed`

**关键词匹配**：把玩家提问拆词，和每个 `askPoints[keywordGroups]` 做交集匹配，有交集 → "是"或"接近了"，无交集 → "否"或"无关"

### C. 恐怖怪谈（新实现）

**玩法**：
- 系统展示故事章节
- 玩家阅读后做选择题（2-3 道）
- 有 1-2 道真假判断题
- 系统计算正确率 → 解锁对应结局
- 展示完整故事 + 结局 + 各玩家得分

**怪谈包结构**：
```js
{
  id: "dormitory-rule-13",
  title: "宿舍守则第13条",
  theme: "规则怪谈",
  intro: "新生入学手册里...",
  chapters: [
    {
      chapterTitle: "第一章：深夜的敲门声",
      content: "凌晨2点，宿舍楼一片寂静...",
      sceneType: "choice"
    }
  ],
  questions: [
    {
      id: "q1",
      chapterIndex: 0,
      question: "敲门声最可能来自？",
      options: ["隔壁宿舍", "走廊尽头的值班室", "门外不是人"],
      correctIndex: 2,
      hint: "提示：守则里提到过走廊尽头"
    },
    {
      id: "q2",
      type: "true_false",
      question: "判断题：宿舍守则第13条是真实存在的。",
      answer: true,
      hint: "提示：所有"第13条"传说都有个共同点"
    }
  ],
  endings: {
    perfect: "你成功找到了第13条...",
    partial: "你没有完全找出第13条...",
    failed: "你不相信第13条的存在..."
  }
}
```

**状态**：`lobby → reading → choosing → judging → ending_reveal → closed`

---

## 五、推荐实现方案

### 架构选择

**推荐方案**：三个独立子系统，只复用 Socket.IO 连接和房间码机制

```
server/
  server.js                    ← 共享 Socket.IO（不变）
  room-manager.js              ← Fillword 专用（不变）
  turtle-soup/
    cases.js                   ← 题包数据（静态 JS）
    keyword-matcher.js         ← 关键词匹配引擎
    adjudicator.js             ← 问答判定器
    room.js                    ← 海龟汤房间状态管理
    router.js                  ← Socket.IO 事件路由
  ghost-story/
    packs.js                   ← 怪谈包数据（静态 JS）
    judge.js                   ← 判断与结局选择器
    room.js                    ← 怪谈房间状态管理
    router.js                  ← Socket.IO 事件路由

public/
  host-fillword.html           ← Fillword 主持人（不变）
  player-fillword.html        ← Fillword 玩家（不变）
  host-turtle.html             ← 海龟汤主持人
  player-turtle.html          ← 海龟汤玩家
  host-ghost.html             ← 怪谈主持人
  player-ghost.html           ← 怪谈玩家
```

**入口策略**：
- `?mode=fillword|turtle|ghost` URL 参数跳转到各自子系统
- 或直接用不同文件：`host-turtle.html`、`player-turtle.html` 等

**不要复用**：不要把三个游戏强行揉进同一个房间状态机。各自的房间状态各自管理，只在 Socket.IO 连接层共享。

### 海龟汤关键词匹配算法（伪代码）

```js
function matchQuestion(playerQuestion, askPoint) {
  const words = tokenize(playerQuestion); // 拆词，去停用词
  for (const group of askPoint.keywordGroups) {
    const intersection = words.filter(w => group.includes(w));
    if (intersection.length > 0) {
      // 有交集，判断是否命中真相关键词
      const truthWords = tokenize(askPoint.truth);
      const hit = intersection.some(w => truthWords.includes(w));
      return hit ? "接近了" : "是";
    }
  }
  return "无关";
}
```

### 上线顺序建议

1. **阶段一**：实现海龟汤（服务端 + 前端 + 3-5 个精品题包）+ 本地测试
2. **阶段二**：实现怪谈（服务端 + 前端 + 3-5 个精品怪谈包）+ 本地测试
3. **阶段三**：公网灰度上线海龟汤 → 验收 → 上线怪谈 → 确认 Fillword 1.0 不受影响

---

## 六、已完成的本地回退包

```
_rollback_1_0\
  ← 这就是干净 1.0 的完整源代码
  ← 可以在此基础上直接开始实现海龟汤和怪谈
  ← 不要基于旧版 game-modes/ 继续开发
```

**如果要做本地测试**：把 `_rollback_1_0\` 内容解压到 `/opt/fillword/` 覆盖即可恢复 1.0。

---

## 七、Socket.IO 事件参考（1.0 协议）

### 现有事件

| 事件 | 方向 | 负载 | 说明 |
|------|------|------|------|
| `create_room` | C→S | `{templateId, targetPlayerCount}` | 建房 |
| `join_room` | C→S | `{roomCode, playerName}` | 入房 |
| `submit_answers` | C→S | `{answers: {fieldKey: value}}` | 提交答案 |
| `generate_result` | C→S | `{}` | 生成结果（主持人） |
| `close_room` | C→S | `{}` | 关闭房间 |
| `room_state` | S→C | 完整房间状态对象 | 广播 |
| `result_generated` | S→C | 结果对象 | 广播 |
| `room_closed` | S→C | `{roomId}` | 广播 |

### 新游戏新增事件（建议）

| 事件 | 方向 | 负载 | 说明 |
|------|------|------|------|
| `create_turtle_room` | C→S | `{caseId}` | 海龟汤建房 |
| `join_turtle_room` | C→S | `{roomCode, playerName}` | 海龟汤入房 |
| `ask_question` | C→S | `{question}` | 玩家提问 |
| `submit_guess` | C→S | `{guess}` | 玩家提交猜测 |
| `turtle_room_state` | S→C | 海龟汤状态 | 广播 |
| `turtle_truth_reveal` | S→C | 真相对象 | 广播 |
| `create_ghost_room` | C→S | `{packId}` | 怪谈建房 |
| `join_ghost_room` | C→S | `{roomCode, playerName}` | 怪谈入房 |
| `submit_choice` | C→S | `{questionId, answer}` | 提交选择 |
| `ghost_room_state` | S→C | 怪谈状态 | 广播 |
| `ghost_ending_reveal` | S→C | 结局对象 | 广播 |

---

## 八、已知的坑和经验

1. **Node 16 限制**：服务器是 CentOS 7 + Node 16，不要引入需要 Node 18+ 的包
2. **pm2 EBADENGINE**：pm2@7.0.1 报告引擎不匹配，但服务正常运行，忽略警告
3. **宝塔 nginx Host 头**：本地 curl `http://127.0.0.1/fillword/host.html` 会 404，必须带 `Host: 117.72.205.240`
4. **PowerShell heredoc**：plink 传长命令时 PowerShell heredoc 容易异常，改成直接 `-ssh` 单行命令更稳
5. **浏览器缓存**：每次发布新版本要给静态资源加版本号 `?v=xxx`，HTML 加 `Cache-Control: no-store`

---

## 九、下一步任务清单

### 任务 1：实现海龟汤（阶段一）

- [ ] `server/turtle-soup/cases.js`：写 5 个精品题包（深夜电梯、空教室、午夜电台、图书馆禁区、宿舍镜子）
- [ ] `server/turtle-soup/keyword-matcher.js`：关键词匹配引擎
- [ ] `server/turtle-soup/adjudicator.js`：问答判定 + 提示层级
- [ ] `server/turtle-soup/room.js`：海龟汤房间状态机
- [ ] `server/turtle-soup/router.js`：Socket.IO 事件路由
- [ ] `public/host-turtle.html`：主持人页面
- [ ] `public/player-turtle.html`：玩家页面
- [ ] `public/scripts/pages/host-turtle.js`：主持人逻辑
- [ ] `public/scripts/pages/player-turtle.js`：玩家逻辑
- [ ] 本地测试：建房 → 入房 → 提问 → 提示 → 猜测 → 公布真相
- [ ] 打包上传到服务器并验收

### 任务 2：实现恐怖怪谈（阶段二）

- [ ] `server/ghost-story/packs.js`：写 5 个精品怪谈包
- [ ] `server/ghost-story/judge.js`：判断与结局选择器
- [ ] `server/ghost-story/room.js`：怪谈房间状态机
- [ ] `server/ghost-story/router.js`：Socket.IO 事件路由
- [ ] `public/host-ghost.html`：主持人页面
- [ ] `public/player-ghost.html`：玩家页面
- [ ] `public/scripts/pages/host-ghost.js`：主持人逻辑
- [ ] `public/scripts/pages/player-ghost.js`：玩家逻辑
- [ ] 本地测试：建房 → 阅读 → 选择 → 判断 → 结局
- [ ] 打包上传到服务器并验收

### 任务 3：统一入口（可选）

- [ ] 实现统一的 `index.html` 首页，带三个入口卡片
- [ ] 或保持各游戏独立 URL：`/fillword/host-fillword.html`、`/fillword/host-turtle.html` 等

---

## 十、关键文件快速索引

| 文件 | 用途 |
|------|------|
| `_rollback_1_0/server/server.js` | 服务端主入口（参考 1.0 协议写法） |
| `_rollback_1_0/server/room-manager.js` | Fillword 房间管理（参考状态机写法） |
| `_rollback_1_0/public/host.html` | 主持人页模板 |
| `_rollback_1_0/public/player.html` | 玩家页模板 |
| `_rollback_1_0/public/scripts/shared/socket.js` | Socket 封装参考 |
| `_rollback_1_0/public/scripts/shared/templates.js` | Fillword 剧本参考格式 |
| `docs/superpowers/specs/2026-05-03-fillword-v1.1-corrected-design.md` | 完整设计文档 |
| `server/deploy.sh` | 部署脚本（上传后执行） |

---

## 十一、测试命令

```bash
# 服务端单元测试
cd c:\Users\Chandler Qi\Desktop\fillword_v2\server
npm test

# 本地启动服务
cd c:\Users\Chandler Qi\Desktop\fillword_v2\server
node server.js
# 访问 http://127.0.0.1:3000/fillword/host.html

# 打包部署
tar -czf fillword-v11.tar.gz public server docs
pscp -scp -pw "<SSH_PASSWORD>" fillword-v11.tar.gz root@117.72.205.240:/root/
plink -batch -ssh -pw "<SSH_PASSWORD>" root@117.72.205.240 "tar -xzf /root/fillword-v11.tar.gz -C /opt/fillword && pm2 restart fillword"
```

---

**文档结束。祝编码顺利。**

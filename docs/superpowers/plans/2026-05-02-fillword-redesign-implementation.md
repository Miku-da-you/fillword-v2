# Fillword Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Fillword 的多人玩法升级为“多人模板化 + 2-6 人分配 + 新剧本体系”，并保持 `/fillword/` 线上部署链路稳定可运行。

**Architecture:** 保持现有 `public/ + server/ + Socket.IO` 主架构不变，把旧的“全员填写一整套字段”彻底替换为“剧本按人数档位定义、服务端按入场顺序分配 assignment、玩家只填写专属字段、服务端按槽位生成结果”。实现顺序采用 TDD：先补模板和房间分配测试，再改服务端协议，最后改主持人页、玩家页和部署验证。

**Tech Stack:** Vanilla JS, Node.js, Express, Socket.IO, node:test, socket.io-client, nginx, pm2

---

## File Map

- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\shared\templates.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\shared\utils.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\shared\socket.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\pages\host.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\pages\player.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\host.html`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\player.html`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\styles\host.css`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\styles\player.css`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\styles\result.css`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\templates.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\room-manager.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\server.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\deploy.sh`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\ecosystem.config.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\tests\room-manager.test.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\tests\server-flow.test.js`
- Create: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\tests\template-variants.test.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\docs\deployment\fillword-jdcloud.md`

## Notes

- 当前目录不是 git 仓库，执行时跳过 commit 步骤，不做伪造提交。
- 计划默认沿用现有 CommonJS + 浏览器脚本风格，不引入打包器，不拆成新框架。
- 旧的“答案轮流混合”逻辑只作为历史补丁，本轮必须被按 assignment 分配模型完全替换。
- 每个任务都要先写或更新测试，再做实现，再回归 `npm test`。

### Task 1: 固化多人模板结构和新剧本数据

**Files:**
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\shared\templates.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\templates.js`
- Create: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\tests\template-variants.test.js`

- [ ] **Step 1: 先写模板结构测试，锁定顶层字段和人数档位**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { TEMPLATES } = require("../templates");

test("every template exposes supported counts and variants", () => {
  assert.ok(TEMPLATES.length >= 6);

  for (const template of TEMPLATES) {
    assert.equal(typeof template.id, "string");
    assert.equal(typeof template.title, "string");
    assert.ok(Array.isArray(template.supportedPlayerCounts));
    assert.ok(template.supportedPlayerCounts.every(count => count >= 2 && count <= 6));

    for (const count of template.supportedPlayerCounts) {
      assert.ok(template.variants[count], `missing variant for ${template.id}:${count}`);
    }
  }
});
```

- [ ] **Step 2: 跑新测试，确认当前旧模板结构必然失败**

Run: `node --test .\tests\template-variants.test.js`

Expected: FAIL，提示缺少 `supportedPlayerCounts` 或 `variants`

- [ ] **Step 3: 将共享模板改成多人模板结构，并先落 6 个正式剧本**

```js
const TEMPLATES = [
  {
    id: "social-death-intro",
    title: "社死自我介绍",
    theme: "社死",
    description: "像班会轮到你临时发言，但内容越来越离谱。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: {
        resultTitle: "今日社死代表发言",
        promptGroups: [
          { key: "screenName1", label: "一个非主流网名", placeholder: "例如：冷少殇魂紫月", category: "nickname", exampleHint: "越像空间时代越好", tone: "社死" },
          { key: "food1", label: "一个食物名字", placeholder: "例如：老坛酸菜牛肉面", category: "food", exampleHint: "越接地气越好笑", tone: "日常" },
          { key: "anime1", label: "一个动漫角色", placeholder: "例如：漩涡鸣人", category: "character", exampleHint: "知名度越高越容易出梗", tone: "中二" },
          { key: "hate1", label: "你最讨厌的事情", placeholder: "例如：周一开早会", category: "emotion", exampleHint: "越具体越有画面", tone: "抱怨" }
        ],
        assignments: [
          ["screenName1", "food1"],
          ["anime1", "hate1"]
        ],
        scriptTemplate: "大家好，我叫{screenName1}，平时最爱一边吃{food1}一边模仿{anime1}，但我人生中最不能接受的事还是{hate1}。"
      }
    }
  }
];

module.exports = { TEMPLATES };
```

- [ ] **Step 4: 给至少 6 个剧本补齐 2-6 人档位或合理子集，并保证分配尽量平均**

```js
{
  id: "office-weekly-report",
  title: "打工人周报",
  supportedPlayerCounts: [2, 3, 4, 5, 6],
  variants: {
    3: {
      promptGroups: [
        { key: "department1", label: "一个离谱部门名", placeholder: "例如：宇宙战略协同中心", category: "office", exampleHint: "越像大公司黑话越好", tone: "打工人" },
        { key: "leaderLine1", label: "一句很像领导说的话", placeholder: "例如：这个事情我们再对齐一下", category: "office", exampleHint: "最好带点空话", tone: "黑话" },
        { key: "food1", label: "一种便利店食物", placeholder: "例如：关东煮", category: "food", exampleHint: "越常见越有代入感", tone: "日常" },
        { key: "hate1", label: "你最讨厌的事情", placeholder: "例如：周日晚上被拉群", category: "emotion", exampleHint: "最好像真事", tone: "抱怨" },
        { key: "dream1", label: "一个小学生作文梦想", placeholder: "例如：当科学家", category: "dream", exampleHint: "越正能量反差越强", tone: "反差" },
        { key: "anime1", label: "一个动漫角色", placeholder: "例如：路飞", category: "character", exampleHint: "热血系更好玩", tone: "热血" }
      ],
      assignments: [
        ["department1", "leaderLine1"],
        ["food1", "hate1"],
        ["dream1", "anime1"]
      ],
      scriptTemplate: "本周我在{department1}持续推进核心事项，领导一直强调“{leaderLine1}”。虽然我靠{food1}续命，但面对{hate1}时，我依然决定像{anime1}一样坚持自己的{dream1}。"
    }
  }
}
```

- [ ] **Step 5: 回跑模板测试，确认数据结构和数量达标**

Run: `node --test .\tests\template-variants.test.js`

Expected: PASS，至少 1 个测试通过

### Task 2: 用测试驱动 assignment 分配和结果生成

**Files:**
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\tests\room-manager.test.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\room-manager.js`

- [ ] **Step 1: 新增建房人数和 assignment 分配测试**

```js
test("creates a room with target player count and assigns different fields to each player", () => {
  const manager = new RoomManager({ templates: TEMPLATES });
  const created = manager.createRoom("social-death-intro", 3, "host-socket");

  const playerA = manager.joinRoom(created.roomId, "socket-a", "阿强");
  const playerB = manager.joinRoom(created.roomId, "socket-b", "阿珍");
  const playerC = manager.joinRoom(created.roomId, "socket-c", "阿花");

  assert.deepEqual(playerA.assignedFieldKeys, ["screenName1", "food1"]);
  assert.deepEqual(playerB.assignedFieldKeys, ["anime1", "hate1"]);
  assert.equal(playerC.assignedFieldKeys.length > 0, true);
});
```

- [ ] **Step 2: 新增“未满员不能最终分配/不能生成结果”的测试**

```js
test("does not allow result generation before target player count is reached", () => {
  const manager = new RoomManager({ templates: TEMPLATES });
  const created = manager.createRoom("social-death-intro", 4, "host-socket");

  manager.joinRoom(created.roomId, "socket-a", "阿强");
  manager.joinRoom(created.roomId, "socket-b", "阿珍");

  assert.throws(() => {
    manager.generateResult(created.roomId, created.playerId);
  }, /ROOM_NOT_READY/);
});
```

- [ ] **Step 3: 新增“结果严格按槽位拼装，不再做覆盖/轮转”的测试**

```js
test("builds the final script from assigned slot values", () => {
  const manager = new RoomManager({ templates: TEMPLATES });
  const created = manager.createRoom("social-death-intro", 2, "host-socket");

  const playerA = manager.joinRoom(created.roomId, "socket-a", "阿强");
  const playerB = manager.joinRoom(created.roomId, "socket-b", "阿珍");

  manager.submitAnswers(playerA.playerId, {
    screenName1: "冷少殇魂紫月",
    food1: "烤冷面"
  });
  manager.submitAnswers(playerB.playerId, {
    anime1: "宇智波佐助",
    hate1: "周一晨会"
  });

  const generated = manager.generateResult(created.roomId, created.playerId);

  assert.match(generated.result.script, /冷少殇魂紫月/);
  assert.match(generated.result.script, /烤冷面/);
  assert.match(generated.result.script, /宇智波佐助/);
  assert.match(generated.result.script, /周一晨会/);
});
```

- [ ] **Step 4: 跑房间管理测试，确认新行为先失败**

Run: `node --test .\tests\room-manager.test.js`

Expected: FAIL，提示 `createRoom` 参数不匹配、缺少 `assignedFieldKeys` 或生成逻辑不符合预期

- [ ] **Step 5: 扩展 `RoomManager` 的建房和模板读取接口**

```js
createRoom(templateId, targetPlayerCount, hostSocketId) {
  const template = this.getTemplateById(templateId);
  this.assertSupportedPlayerCount(template, targetPlayerCount);

  const roomId = generateRoomCode(this.rooms);
  const hostPlayerId = createPlayerId();
  const room = {
    roomId,
    hostPlayerId,
    templateId,
    targetPlayerCount,
    status: "waiting",
    assignments: [],
    players: [],
    result: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  this.rooms.set(roomId, room);
  this.players.set(hostPlayerId, {
    playerId: hostPlayerId,
    roomId,
    socketId: hostSocketId,
    name: "主持人",
    isHost: true,
    assignmentIndex: null,
    assignedFieldKeys: [],
    submitted: false,
    answers: {},
    joinedAt: Date.now()
  });

  return { roomId, playerId: hostPlayerId, roomState: this.getRoomState(roomId) };
}
```

- [ ] **Step 6: 在 `joinRoom()` 中按入场顺序分配 assignment，并阻止超员**

```js
joinRoom(roomId, socketId, name) {
  const room = this.getOpenRoom(roomId);
  if (room.players.length >= room.targetPlayerCount) {
    throw createError("ROOM_FULL", "房间人数已满");
  }

  const template = this.getTemplateById(room.templateId);
  const variant = template.variants[room.targetPlayerCount];
  const assignmentIndex = room.players.length;
  const assignedFieldKeys = variant.assignments[assignmentIndex];

  const playerId = createPlayerId();
  const player = {
    playerId,
    roomId,
    socketId,
    name,
    isHost: false,
    assignmentIndex,
    assignedFieldKeys,
    submitted: false,
    answers: {},
    joinedAt: Date.now()
  };

  this.players.set(playerId, player);
  room.players.push(playerId);
  room.assignments.push({ assignmentIndex, playerId, fieldKeys: assignedFieldKeys });
  room.status = room.players.length === room.targetPlayerCount ? "collecting" : "waiting";
  room.updatedAt = Date.now();

  return { playerId, assignedFieldKeys, roomState: this.getRoomState(roomId) };
}
```

- [ ] **Step 7: 在 `submitAnswers()` 和 `generateResult()` 中只接受 assigned keys，并按模板槽位拼装**

```js
submitAnswers(playerId, answers) {
  const player = this.getPlayer(playerId);
  const nextAnswers = {};

  for (const key of player.assignedFieldKeys) {
    const value = String(answers[key] || "").trim();
    if (!value) {
      throw createError("INVALID_ANSWERS", "存在未填写内容");
    }
    nextAnswers[key] = value;
  }

  player.answers = nextAnswers;
  player.submitted = true;

  const room = this.getRoom(player.roomId);
  room.status = room.players
    .map(id => this.players.get(id))
    .every(entry => entry && entry.submitted)
    ? "all_submitted"
    : "collecting";

  return this.getRoomState(player.roomId);
}

generateResult(roomId, requesterPlayerId) {
  const room = this.getRoom(roomId);
  if (room.hostPlayerId !== requesterPlayerId) {
    throw createError("FORBIDDEN", "只有主持人可以生成结果");
  }
  if (room.players.length !== room.targetPlayerCount || room.status !== "all_submitted") {
    throw createError("ROOM_NOT_READY", "人数未满或仍有人未提交");
  }

  const template = this.getTemplateById(room.templateId);
  const variant = template.variants[room.targetPlayerCount];
  const mergedAnswers = {};

  for (const playerId of room.players) {
    Object.assign(mergedAnswers, this.players.get(playerId).answers);
  }

  const script = variant.scriptTemplate.replace(/\{(\w+)\}/g, (_match, key) => mergedAnswers[key] || "");
  room.result = {
    title: variant.resultTitle,
    script,
    players: room.players.map(id => this.players.get(id).name),
    generatedAt: Date.now()
  };
  room.status = "result_ready";
  return { roomState: this.getRoomState(roomId), result: room.result };
}
```

- [ ] **Step 8: 回跑房间测试，确认 assignment 模型生效**

Run: `node --test .\tests\room-manager.test.js`

Expected: PASS，所有房间管理测试通过

### Task 3: 更新 Socket.IO 协议和集成测试

**Files:**
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\tests\server-flow.test.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\server.js`

- [ ] **Step 1: 先改集成测试，要求 `create_room` 接收人数、`join_room` 返回 assignment**

```js
test("socket flow creates a 2-player room and returns assigned prompts", async () => {
  const { server } = createRealtimeServer();
  server.listen(0);
  await once(server, "listening");

  const port = server.address().port;
  const url = "http://127.0.0.1:" + port;
  const host = createClient(url, { transports: ["websocket"] });
  const player = createClient(url, { transports: ["websocket"] });

  const createResponse = await emitAck(host, "create_room", {
    templateId: "social-death-intro",
    targetPlayerCount: 2
  });
  assert.equal(createResponse.success, true);

  const joinResponse = await emitAck(player, "join_room", {
    roomId: createResponse.roomId,
    playerName: "阿强"
  });
  assert.equal(joinResponse.success, true);
  assert.ok(Array.isArray(joinResponse.assignedPrompts));
});
```

- [ ] **Step 2: 跑集成测试，确认服务端事件协议先失败**

Run: `npm test`

Expected: FAIL，`create_room` 或 `join_room` 返回结构不符合测试

- [ ] **Step 3: 在 `server.js` 中同步新的 ack 协议和广播载荷**

```js
socket.on("create_room", ({ templateId, targetPlayerCount }, callback) => {
  try {
    const created = roomManager.createRoom(templateId, targetPlayerCount, socket.id);
    socket.data.playerId = created.playerId;
    socket.data.roomId = created.roomId;
    socket.join(created.roomId);
    callback({
      success: true,
      roomId: created.roomId,
      playerId: created.playerId,
      roomState: created.roomState
    });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});

socket.on("join_room", ({ roomId, playerName }, callback) => {
  try {
    const joined = roomManager.joinRoom(roomId, socket.id, playerName);
    socket.data.playerId = joined.playerId;
    socket.data.roomId = roomId;
    socket.join(roomId);
    callback({
      success: true,
      playerId: joined.playerId,
      assignedFieldKeys: joined.assignedFieldKeys,
      assignedPrompts: joined.assignedPrompts,
      roomState: joined.roomState
    });
    io.to(roomId).emit("room_state", joined.roomState);
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

- [ ] **Step 4: 保持 `submit_answers`、`generate_result`、`leave_room` 对新房间状态广播一致**

```js
socket.on("submit_answers", ({ answers }, callback) => {
  try {
    const roomState = roomManager.submitAnswers(socket.data.playerId, answers);
    callback({ success: true, roomState });
    io.to(roomState.roomId).emit("room_state", roomState);
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

- [ ] **Step 5: 跑全量服务端测试，确认协议和状态一致**

Run: `npm test`

Expected: PASS，`room-manager`、`server-flow`、`template-variants` 全部通过

### Task 4: 重做主持人页，支持人数选择和分配展示

**Files:**
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\host.html`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\pages\host.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\styles\host.css`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\styles\result.css`

- [ ] **Step 1: 给 `host.html` 增加人数选择和剧本支持档位展示容器**

```html
<section class="template-picker" data-page="select">
  <div id="templateList" class="template-list"></div>
  <div class="player-count-picker">
    <label for="playerCountSelect">本局人数</label>
    <select id="playerCountSelect">
      <option value="2">2 人</option>
      <option value="3">3 人</option>
      <option value="4">4 人</option>
      <option value="5">5 人</option>
      <option value="6">6 人</option>
    </select>
  </div>
  <button id="createRoomButton" type="button">创建房间</button>
</section>
```

- [ ] **Step 2: 在 `host.js` 中用模板的 `supportedPlayerCounts` 驱动建房**

```js
function createTemplateCard(template) {
  return `
    <article class="template-card" data-template-id="${template.id}">
      <h3>${FillwordUtils.escapeHtml(template.title)}</h3>
      <p>${FillwordUtils.escapeHtml(template.description)}</p>
      <p class="template-counts">支持 ${template.supportedPlayerCounts.join(" / ")} 人</p>
    </article>
  `;
}

async function handleCreateRoom() {
  const targetPlayerCount = Number(document.getElementById("playerCountSelect").value);
  const response = await FillwordSocket.createRoom(currentTemplateId, targetPlayerCount);
  currentRoomId = response.roomId;
  renderRoomState(response.roomState);
}
```

- [ ] **Step 3: 在等待页显示目标人数、当前人数和每个玩家分配量**

```js
function renderPlayers(players) {
  FillwordUi.setHtml(
    "playerList",
    players.map(player => `
      <li class="player-row">
        <span class="player-name">${FillwordUtils.escapeHtml(player.name)}</span>
        <span class="player-meta">负责 ${player.assignedFieldKeys.length} 项</span>
        <span class="player-status">${player.submitted ? "已提交" : "待提交"}</span>
      </li>
    `).join("")
  );
}
```

- [ ] **Step 4: 在样式中强化人数、房间码和进度信息**

```css
.room-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.player-meta {
  color: var(--text-secondary);
  font-size: 14px;
}
```

- [ ] **Step 5: 手动验证主持人页主流程**

Run: 启动本地服务后打开 `http://localhost:3000/fillword/host.html`

Expected: 可选择剧本和 `2-6` 人；不支持的人数档位不可建房；建房后等待页能显示目标人数与玩家分配状态

### Task 5: 重做玩家页，只渲染 assigned prompts

**Files:**
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\player.html`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\pages\player.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\shared\socket.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\scripts\shared\utils.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\styles\player.css`

- [ ] **Step 1: 在 `player.html` 中增加 assignment 提示和动态表单容器**

```html
<section data-page="fill" hidden>
  <header class="fill-header">
    <p id="playerAssignmentHint"></p>
    <h2>轮到你填词了</h2>
  </header>
  <form id="answerForm">
    <div id="promptList" class="prompt-list"></div>
    <button type="submit">提交答案</button>
  </form>
</section>
```

- [ ] **Step 2: 扩展 `socket.js`，让 `joinRoom()` 返回 assignment 数据**

```js
async function joinRoom(roomId, playerName) {
  const response = await emitWithAck("join_room", { roomId, playerName });
  currentPlayerId = response.playerId;
  currentRoomId = roomId;
  return response;
}
```

- [ ] **Step 3: 在 `player.js` 中按 `assignedPrompts` 渲染表单**

```js
function renderAssignedPrompts(prompts) {
  FillwordUi.setHtml(
    "promptList",
    prompts.map(prompt => `
      <label class="prompt-card">
        <span class="prompt-label">${FillwordUtils.escapeHtml(prompt.label)}</span>
        <span class="prompt-hint">${FillwordUtils.escapeHtml(prompt.exampleHint)}</span>
        <input
          class="field-input"
          name="${FillwordUtils.escapeHtml(prompt.key)}"
          placeholder="${FillwordUtils.escapeHtml(prompt.placeholder)}"
          autocomplete="off"
          required
        />
      </label>
    `).join("")
  );
}
```

- [ ] **Step 4: 限制提交数据只包含 assigned keys**

```js
function collectAssignedAnswers(prompts) {
  const form = document.getElementById("answerForm");
  const data = new FormData(form);
  const answers = {};

  prompts.forEach(prompt => {
    answers[prompt.key] = String(data.get(prompt.key) || "").trim();
  });

  return answers;
}
```

- [ ] **Step 5: 在样式中强化场景化提示词的可读性**

```css
.prompt-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
}

.prompt-hint {
  color: var(--text-secondary);
  font-size: 13px;
}
```

- [ ] **Step 6: 手动验证玩家页只看到自己的字段**

Run: 打开两个玩家窗口，加入同一房间

Expected: 两个窗口显示的提示词集合不同；提交后进入等待态；结果页与主持人页一致

### Task 6: 清旧逻辑、补回归验证并完成部署文档

**Files:**
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\deploy.sh`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\server\ecosystem.config.js`
- Modify: `c:\Users\Chandler Qi\Desktop\fillword_v2\docs\deployment\fillword-jdcloud.md`
- Modify if needed during cleanup: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\host.html`
- Modify if needed during cleanup: `c:\Users\Chandler Qi\Desktop\fillword_v2\public\player.html`

- [ ] **Step 1: 搜索并清掉旧多人合并策略和无关提示词逻辑**

Run: `rg "buildMergedAnswers|Object.assign\(mergedAnswers|firebase|localStorage" c:\Users\Chandler Qi\Desktop\fillword_v2`

Expected: 旧 Firebase 和旧答案覆盖逻辑不再出现在正式运行链路中

- [ ] **Step 2: 跑完整测试**

Run: `npm test`

Expected: 所有 `server/tests/*.test.js` 通过

- [ ] **Step 3: 本地跑完整联机验收**

```text
1. 主持人选择 2 人局，完成一轮
2. 主持人选择 3 人局，确认每人字段数尽量平均
3. 主持人选择 6 人局，确认房间满员后才允许完整提交与生成
4. 验证玩家中途退出和房间已满提示
5. 验证结果文本包含多人贡献
```

Expected: `2/3/6` 三档都能跑通，且没有“一个玩家覆盖全局答案”的旧问题

- [ ] **Step 4: 更新部署脚本和部署文档，把验收要点换成多人模板化版本**

```md
## 多人玩法上线后检查项

1. 打开 `/fillword/host.html`
2. 建一个 2 人房，确认主持人可选择人数
3. 用两台手机打开 `/fillword/player.html`
4. 确认两个玩家收到不同提示词
5. 提交后生成结果，确认结果包含两人贡献
6. 再建 3 人房复测 assignment 分配
```

- [ ] **Step 5: 上京东云做公网回归**

Run on server: `curl -fsS http://127.0.0.1:3000/healthz`

Expected: 返回 `{"ok":true,...}`

Run on server: `curl -I http://117.72.205.240/fillword/host.html`

Expected: `200 OK`

Manual check:

```text
1. 桌面端开主持人页
2. 至少两台手机加入玩家页
3. 跑一局 2 人，再跑一局 3 人
4. 确认公网链路下 assignment、提交、生成、结果同步都正常
```

Expected: 公网流程稳定，无 `502`、无错误提示堆积、无 assignment 错乱

## Self-Review

- Spec coverage: 计划覆盖了多人模板结构、`2-6` 人建房、尽量平均分配、新剧本扩充、主持人/玩家 UI 变化、服务端真相源、测试、部署和公网回归。
- Placeholder scan: 文档中没有 `TODO`、`TBD`、"后面再做" 这类占位内容，所有任务都给出了文件、代码片段和验证命令。
- Type consistency: 统一使用 `templateId`、`targetPlayerCount`、`assignedFieldKeys`、`assignedPrompts`、`roomState`、`result` 这些命名，不再混用旧的 `templateIndex` 或旧合并逻辑术语。

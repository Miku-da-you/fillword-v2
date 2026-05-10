# 规则怪谈章节状态机重构设计

日期：2026-05-05

## 目标

将当前“一次性展示全部章节与全部题目”的规则怪谈模式，重构为“按章节推进的多人生存流程”。

新的目标行为：

1. 开局后只展示当前章节的剧情、线索与题目。
2. 当前仍存活的所有玩家都提交本章答案后，服务端统一结算。
3. 选择错误的玩家立即失败，无法进入下一章节。
4. 选择正确的玩家进入下一章节继续作答。
5. 失败玩家停留在失败等待页，不能旁观后续章节细节，也不能继续作答。
6. 最终当所有章节结束或所有玩家都失败后，进入结局揭晓。

## 不在本次范围内

1. 不加入倒计时机制。
2. 不做玩家之间私有剧情分支。
3. 不加入章节中途聊天、投票或协作讨论系统。
4. 不引入新模式或新入口，仍使用统一入口 `app.html`。

## 方案选择

采用方案 A：服务端维护“章节状态机 + 玩家生存状态”。

原因：

- 能准确表达多人同步推进。
- 能自然处理“有人失败，有人继续”的分流。
- 前端只渲染当前阶段，不再靠一次性题目列表硬过滤。
- 逻辑边界清晰，便于测试和后续扩展。

## 数据模型设计

### 房间级状态

在 `GhostStoryManager` 的房间对象中增加或重构以下字段：

- `currentChapterIndex: number`
  - 当前推进到第几章，0-based。
- `status: string`
  - 使用现有房间状态字段，但语义调整为章节状态机驱动。
  - 预期值：
    - `lobby`
    - `chapter_answering`
    - `chapter_resolved`
    - `ending_reveal`
- `chapterSubmissions: Map<playerId, answers>`
  - 当前章节内，存活玩家提交的答案。
- `chapterResolution: object | null`
  - 当前章节统一结算结果，用于短暂过渡和调试。
- `alivePlayerIds: string[]`
  - 当前仍存活玩家列表。
- `failedPlayerIds: string[]`
  - 已失败玩家列表。
- `completedChapterCount: number`
  - 已完成结算的章节数。

### 玩家级状态

每个玩家对象增加：

- `alive: boolean`
  - 是否仍在闯关。
- `failedAtChapterIndex: number | null`
  - 若失败，记录失败发生章节。
- `submittedCurrentChapter: boolean`
  - 当前章是否已提交。
- `chapterAnswers: Record<string, unknown>`
  - 当前章提交答案快照。
- `survivedChapters: number`
  - 累计通过章节数。

## 怪谈包结构重构

当前怪谈包需要从“全局 questions + 全局 clues + 全局 chapters”偏平结构，重构为“章节自带剧情、线索与问题”的结构。

### 新结构

```js
{
  id: "dormitory-rule-13",
  title: "宿舍守则第13条",
  intro: "……",
  rules: [ ... ],
  chapters: [
    {
      id: "chapter-1",
      chapterTitle: "第一夜",
      content: "门外有人叫你的名字。",
      clues: ["敲门声响了四下。"],
      questions: [
        {
          id: "c1q1",
          type: "single",
          question: "你应该开门吗？",
          options: ["开门", "不开门"],
          correctAnswer: 1
        }
      ]
    }
  ],
  endings: {
    perfect: "……",
    partial: "……",
    failed: "……"
  }
}
```

### 兼容策略

本次直接将默认怪谈包升级到新结构，不保留旧问题结构的长期兼容层。可以在 manager 内做极薄转换，但目标是尽快统一到新结构。

## 状态流设计

### 1. lobby

房主创建房间、玩家加入。

可见内容：
- 怪谈标题
- intro
- 规则预览
- 玩家列表

不可见内容：
- 全部章节
- 全部题目

### 2. startRoom

房主开始后：

- `status = chapter_answering`
- `currentChapterIndex = 0`
- 所有玩家：
  - `alive = true`
  - `failedAtChapterIndex = null`
  - `submittedCurrentChapter = false`

### 3. chapter_answering

存活玩家看到：
- 当前章节标题
- 当前章节内容
- 当前章节线索
- 当前章节问题

失败玩家看到：
- 失败等待页
- 不看到后续章节内容
- 不可再提交答案

### 4. submit chapter answers

只有存活玩家允许提交当前章节答案。

提交后：
- `submittedCurrentChapter = true`
- `chapterSubmissions[playerId] = answers`

如果还有存活玩家未提交：
- 当前提交者看到“等待其他存活玩家作答”
- 房间仍停留在 `chapter_answering`

### 5. resolve current chapter

当当前所有存活玩家都提交后，服务端统一结算：

对每位存活玩家：
- 答对：
  - 保持 `alive = true`
  - `survivedChapters += 1`
- 答错：
  - `alive = false`
  - `failedAtChapterIndex = currentChapterIndex`
  - 加入 `failedPlayerIds`
  - 从 `alivePlayerIds` 移除

然后清空：
- `chapterSubmissions`
- 所有玩家的 `submittedCurrentChapter`

### 6. transition to next chapter or ending

#### 若还有下一章且至少还有 1 名存活玩家：
- `currentChapterIndex += 1`
- `status = chapter_answering`
- 仅存活玩家继续下一章

#### 若没有下一章：
- `status = ending_reveal`
- 生成最终结局

#### 若所有玩家都失败：
- `status = ending_reveal`
- 直接进入失败结局

## 结局规则

### perfect

所有章节完成，且至少 1 名玩家存活到最终章结束。

### partial

如后续希望区分“部分幸存”，可以保留接口，但本次最小实现可以先按以下规则：

- 至少 1 名玩家完成最终章 -> `perfect`
- 否则 -> `failed`

为了减少首轮重构复杂度，本次不强行引入 `partial` 的复杂判定逻辑，但保留结构兼容。

### failed

所有玩家在最终前全部失败。

### 玩家个人结局说明

在 `ending_reveal` 中增加每位玩家的结果说明：

- 存活玩家：
  - `status: "survived"`
  - `summary: "成功撑到最后一章"`
- 失败玩家：
  - `status: "failed"`
  - `summary: "倒在第 X 章"`

## 前端渲染设计

### 统一原则

前端不再尝试展示所有章节。只展示服务端明确下发的“当前可见内容”。

### 存活玩家视图

显示：
- 当前章节标题
- 当前章节剧情
- 当前章节线索
- 当前章节问题
- 玩家列表与生存状态

若自己本章已提交但他人未提交：
- 显示等待态
- 不再显示可编辑题目

### 失败玩家视图

显示失败等待页：
- 你已在第 X 章失败
- 无法进入下一章节
- 请等待其他玩家完成本局

不显示：
- 下一章节内容
- 后续问题

### 房主视图

房主本身也是参与者时，按其个人存活/失败状态显示。
如果当前规则仍保持“房主也是玩家之一”，则不再做特殊只读处理；如果当前怪谈模式保留主持人身份，则房主只作为组织者，不参与答题。本次实现应延续现有怪谈模式的角色定义，不额外引入第三类章节权限。

## 服务端接口变化

### buildRoomState

怪谈房间状态需要显式携带：

- `currentChapterIndex`
- `currentChapterTitle`
- `currentChapterContent`
- `currentChapterClues`
- `currentChapterQuestions`
- `viewerAlive`
- `viewerFailedAtChapterIndex`
- `viewerSubmittedCurrentChapter`
- `alivePlayerCount`
- `failedPlayerCount`
- `players[].alive`
- `players[].submittedCurrentChapter`

并删除或停止依赖“全局 questions 全量下发”的旧模式。

## 错误处理

需要明确处理以下情况：

1. 已失败玩家尝试继续提交答案
   - 返回 `PLAYER_ELIMINATED`
2. 同一玩家重复提交当前章
   - 返回 `ALREADY_SUBMITTED`
3. 当前章节问题未答完整
   - 返回 `INVALID_ANSWERS`
4. 房间不在可答题状态
   - 返回 `ROOM_NOT_ANSWERING`
5. 章节数据缺失或题目结构不合法
   - 返回 `CHAPTER_CONFIG_INVALID`

## 测试设计

### manager 测试

新增或重写以下测试：

1. 开始本局后只暴露第一章内容
2. 单个存活玩家提交后进入等待态
3. 所有存活玩家提交后统一结算
4. 答错玩家被淘汰并停留失败态
5. 答对玩家进入下一章
6. 失败玩家无法提交下一章
7. 最后一章后进入结局揭晓
8. 所有玩家失败时直接失败结局

### renderer 测试

1. 存活玩家只看到当前章
2. 已提交玩家看到等待态
3. 失败玩家看到失败等待页
4. 不再渲染全部章节与全部问题

### flow / socket 测试

1. 两名玩家中一人失败、一人继续的真实流程
2. 存活玩家继续下一章时失败玩家不再收到答题视图
3. 最终所有人进入 `ending_reveal`

## 迁移顺序

1. 重构默认怪谈包结构
2. 重写 `GhostStoryManager` 的章节状态机
3. 调整 `buildRoomState` 输出
4. 重写 `ghost-renderer.js`
5. 更新怪谈相关测试
6. 本地实测双人流程

## 风险与控制

### 风险 1：旧测试和旧包结构冲突

控制：
- 直接重写怪谈相关测试，不再维持旧的一次性题目语义。

### 风险 2：玩家失败后广播状态混乱

控制：
- 明确使用 `viewerAlive` 和 `viewerSubmittedCurrentChapter` 驱动 UI。
- 不让前端从全局玩家列表自行推导阶段。

### 风险 3：章节与题目映射不清

控制：
- 每章自带题目，不再依赖跨章节 questions 数组索引。

## 推荐实施结论

按方案 A 执行：

- 服务端主导章节推进与淘汰判定
- 前端仅渲染当前可见阶段
- 失败玩家停在失败等待页
- 存活玩家继续下一章节
- 所有存活玩家提交后再统一结算

# Turtle Soup Human Host Design

## Goal

让海龟汤更接近线下真实主持体验：玩家提问不用咬文嚼字，最终猜测只要抓住核心因果就可以被认可；如果只差半步，系统先提示“已经很接近，再补关键原因”，而不是机械判错。

## Product Direction

- 主持风格采用“宽松主持人”。
- 提问阶段允许自然语言、口语化、省略式表达。
- 最终猜测阶段不再依赖字面相似度，而是判断玩家是否抓住题目的核心因果链。
- 当玩家已命中主要真相但缺最后一环时，进入 `close` 状态，返回一条短提示，允许继续补充。

## Decision Model

### Question Adjudication

- 保留现有 `yes / no / close / irrelevant` 结构。
- 优先使用 AI 判断自然语言问题。
- AI 不可用时，继续使用规则匹配兜底。

### Final Guess Adjudication

- 新增“最终猜测裁决器”，专门用于判断 `solved / close / wrong / irrelevant`。
- 裁决标准以“核心因果”而非“关键词复述”为中心。
- AI 可用时：
  - 输入题目 `fullTruth`
  - 输入题目 `coreFacts`
  - 输入玩家 `guess`
  - 输出结构化结果：`outcome`, `reason`, `missingCoreFact`, `hostHint`
- AI 不可用或返回异常时：
  - 使用规则层判断玩家猜测是否覆盖必需核心因果点
  - 已覆盖全部必需点 => `solved`
  - 覆盖主要点但缺最后一环 => `close`
  - 否则 => `wrong`

## Data Shape Changes

每道海龟汤题目新增：

- `coreFacts`
  - 描述题目需要被理解到的核心因果点
- `requiredFactGroups`
  - 用于规则层判断，每组表示一类必须命中的语义
- `closeHint`
  - 玩家接近真相时主持人该说的短提示

## Runtime Behavior

### On final guess

1. 玩家提交最终猜测
2. 运行最终猜测裁决器
3. 若结果为 `solved`
   - 房间进入 `truth_reveal`
   - 记录 `solvedBy`
4. 若结果为 `close`
   - 房间保持 `asking`
   - 记录一次“接近真相”的主持反馈
   - 不消耗到结束态
5. 若结果为 `wrong`
   - 房间保持 `asking`
   - 记录普通猜测结果

## UX Copy

- `solved`: “对，你已经抓住核心了。”
- `close`: “你已经很接近真相了，还差最后一个关键原因。”
- `wrong`: “这个方向还不够关键，再换个角度想想。”

## Scope

本次只改海龟汤：

- 最终猜测判定
- 接近态提示
- 新增两道题
- 测试与部署

不改 Fillword 和规则怪谈主流程。

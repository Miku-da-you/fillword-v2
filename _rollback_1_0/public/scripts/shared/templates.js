function createPrompt(key, label, placeholder, category, exampleHint, tone) {
  return { key, label, placeholder, category, exampleHint, tone };
}

function createTemplate(config) {
  return {
    id: config.id,
    title: config.title,
    emoji: config.emoji,
    theme: config.theme || '',
    description: config.description || '',
    supportedPlayerCounts: config.supportedPlayerCounts || [2, 3, 4, 5, 6],
    variants: config.variants || {},
    fields: config.fields || [],
    script: config.script || ''
  };
}

function createAssignments(promptGroups, playerCount) {
  const assignments = Array.from({ length: playerCount }, () => []);
  promptGroups.forEach((group, i) => {
    assignments[i % playerCount].push(group.key);
  });
  return assignments;
}

function createVariant(resultTitle, promptGroups, scriptTemplate, supportedPlayerCounts) {
  const result = { resultTitle, promptGroups };
  for (const count of supportedPlayerCounts) {
    result[count] = { assignments: createAssignments(promptGroups, count) };
  }
  return result;
}

const TEMPLATES = [
  createTemplate({
    id: "social-death-intro",
    title: "社死自我介绍",
    emoji: "🙃",
    theme: "社死",
    description: "像班会上被临时点名发言，但内容逐渐失控。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: createVariant(
        "社交大型社死现场",
        [
          createPrompt("screenName1", "一个非主流网名", "例如：冷少殇魂紫月", "nickname", "越像2012年空间越好", "社死"),
          createPrompt("food1", "一个食物名字", "例如：烤冷面", "food", "接地气一点更有画面", "日常"),
          createPrompt("anime1", "一个动漫角色", "例如：宇智波佐助", "character", "知名角色更容易出梗", "中二"),
          createPrompt("hate1", "你最讨厌的事情", "例如：周一晨会", "emotion", "最好像真事", "抱怨"),
          createPrompt("skill1", "一个奇怪的技能", "例如：能 5 秒入睡", "skill", "越离谱越有节目效果", "搞笑"),
          createPrompt("ending1", "一个离谱的结尾", "例如：然后我就退群了", "ending", "让人想问你是不是认真的", "结局"),
        ],
        "{screenName1}，人送外号\"{food1}\"，灵魂人物是{anime1}，最讨厌的事情是{hate1}，特长居然是{skill1}。直到有一天，{ending1}",
        [2, 3, 4, 5, 6]
      ),
      3: createVariant(
        "社交大型社死现场",
        [
          createPrompt("screenName1", "一个非主流网名", "例如：冷少殇魂紫月", "nickname", "越像2012年空间越好", "社死"),
          createPrompt("food1", "一个食物名字", "例如：烤冷面", "food", "接地气一点更有画面", "日常"),
          createPrompt("anime1", "一个动漫角色", "例如：宇智波佐助", "character", "知名角色更容易出梗", "中二"),
          createPrompt("hate1", "你最讨厌的事情", "例如：周一晨会", "emotion", "最好像真事", "抱怨"),
          createPrompt("skill1", "一个奇怪的技能", "例如：能 5 秒入睡", "skill", "越离谱越有节目效果", "搞笑"),
          createPrompt("ending1", "一个离谱的结尾", "例如：然后我就退群了", "ending", "让人想问你是不是认真的", "结局"),
        ],
        "{screenName1}，人送外号\"{food1}\"，灵魂人物是{anime1}，最讨厌的事情是{hate1}，特长居然是{skill1}。直到有一天，{ending1}",
        [2, 3, 4, 5, 6]
      ),
      4: createVariant(
        "社交大型社死现场",
        [
          createPrompt("screenName1", "一个非主流网名", "例如：冷少殇魂紫月", "nickname", "越像2012年空间越好", "社死"),
          createPrompt("food1", "一个食物名字", "例如：烤冷面", "food", "接地气一点更有画面", "日常"),
          createPrompt("anime1", "一个动漫角色", "例如：宇智波佐助", "character", "知名角色更容易出梗", "中二"),
          createPrompt("hate1", "你最讨厌的事情", "例如：周一晨会", "emotion", "最好像真事", "抱怨"),
          createPrompt("skill1", "一个奇怪的技能", "例如：能 5 秒入睡", "skill", "越离谱越有节目效果", "搞笑"),
          createPrompt("ending1", "一个离谱的结尾", "例如：然后我就退群了", "ending", "让人想问你是不是认真的", "结局"),
        ],
        "{screenName1}，人送外号\"{food1}\"，灵魂人物是{anime1}，最讨厌的事情是{hate1}，特长居然是{skill1}。直到有一天，{ending1}",
        [2, 3, 4, 5, 6]
      ),
      5: createVariant(
        "社交大型社死现场",
        [
          createPrompt("screenName1", "一个非主流网名", "例如：冷少殇魂紫月", "nickname", "越像2012年空间越好", "社死"),
          createPrompt("food1", "一个食物名字", "例如：烤冷面", "food", "接地气一点更有画面", "日常"),
          createPrompt("anime1", "一个动漫角色", "例如：宇智波佐助", "character", "知名角色更容易出梗", "中二"),
          createPrompt("hate1", "你最讨厌的事情", "例如：周一晨会", "emotion", "最好像真事", "抱怨"),
          createPrompt("skill1", "一个奇怪的技能", "例如：能 5 秒入睡", "skill", "越离谱越有节目效果", "搞笑"),
          createPrompt("ending1", "一个离谱的结尾", "例如：然后我就退群了", "ending", "让人想问你是不是认真的", "结局"),
        ],
        "{screenName1}，人送外号\"{food1}\"，灵魂人物是{anime1}，最讨厌的事情是{hate1}，特长居然是{skill1}。直到有一天，{ending1}",
        [2, 3, 4, 5, 6]
      ),
      6: createVariant(
        "社交大型社死现场",
        [
          createPrompt("screenName1", "一个非主流网名", "例如：冷少殇魂紫月", "nickname", "越像2012年空间越好", "社死"),
          createPrompt("food1", "一个食物名字", "例如：烤冷面", "food", "接地气一点更有画面", "日常"),
          createPrompt("anime1", "一个动漫角色", "例如：宇智波佐助", "character", "知名角色更容易出梗", "中二"),
          createPrompt("hate1", "你最讨厌的事情", "例如：周一晨会", "emotion", "最好像真事", "抱怨"),
          createPrompt("skill1", "一个奇怪的技能", "例如：能 5 秒入睡", "skill", "越离谱越有节目效果", "搞笑"),
          createPrompt("ending1", "一个离谱的结尾", "例如：然后我就退群了", "ending", "让人想问你是不是认真的", "结局"),
        ],
        "{screenName1}，人送外号\"{food1}\"，灵魂人物是{anime1}，最讨厌的事情是{hate1}，特长居然是{skill1}。直到有一天，{ending1}",
        [2, 3, 4, 5, 6]
      ),
    },
    fields: [
      createPrompt("screenName1", "一个非主流网名", "例如：冷少殇魂紫月", "nickname", "越像2012年空间越好", "社死"),
      createPrompt("food1", "一个食物名字", "例如：烤冷面", "food", "接地气一点更有画面", "日常"),
      createPrompt("anime1", "一个动漫角色", "例如：宇智波佐助", "character", "知名角色更容易出梗", "中二"),
      createPrompt("hate1", "你最讨厌的事情", "例如：周一晨会", "emotion", "最好像真事", "抱怨"),
      createPrompt("skill1", "一个奇怪的技能", "例如：能 5 秒入睡", "skill", "越离谱越有节目效果", "搞笑"),
      createPrompt("ending1", "一个离谱的结尾", "例如：然后我就退群了", "ending", "让人想问你是不是认真的", "结局"),
    ],
    script: "{screenName1}，人送外号\"{food1}\"，灵魂人物是{anime1}，最讨厌的事情是{hate1}，特长居然是{skill1}。直到有一天，{ending1}",
  }),

  createTemplate({
    id: "office-weekly-report",
    title: "打工人周报",
    emoji: "💼",
    theme: "打工人",
    description: "一份看似专业、实则越来越离谱的周报汇报。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: createVariant(
        "本周工作周报",
        [
          createPrompt("project1", "一个假大空的项目名", "例如：跨平台矩阵式协同管理", "project", "越官方越讽刺", "职场"),
          createPrompt("tool1", "一个用过的工具", "例如：钉钉", "tool", "最好是让人崩溃的那种", "工具"),
          createPrompt("achievement1", "一件假装有成果的事", "例如：拉了一个没人说话的群", "achievement", "讽刺拉满", "成果"),
          createPrompt("mood1", "本周心情", "例如：还行，就是有点困", "mood", "真实写照", "感受"),
          createPrompt("nextweek1", "下周计划", "例如：继续开会", "plan", "越敷衍越好", "下周"),
          createPrompt("comment1", "领导评语", "例如：加油！", "comment", "官话即可", "评语"),
        ],
        "【本周工作周报】\n项目：{project1}\n使用工具：{tool1}\n主要成果：{achievement1}\n本周心情：{mood1}\n下周计划：{nextweek1}\n领导评语：{comment1}",
        [2, 3, 4, 5, 6]
      ),
      3: createVariant(
        "本周工作周报",
        [
          createPrompt("project1", "一个假大空的项目名", "例如：跨平台矩阵式协同管理", "project", "越官方越讽刺", "职场"),
          createPrompt("tool1", "一个用过的工具", "例如：钉钉", "tool", "最好是让人崩溃的那种", "工具"),
          createPrompt("achievement1", "一件假装有成果的事", "例如：拉了一个没人说话的群", "achievement", "讽刺拉满", "成果"),
          createPrompt("mood1", "本周心情", "例如：还行，就是有点困", "mood", "真实写照", "感受"),
          createPrompt("nextweek1", "下周计划", "例如：继续开会", "plan", "越敷衍越好", "下周"),
          createPrompt("comment1", "领导评语", "例如：加油！", "comment", "官话即可", "评语"),
        ],
        "【本周工作周报】\n项目：{project1}\n使用工具：{tool1}\n主要成果：{achievement1}\n本周心情：{mood1}\n下周计划：{nextweek1}\n领导评语：{comment1}",
        [2, 3, 4, 5, 6]
      ),
      4: createVariant(
        "本周工作周报",
        [
          createPrompt("project1", "一个假大空的项目名", "例如：跨平台矩阵式协同管理", "project", "越官方越讽刺", "职场"),
          createPrompt("tool1", "一个用过的工具", "例如：钉钉", "tool", "最好是让人崩溃的那种", "工具"),
          createPrompt("achievement1", "一件假装有成果的事", "例如：拉了一个没人说话的群", "achievement", "讽刺拉满", "成果"),
          createPrompt("mood1", "本周心情", "例如：还行，就是有点困", "mood", "真实写照", "感受"),
          createPrompt("nextweek1", "下周计划", "例如：继续开会", "plan", "越敷衍越好", "下周"),
          createPrompt("comment1", "领导评语", "例如：加油！", "comment", "官话即可", "评语"),
        ],
        "【本周工作周报】\n项目：{project1}\n使用工具：{tool1}\n主要成果：{achievement1}\n本周心情：{mood1}\n下周计划：{nextweek1}\n领导评语：{comment1}",
        [2, 3, 4, 5, 6]
      ),
      5: createVariant(
        "本周工作周报",
        [
          createPrompt("project1", "一个假大空的项目名", "例如：跨平台矩阵式协同管理", "project", "越官方越讽刺", "职场"),
          createPrompt("tool1", "一个用过的工具", "例如：钉钉", "tool", "最好是让人崩溃的那种", "工具"),
          createPrompt("achievement1", "一件假装有成果的事", "例如：拉了一个没人说话的群", "achievement", "讽刺拉满", "成果"),
          createPrompt("mood1", "本周心情", "例如：还行，就是有点困", "mood", "真实写照", "感受"),
          createPrompt("nextweek1", "下周计划", "例如：继续开会", "plan", "越敷衍越好", "下周"),
          createPrompt("comment1", "领导评语", "例如：加油！", "comment", "官话即可", "评语"),
        ],
        "【本周工作周报】\n项目：{project1}\n使用工具：{tool1}\n主要成果：{achievement1}\n本周心情：{mood1}\n下周计划：{nextweek1}\n领导评语：{comment1}",
        [2, 3, 4, 5, 6]
      ),
      6: createVariant(
        "本周工作周报",
        [
          createPrompt("project1", "一个假大空的项目名", "例如：跨平台矩阵式协同管理", "project", "越官方越讽刺", "职场"),
          createPrompt("tool1", "一个用过的工具", "例如：钉钉", "tool", "最好是让人崩溃的那种", "工具"),
          createPrompt("achievement1", "一件假装有成果的事", "例如：拉了一个没人说话的群", "achievement", "讽刺拉满", "成果"),
          createPrompt("mood1", "本周心情", "例如：还行，就是有点困", "mood", "真实写照", "感受"),
          createPrompt("nextweek1", "下周计划", "例如：继续开会", "plan", "越敷衍越好", "下周"),
          createPrompt("comment1", "领导评语", "例如：加油！", "comment", "官话即可", "评语"),
        ],
        "【本周工作周报】\n项目：{project1}\n使用工具：{tool1}\n主要成果：{achievement1}\n本周心情：{mood1}\n下周计划：{nextweek1}\n领导评语：{comment1}",
        [2, 3, 4, 5, 6]
      ),
    },
    fields: [
      createPrompt("project1", "一个假大空的项目名", "例如：跨平台矩阵式协同管理", "project", "越官方越讽刺", "职场"),
      createPrompt("tool1", "一个用过的工具", "例如：钉钉", "tool", "最好是让人崩溃的那种", "工具"),
      createPrompt("achievement1", "一件假装有成果的事", "例如：拉了一个没人说话的群", "achievement", "讽刺拉满", "成果"),
      createPrompt("mood1", "本周心情", "例如：还行，就是有点困", "mood", "真实写照", "感受"),
      createPrompt("nextweek1", "下周计划", "例如：继续开会", "plan", "越敷衍越好", "下周"),
      createPrompt("comment1", "领导评语", "例如：加油！", "comment", "官话即可", "评语"),
    ],
    script: "【本周工作周报】\n项目：{project1}\n使用工具：{tool1}\n主要成果：{achievement1}\n本周心情：{mood1}\n下周计划：{nextweek1}\n领导评语：{comment1}",
  }),

  createTemplate({
    id: "middle-school-awakening",
    title: "中二觉醒宣言",
    emoji: "⚔️",
    theme: "中二",
    description: "像在天台宣布命运觉醒，但台词越来越不正经。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: createVariant(
        "命运觉醒",
        [
          createPrompt("power1", "一种特殊能力", "例如：召唤室友打游戏", "power", "越中二越有意义", "能力"),
          createPrompt("enemy1", "一个宿敌", "例如：早八闹钟", "enemy", "日常的东西", "宿敌"),
          createPrompt("place1", "一个秘密基地", "例如：厕所隔间", "place", "接地气又有仪式感", "地点"),
          createPrompt("rival1", "一个亦敌亦友", "例如：我的外卖", "rival", "越熟悉越有反差", "对手"),
          createPrompt("weapon1", "一件武器", "例如：没有充满的电宝", "weapon", "真实又离谱", "武器"),
          createPrompt("phrase1", "一句招牌台词", "例如：我的青春不能没有外卖", "phrase", "喊出来很傻但很燃", "台词"),
        ],
        "从今天起，我将觉醒真正的力量——{power1}。为了击败我的宿敌 {enemy1}，我在秘密基地 {place1} 与 {rival1} 展开了命运的较量。手持 {weapon1}，我高喊：\"{phrase1}\"！",
        [2, 3, 4, 5, 6]
      ),
      3: createVariant(
        "命运觉醒",
        [
          createPrompt("power1", "一种特殊能力", "例如：召唤室友打游戏", "power", "越中二越有意义", "能力"),
          createPrompt("enemy1", "一个宿敌", "例如：早八闹钟", "enemy", "日常的东西", "宿敌"),
          createPrompt("place1", "一个秘密基地", "例如：厕所隔间", "place", "接地气又有仪式感", "地点"),
          createPrompt("rival1", "一个亦敌亦友", "例如：我的外卖", "rival", "越熟悉越有反差", "对手"),
          createPrompt("weapon1", "一件武器", "例如：没有充满的电宝", "weapon", "真实又离谱", "武器"),
          createPrompt("phrase1", "一句招牌台词", "例如：我的青春不能没有外卖", "phrase", "喊出来很傻但很燃", "台词"),
        ],
        "从今天起，我将觉醒真正的力量——{power1}。为了击败我的宿敌 {enemy1}，我在秘密基地 {place1} 与 {rival1} 展开了命运的较量。手持 {weapon1}，我高喊：\"{phrase1}\"！",
        [2, 3, 4, 5, 6]
      ),
      4: createVariant(
        "命运觉醒",
        [
          createPrompt("power1", "一种特殊能力", "例如：召唤室友打游戏", "power", "越中二越有意义", "能力"),
          createPrompt("enemy1", "一个宿敌", "例如：早八闹钟", "enemy", "日常的东西", "宿敌"),
          createPrompt("place1", "一个秘密基地", "例如：厕所隔间", "place", "接地气又有仪式感", "地点"),
          createPrompt("rival1", "一个亦敌亦友", "例如：我的外卖", "rival", "越熟悉越有反差", "对手"),
          createPrompt("weapon1", "一件武器", "例如：没有充满的电宝", "weapon", "真实又离谱", "武器"),
          createPrompt("phrase1", "一句招牌台词", "例如：我的青春不能没有外卖", "phrase", "喊出来很傻但很燃", "台词"),
        ],
        "从今天起，我将觉醒真正的力量——{power1}。为了击败我的宿敌 {enemy1}，我在秘密基地 {place1} 与 {rival1} 展开了命运的较量。手持 {weapon1}，我高喊：\"{phrase1}\"！",
        [2, 3, 4, 5, 6]
      ),
      5: createVariant(
        "命运觉醒",
        [
          createPrompt("power1", "一种特殊能力", "例如：召唤室友打游戏", "power", "越中二越有意义", "能力"),
          createPrompt("enemy1", "一个宿敌", "例如：早八闹钟", "enemy", "日常的东西", "宿敌"),
          createPrompt("place1", "一个秘密基地", "例如：厕所隔间", "place", "接地气又有仪式感", "地点"),
          createPrompt("rival1", "一个亦敌亦友", "例如：我的外卖", "rival", "越熟悉越有反差", "对手"),
          createPrompt("weapon1", "一件武器", "例如：没有充满的电宝", "weapon", "真实又离谱", "武器"),
          createPrompt("phrase1", "一句招牌台词", "例如：我的青春不能没有外卖", "phrase", "喊出来很傻但很燃", "台词"),
        ],
        "从今天起，我将觉醒真正的力量——{power1}。为了击败我的宿敌 {enemy1}，我在秘密基地 {place1} 与 {rival1} 展开了命运的较量。手持 {weapon1}，我高喊：\"{phrase1}\"！",
        [2, 3, 4, 5, 6]
      ),
      6: createVariant(
        "命运觉醒",
        [
          createPrompt("power1", "一种特殊能力", "例如：召唤室友打游戏", "power", "越中二越有意义", "能力"),
          createPrompt("enemy1", "一个宿敌", "例如：早八闹钟", "enemy", "日常的东西", "宿敌"),
          createPrompt("place1", "一个秘密基地", "例如：厕所隔间", "place", "接地气又有仪式感", "地点"),
          createPrompt("rival1", "一个亦敌亦友", "例如：我的外卖", "rival", "越熟悉越有反差", "对手"),
          createPrompt("weapon1", "一件武器", "例如：没有充满的电宝", "weapon", "真实又离谱", "武器"),
          createPrompt("phrase1", "一句招牌台词", "例如：我的青春不能没有外卖", "phrase", "喊出来很傻但很燃", "台词"),
        ],
        "从今天起，我将觉醒真正的力量——{power1}。为了击败我的宿敌 {enemy1}，我在秘密基地 {place1} 与 {rival1} 展开了命运的较量。手持 {weapon1}，我高喊：\"{phrase1}\"！",
        [2, 3, 4, 5, 6]
      ),
    },
    fields: [
      createPrompt("power1", "一种特殊能力", "例如：召唤室友打游戏", "power", "越中二越有意义", "能力"),
      createPrompt("enemy1", "一个宿敌", "例如：早八闹钟", "enemy", "日常的东西", "宿敌"),
      createPrompt("place1", "一个秘密基地", "例如：厕所隔间", "place", "接地气又有仪式感", "地点"),
      createPrompt("rival1", "一个亦敌亦友", "例如：我的外卖", "rival", "越熟悉越有反差", "对手"),
      createPrompt("weapon1", "一件武器", "例如：没有充满的电宝", "weapon", "真实又离谱", "武器"),
      createPrompt("phrase1", "一句招牌台词", "例如：我的青春不能没有外卖", "phrase", "喊出来很傻但很燃", "台词"),
    ],
    script: "从今天起，我将觉醒真正的力量——{power1}。为了击败我的宿敌 {enemy1}，我在秘密基地 {place1} 与 {rival1} 展开了命运的较量。手持 {weapon1}，我高喊：\"{phrase1}\"！",
  }),

  createTemplate({
    id: "family-group-drama",
    title: "家族群迷惑文学",
    emoji: "👨‍👩‍👧‍👦",
    theme: "家族群",
    description: "像家族群里突然冒出来的一段长语音文字版。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: createVariant(
        "家族群迷惑文学",
        [
          createPrompt("elder1", "一个长辈称谓", "例如：二姨", "elder", "有辈分感", "称呼"),
          createPrompt("news1", "一个震惊体新闻", "例如：这种蔬菜致癌", "news", "越震惊越好", "新闻"),
          createPrompt("advice1", "一条养生建议", "例如：晚上9点必须睡觉", "advice", "越绝对越迷惑", "建议"),
          createPrompt("food1", "一种食物", "例如：隔夜菜", "food", "日常但有争议", "食物"),
          createPrompt("quote1", "一条鸡汤语录", "例如：做人要饮水思源", "quote", "越土越好", "语录"),
          createPrompt("action1", "一个呼吁行动", "例如：赶紧转给家人！", "action", "催转发的语气", "行动"),
        ],
        "{elder1}：【紧急提醒】刚才看到新闻说{news1}！专家说了，{advice1}，特别是{food1}千万不能吃！说的太对了，{quote1}！家人们赶紧看，转给身边的朋友！{action1}",
        [2, 3, 4, 5, 6]
      ),
      3: createVariant(
        "家族群迷惑文学",
        [
          createPrompt("elder1", "一个长辈称谓", "例如：二姨", "elder", "有辈分感", "称呼"),
          createPrompt("news1", "一个震惊体新闻", "例如：这种蔬菜致癌", "news", "越震惊越好", "新闻"),
          createPrompt("advice1", "一条养生建议", "例如：晚上9点必须睡觉", "advice", "越绝对越迷惑", "建议"),
          createPrompt("food1", "一种食物", "例如：隔夜菜", "food", "日常但有争议", "食物"),
          createPrompt("quote1", "一条鸡汤语录", "例如：做人要饮水思源", "quote", "越土越好", "语录"),
          createPrompt("action1", "一个呼吁行动", "例如：赶紧转给家人！", "action", "催转发的语气", "行动"),
        ],
        "{elder1}：【紧急提醒】刚才看到新闻说{news1}！专家说了，{advice1}，特别是{food1}千万不能吃！说的太对了，{quote1}！家人们赶紧看，转给身边的朋友！{action1}",
        [2, 3, 4, 5, 6]
      ),
      4: createVariant(
        "家族群迷惑文学",
        [
          createPrompt("elder1", "一个长辈称谓", "例如：二姨", "elder", "有辈分感", "称呼"),
          createPrompt("news1", "一个震惊体新闻", "例如：这种蔬菜致癌", "news", "越震惊越好", "新闻"),
          createPrompt("advice1", "一条养生建议", "例如：晚上9点必须睡觉", "advice", "越绝对越迷惑", "建议"),
          createPrompt("food1", "一种食物", "例如：隔夜菜", "food", "日常但有争议", "食物"),
          createPrompt("quote1", "一条鸡汤语录", "例如：做人要饮水思源", "quote", "越土越好", "语录"),
          createPrompt("action1", "一个呼吁行动", "例如：赶紧转给家人！", "action", "催转发的语气", "行动"),
        ],
        "{elder1}：【紧急提醒】刚才看到新闻说{news1}！专家说了，{advice1}，特别是{food1}千万不能吃！说的太对了，{quote1}！家人们赶紧看，转给身边的朋友！{action1}",
        [2, 3, 4, 5, 6]
      ),
      5: createVariant(
        "家族群迷惑文学",
        [
          createPrompt("elder1", "一个长辈称谓", "例如：二姨", "elder", "有辈分感", "称呼"),
          createPrompt("news1", "一个震惊体新闻", "例如：这种蔬菜致癌", "news", "越震惊越好", "新闻"),
          createPrompt("advice1", "一条养生建议", "例如：晚上9点必须睡觉", "advice", "越绝对越迷惑", "建议"),
          createPrompt("food1", "一种食物", "例如：隔夜菜", "food", "日常但有争议", "食物"),
          createPrompt("quote1", "一条鸡汤语录", "例如：做人要饮水思源", "quote", "越土越好", "语录"),
          createPrompt("action1", "一个呼吁行动", "例如：赶紧转给家人！", "action", "催转发的语气", "行动"),
        ],
        "{elder1}：【紧急提醒】刚才看到新闻说{news1}！专家说了，{advice1}，特别是{food1}千万不能吃！说的太对了，{quote1}！家人们赶紧看，转给身边的朋友！{action1}",
        [2, 3, 4, 5, 6]
      ),
      6: createVariant(
        "家族群迷惑文学",
        [
          createPrompt("elder1", "一个长辈称谓", "例如：二姨", "elder", "有辈分感", "称呼"),
          createPrompt("news1", "一个震惊体新闻", "例如：这种蔬菜致癌", "news", "越震惊越好", "新闻"),
          createPrompt("advice1", "一条养生建议", "例如：晚上9点必须睡觉", "advice", "越绝对越迷惑", "建议"),
          createPrompt("food1", "一种食物", "例如：隔夜菜", "food", "日常但有争议", "食物"),
          createPrompt("quote1", "一条鸡汤语录", "例如：做人要饮水思源", "quote", "越土越好", "语录"),
          createPrompt("action1", "一个呼吁行动", "例如：赶紧转给家人！", "action", "催转发的语气", "行动"),
        ],
        "{elder1}：【紧急提醒】刚才看到新闻说{news1}！专家说了，{advice1}，特别是{food1}千万不能吃！说的太对了，{quote1}！家人们赶紧看，转给身边的朋友！{action1}",
        [2, 3, 4, 5, 6]
      ),
    },
    fields: [
      createPrompt("elder1", "一个长辈称谓", "例如：二姨", "elder", "有辈分感", "称呼"),
      createPrompt("news1", "一个震惊体新闻", "例如：这种蔬菜致癌", "news", "越震惊越好", "新闻"),
      createPrompt("advice1", "一条养生建议", "例如：晚上9点必须睡觉", "advice", "越绝对越迷惑", "建议"),
      createPrompt("food1", "一种食物", "例如：隔夜菜", "food", "日常但有争议", "食物"),
      createPrompt("quote1", "一条鸡汤语录", "例如：做人要饮水思源", "quote", "越土越好", "语录"),
      createPrompt("action1", "一个呼吁行动", "例如：赶紧转给家人！", "action", "催转发的语气", "行动"),
    ],
    script: "{elder1}：【紧急提醒】刚才看到新闻说{news1}！专家说了，{advice1}，特别是{food1}千万不能吃！说的太对了，{quote1}！家人们赶紧看，转给身边的朋友！{action1}",
  }),

  createTemplate({
    id: "livestream-chaos",
    title: "网红带货翻车现场",
    emoji: "🛒",
    theme: "直播",
    description: "像直播间激情带货，但越播越像大型事故。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: createVariant(
        "直播间翻车现场",
        [
          createPrompt("host1", "一个浮夸的直播标题", "例如：源头工厂亏本冲量！", "host", "越夸张越有效果", "标题"),
          createPrompt("product1", "一件离谱商品", "例如：能用十年的纸巾", "product", "越不实用越离谱", "商品"),
          createPrompt("price1", "一个虚假促销", "例如：今天只要 998", "price", "价格越离谱越好", "价格"),
          createPrompt("gag1", "一个直播翻车名场面", "例如：样品掉地上了", "gag", "尴尬到想转台", "翻车"),
          createPrompt("audience1", "一个观众留言", "例如：这不是骗人吗", "audience", "真实观众吐槽", "观众"),
          createPrompt("ending1", "一个离谱结局", "例如：然后被封了", "ending", "封号收场", "结局"),
        ],
        "【{host1}】家人们！今天给你们带来的是——{product1}！原价9999，今天只要{price1}！库存只有10份赶紧抢！等等……{gag1}……弹幕说：\"{audience1}\"……最终……{ending1}",
        [2, 3, 4, 5, 6]
      ),
      3: createVariant(
        "直播间翻车现场",
        [
          createPrompt("host1", "一个浮夸的直播标题", "例如：源头工厂亏本冲量！", "host", "越夸张越有效果", "标题"),
          createPrompt("product1", "一件离谱商品", "例如：能用十年的纸巾", "product", "越不实用越离谱", "商品"),
          createPrompt("price1", "一个虚假促销", "例如：今天只要 998", "price", "价格越离谱越好", "价格"),
          createPrompt("gag1", "一个直播翻车名场面", "例如：样品掉地上了", "gag", "尴尬到想转台", "翻车"),
          createPrompt("audience1", "一个观众留言", "例如：这不是骗人吗", "audience", "真实观众吐槽", "观众"),
          createPrompt("ending1", "一个离谱结局", "例如：然后被封了", "ending", "封号收场", "结局"),
        ],
        "【{host1}】家人们！今天给你们带来的是——{product1}！原价9999，今天只要{price1}！库存只有10份赶紧抢！等等……{gag1}……弹幕说：\"{audience1}\"……最终……{ending1}",
        [2, 3, 4, 5, 6]
      ),
      4: createVariant(
        "直播间翻车现场",
        [
          createPrompt("host1", "一个浮夸的直播标题", "例如：源头工厂亏本冲量！", "host", "越夸张越有效果", "标题"),
          createPrompt("product1", "一件离谱商品", "例如：能用十年的纸巾", "product", "越不实用越离谱", "商品"),
          createPrompt("price1", "一个虚假促销", "例如：今天只要 998", "price", "价格越离谱越好", "价格"),
          createPrompt("gag1", "一个直播翻车名场面", "例如：样品掉地上了", "gag", "尴尬到想转台", "翻车"),
          createPrompt("audience1", "一个观众留言", "例如：这不是骗人吗", "audience", "真实观众吐槽", "观众"),
          createPrompt("ending1", "一个离谱结局", "例如：然后被封了", "ending", "封号收场", "结局"),
        ],
        "【{host1}】家人们！今天给你们带来的是——{product1}！原价9999，今天只要{price1}！库存只有10份赶紧抢！等等……{gag1}……弹幕说：\"{audience1}\"……最终……{ending1}",
        [2, 3, 4, 5, 6]
      ),
      5: createVariant(
        "直播间翻车现场",
        [
          createPrompt("host1", "一个浮夸的直播标题", "例如：源头工厂亏本冲量！", "host", "越夸张越有效果", "标题"),
          createPrompt("product1", "一件离谱商品", "例如：能用十年的纸巾", "product", "越不实用越离谱", "商品"),
          createPrompt("price1", "一个虚假促销", "例如：今天只要 998", "price", "价格越离谱越好", "价格"),
          createPrompt("gag1", "一个直播翻车名场面", "例如：样品掉地上了", "gag", "尴尬到想转台", "翻车"),
          createPrompt("audience1", "一个观众留言", "例如：这不是骗人吗", "audience", "真实观众吐槽", "观众"),
          createPrompt("ending1", "一个离谱结局", "例如：然后被封了", "ending", "封号收场", "结局"),
        ],
        "【{host1}】家人们！今天给你们带来的是——{product1}！原价9999，今天只要{price1}！库存只有10份赶紧抢！等等……{gag1}……弹幕说：\"{audience1}\"……最终……{ending1}",
        [2, 3, 4, 5, 6]
      ),
      6: createVariant(
        "直播间翻车现场",
        [
          createPrompt("host1", "一个浮夸的直播标题", "例如：源头工厂亏本冲量！", "host", "越夸张越有效果", "标题"),
          createPrompt("product1", "一件离谱商品", "例如：能用十年的纸巾", "product", "越不实用越离谱", "商品"),
          createPrompt("price1", "一个虚假促销", "例如：今天只要 998", "price", "价格越离谱越好", "价格"),
          createPrompt("gag1", "一个直播翻车名场面", "例如：样品掉地上了", "gag", "尴尬到想转台", "翻车"),
          createPrompt("audience1", "一个观众留言", "例如：这不是骗人吗", "audience", "真实观众吐槽", "观众"),
          createPrompt("ending1", "一个离谱结局", "例如：然后被封了", "ending", "封号收场", "结局"),
        ],
        "【{host1}】家人们！今天给你们带来的是——{product1}！原价9999，今天只要{price1}！库存只有10份赶紧抢！等等……{gag1}……弹幕说：\"{audience1}\"……最终……{ending1}",
        [2, 3, 4, 5, 6]
      ),
    },
    fields: [
      createPrompt("host1", "一个浮夸的直播标题", "例如：源头工厂亏本冲量！", "host", "越夸张越有效果", "标题"),
      createPrompt("product1", "一件离谱商品", "例如：能用十年的纸巾", "product", "越不实用越离谱", "商品"),
      createPrompt("price1", "一个虚假促销", "例如：今天只要 998", "price", "价格越离谱越好", "价格"),
      createPrompt("gag1", "一个直播翻车名场面", "例如：样品掉地上了", "gag", "尴尬到想转台", "翻车"),
      createPrompt("audience1", "一个观众留言", "例如：这不是骗人吗", "audience", "真实观众吐槽", "观众"),
      createPrompt("ending1", "一个离谱结局", "例如：然后被封了", "ending", "封号收场", "结局"),
    ],
    script: "【{host1}】家人们！今天给你们带来的是——{product1}！原价9999，今天只要{price1}！库存只有10份赶紧抢！等等……{gag1}……弹幕说：\"{audience1}\"……最终……{ending1}",
  }),

  createTemplate({
    id: "dorm-night-talk",
    title: "宿舍夜谈怪话",
    emoji: "🛏️",
    theme: "宿舍",
    description: "像宿舍熄灯后开始胡说八道的深夜对话。",
    supportedPlayerCounts: [2, 3, 4, 5, 6],
    variants: {
      2: createVariant(
        "宿舍深夜怪话",
        [
          createPrompt("roommate1", "一个室友外号", "例如：寝室卷王", "roommate", "外号越离谱越有画面", "外号"),
          createPrompt("bizarre1", "一个离谱假设", "例如：如果室友掉光了头发", "bizarre", "越荒谬越好", "假设"),
          createPrompt("secret1", "一个宿舍暗号", "例如：熄灯等于开会", "secret", "越神秘越好", "暗号"),
          createPrompt("night1", "一个深夜奇遇", "例如：听到走廊有脚步声", "night", "细思极恐的那种", "奇遇"),
          createPrompt("rule1", "一个宿舍潜规则", "例如：十一点前不能睡觉", "rule", "越共同经历越有共鸣", "规则"),
          createPrompt("dream1", "一个离谱梦境", "例如：梦见室友在裸奔", "dream", "越离谱越想分享", "梦境"),
        ],
        "那天晚上，{roommate1}突然问：如果{bizarre1}怎么办？我们于是制定了{secret1}的秘密规则。那天晚上，居然发生了{night1}，宿舍群炸开了。最离谱的潜规则是{rule1}……然后我做了一个梦，{dream1}。",
        [2, 3, 4, 5, 6]
      ),
      3: createVariant(
        "宿舍深夜怪话",
        [
          createPrompt("roommate1", "一个室友外号", "例如：寝室卷王", "roommate", "外号越离谱越有画面", "外号"),
          createPrompt("bizarre1", "一个离谱假设", "例如：如果室友掉光了头发", "bizarre", "越荒谬越好", "假设"),
          createPrompt("secret1", "一个宿舍暗号", "例如：熄灯等于开会", "secret", "越神秘越好", "暗号"),
          createPrompt("night1", "一个深夜奇遇", "例如：听到走廊有脚步声", "night", "细思极恐的那种", "奇遇"),
          createPrompt("rule1", "一个宿舍潜规则", "例如：十一点前不能睡觉", "rule", "越共同经历越有共鸣", "规则"),
          createPrompt("dream1", "一个离谱梦境", "例如：梦见室友在裸奔", "dream", "越离谱越想分享", "梦境"),
        ],
        "那天晚上，{roommate1}突然问：如果{bizarre1}怎么办？我们于是制定了{secret1}的秘密规则。那天晚上，居然发生了{night1}，宿舍群炸开了。最离谱的潜规则是{rule1}……然后我做了一个梦，{dream1}。",
        [2, 3, 4, 5, 6]
      ),
      4: createVariant(
        "宿舍深夜怪话",
        [
          createPrompt("roommate1", "一个室友外号", "例如：寝室卷王", "roommate", "外号越离谱越有画面", "外号"),
          createPrompt("bizarre1", "一个离谱假设", "例如：如果室友掉光了头发", "bizarre", "越荒谬越好", "假设"),
          createPrompt("secret1", "一个宿舍暗号", "例如：熄灯等于开会", "secret", "越神秘越好", "暗号"),
          createPrompt("night1", "一个深夜奇遇", "例如：听到走廊有脚步声", "night", "细思极恐的那种", "奇遇"),
          createPrompt("rule1", "一个宿舍潜规则", "例如：十一点前不能睡觉", "rule", "越共同经历越有共鸣", "规则"),
          createPrompt("dream1", "一个离谱梦境", "例如：梦见室友在裸奔", "dream", "越离谱越想分享", "梦境"),
        ],
        "那天晚上，{roommate1}突然问：如果{bizarre1}怎么办？我们于是制定了{secret1}的秘密规则。那天晚上，居然发生了{night1}，宿舍群炸开了。最离谱的潜规则是{rule1}……然后我做了一个梦，{dream1}。",
        [2, 3, 4, 5, 6]
      ),
      5: createVariant(
        "宿舍深夜怪话",
        [
          createPrompt("roommate1", "一个室友外号", "例如：寝室卷王", "roommate", "外号越离谱越有画面", "外号"),
          createPrompt("bizarre1", "一个离谱假设", "例如：如果室友掉光了头发", "bizarre", "越荒谬越好", "假设"),
          createPrompt("secret1", "一个宿舍暗号", "例如：熄灯等于开会", "secret", "越神秘越好", "暗号"),
          createPrompt("night1", "一个深夜奇遇", "例如：听到走廊有脚步声", "night", "细思极恐的那种", "奇遇"),
          createPrompt("rule1", "一个宿舍潜规则", "例如：十一点前不能睡觉", "rule", "越共同经历越有共鸣", "规则"),
          createPrompt("dream1", "一个离谱梦境", "例如：梦见室友在裸奔", "dream", "越离谱越想分享", "梦境"),
        ],
        "那天晚上，{roommate1}突然问：如果{bizarre1}怎么办？我们于是制定了{secret1}的秘密规则。那天晚上，居然发生了{night1}，宿舍群炸开了。最离谱的潜规则是{rule1}……然后我做了一个梦，{dream1}。",
        [2, 3, 4, 5, 6]
      ),
      6: createVariant(
        "宿舍深夜怪话",
        [
          createPrompt("roommate1", "一个室友外号", "例如：寝室卷王", "roommate", "外号越离谱越有画面", "外号"),
          createPrompt("bizarre1", "一个离谱假设", "例如：如果室友掉光了头发", "bizarre", "越荒谬越好", "假设"),
          createPrompt("secret1", "一个宿舍暗号", "例如：熄灯等于开会", "secret", "越神秘越好", "暗号"),
          createPrompt("night1", "一个深夜奇遇", "例如：听到走廊有脚步声", "night", "细思极恐的那种", "奇遇"),
          createPrompt("rule1", "一个宿舍潜规则", "例如：十一点前不能睡觉", "rule", "越共同经历越有共鸣", "规则"),
          createPrompt("dream1", "一个离谱梦境", "例如：梦见室友在裸奔", "dream", "越离谱越想分享", "梦境"),
        ],
        "那天晚上，{roommate1}突然问：如果{bizarre1}怎么办？我们于是制定了{secret1}的秘密规则。那天晚上，居然发生了{night1}，宿舍群炸开了。最离谱的潜规则是{rule1}……然后我做了一个梦，{dream1}。",
        [2, 3, 4, 5, 6]
      ),
    },
    fields: [
      createPrompt("roommate1", "一个室友外号", "例如：寝室卷王", "roommate", "外号越离谱越有画面", "外号"),
      createPrompt("bizarre1", "一个离谱假设", "例如：如果室友掉光了头发", "bizarre", "越荒谬越好", "假设"),
      createPrompt("secret1", "一个宿舍暗号", "例如：熄灯等于开会", "secret", "越神秘越好", "暗号"),
      createPrompt("night1", "一个深夜奇遇", "例如：听到走廊有脚步声", "night", "细思极恐的那种", "奇遇"),
      createPrompt("rule1", "一个宿舍潜规则", "例如：十一点前不能睡觉", "rule", "越共同经历越有共鸣", "规则"),
      createPrompt("dream1", "一个离谱梦境", "例如：梦见室友在裸奔", "dream", "越离谱越想分享", "梦境"),
    ],
    script: "那天晚上，{roommate1}突然问：如果{bizarre1}怎么办？我们于是制定了{secret1}的秘密规则。那天晚上，居然发生了{night1}，宿舍群炸开了。最离谱的潜规则是{rule1}……然后我做了一个梦，{dream1}。",
  }),
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = TEMPLATES;
}

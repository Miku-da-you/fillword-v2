/**
 * 填词大作战 - 剧本模板库
 * 共15个剧本模板，涵盖校园/职场/生活/情感/娱乐等多个场景
 * 每个模板的 script 只使用 fields 中定义的 key
 */

const TEMPLATES = [
  {
    title: "冲浪教练的正经课堂",
    emoji: "🏄",
    fields: [
      { label: "一个夸张的形容词", key: "adj1" },
      { label: "一个身体部位", key: "body1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个名词（职业）", key: "job1" },
      { label: "一个场所", key: "place1" },
      { label: "一个感叹词", key: "excla" },
      { label: "一个动词（ing形式）", key: "verb1" },
      { label: "另一个感叹词", key: "excla2" }
    ],
    script: `各位同学好，我是你们的冲浪教练。

今天我们要学习如何用一种{adj1}的方式去驾驭海浪。

记住，当浪来的时候，你的手要放在{body1}上，屁股要保持{adj2}，这样才能避免被浪拍飞。

我以前是个{job1}，后来在{place1}学会了冲浪。

每次站板之前，我都对自己说：" {excla}！我可以的！"

然后我就在板上{verb1}了大概三秒钟，{excla2}，就掉水里了。`
  },
  {
    title: "职场加薪申请书",
    emoji: "💼",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个动词", key: "verb1" },
      { label: "一个时间（几月/几天）", key: "time1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个名词", key: "noun2" },
      { label: "一个疯狂的程度词", key: "adv1" },
      { label: "一个名词", key: "noun3" }
    ],
    script: `尊敬的老总：

您好。我申请加薪，理由如下：

我是一个非常{adj1}的员工，每天{verb1}超过{time1}个小时。

我为公司创造了{adj2}的{noun1}，带回了{noun2}个客户。

我的加班时间{adv1}多到可以绕公司{noun3}三圈。

请务必批准我的加薪申请，否则我就去boss直聘。

此致敬礼，一个绝望的打工人。`
  },
  {
    title: "深夜泡面独白",
    emoji: "🍜",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个时间段", key: "time1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一种食物", key: "food1" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个动词", key: "verb1" },
      { label: "一个形容词", key: "adj4" },
      { label: "一个名词", key: "noun1" }
    ],
    script: `现在是凌晨{time1}，我饿得像个{adj1}的狼。

冰箱里只有一包过期的泡面和水。

我煮了一碗{adj2}的泡面，加了{adj3}的蛋和{food1}。

吃的时候，感觉自己像在{verb1}米其林三星。

这碗面{adj4}得像{noun1}一样，但我觉得是这辈子吃过最好吃的一顿。

明天一定要减肥。`
  },
  {
    title: "前任的深夜短信",
    emoji: "💔",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个时间", key: "time1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词", key: "verb1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个形容词", key: "adj4" }
    ],
    script: `宝贝，在吗？

我刚才梦到你和{adj1}的{noun1}在一起了。

现在是{time1}，我坐在{adj2}的台阶上，思考我们{verb1}了{noun2}的关系。

我知道我是个{adj3}的人，但我真的改了。

未来我想和你一起看{adj4}的日出，一起吃{adj3}的早餐。

如果你不回我，我就去下载探探了。`
  },
  {
    title: "看病挂号门诊",
    emoji: "🏥",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个身体部位", key: "body1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（过去式）", key: "verb1" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj4" },
      { label: "一个形容词", key: "adj5" }
    ],
    script: `医生：哪里不舒服？

我：我的{body1}已经{adj1}了{verb1}天了，感觉自己像{adj2}的{noun1}。

医生：你最近{verb1}什么了？

我：我在网上看了很多{adj3}的文章，然后{verb1}了很多{adj4}的东西。

医生：你这个情况，我建议你去挂个{adj5}科室。

我：可是我已经挂了{adj1}个号了……`
  },
  {
    title: "班主任班会发言",
    emoji: "📚",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（ing形式）", key: "verb1" },
      { label: "一个场所", key: "place1" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun2" },
      { label: "一个时间段", key: "time1" }
    ],
    script: `同学们，今天我们开个{adj1}的班会。

最近我发现有人在{place1}里{verb1}，这个行为非常{adj2}。

我们已经连续{time1}没得过{noun1}了，隔壁班都嘲笑我们。

你们的{noun2}水平我也不是不了解，{adj3}的程度让我很担忧。

所以我决定，明天开始，课间不许{verb1}，违者罚抄{noun2}{time1}遍。`
  },
  {
    title: "网红带货直播",
    emoji: "🛒",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词", key: "verb1" },
      { label: "一个时间（秒）", key: "time1" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj4" }
    ],
    script: `家人们！今天给你们炸一波！就是这个{noun1}，我用了{time1}秒就{verb1}了皮肤！

你们看这个{adj1}的效果，连我{noun2}都说我变{adj2}了！

今天直播间价格{adj3}到爆炸，原价999，今天只要{adj4}！

库存只剩三件了！谁抢到谁就是{adj1}的幸运儿！

来，倒计时{time1}秒，3、2、1上车！`
  },
  {
    title: "家族群发言",
    emoji: "👨‍👩‍👧",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个称呼", key: "call1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个名词", key: "noun1" },
      { label: "一个动词（ing形式）", key: "verb1" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun2" },
      { label: "一个时间", key: "time1" }
    ],
    script: `各位{adj1}的{call1}、叔叔阿姨：

我是{call1}家的孩子，今天在群里看到大家在{verb1}。

我在这里求求大家，别再{verb1}那些{adj2}的{noun1}了。

转发超过{time1}会被{adj3}的，到时候{noun2}都看不了！

我{verb1}了这么多年，{call1}我还是第一次求大家。

请各位{call1}帮我点个赞，好人一生{adj1}！`
  },
  {
    title: "甲方需求变更",
    emoji: "📝",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（过去式）", key: "verb1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个时间段", key: "time1" },
      { label: "一个形容词", key: "adj4" }
    ],
    script: `你好，关于上次确定的{noun1}方案，我们有些{adj1}的想法。

之前的版本已经被{verb1}了，从头开始做。

我们想把{noun2}改成{adj2}的，整个项目看起来更{adj3}。

deadline能不能从{time1}改到{time1}？因为我们需要做{adj4}的调整。

配色方案的话，用那个{adj1}的{noun1}色，我觉得会很{adj2}。

我们这次希望达到{adj3}的效果，请尽快确认！`
  },
  {
    title: "酒局真心话",
    emoji: "🍺",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（过去式）", key: "verb1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun3" },
      { label: "一个形容词", key: "adj4" }
    ],
    script: `来，喝完这杯，我说个{adj1}的秘密。

我以前在{noun1}公司的时候，曾经{verb1}了一个{adj2}的{noun2}。

那天我喝多了，对着{noun3}说了{noun1}的坏话，结果被{verb1}了。

这还不算啥，我甚至{verb1}过我的{adj3}领导，真的。

现在想想，我这辈子最后悔的事，就是{verb1}了那盘{adj4}的{noun2}。

好了干了这杯，谁也别笑话谁！`
  },
  {
    title: "毕业论文致谢",
    emoji: "🏫",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个动词（ing形式）", key: "verb1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个时间段", key: "time1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun3" }
    ],
    script: `本论文在{adj1}的{noun1}指导下完成。

感谢我的导师，在{time1}个深夜里，不厌其烦地帮我{verb1}论文。

感谢我的{noun2}，当我{verb1}到想放弃的时候，给了我{adj2}的力量。

感谢我的{noun3}，虽然他们完全不懂我在研究什么，但始终支持我。

最后，感谢我自己，在{time1}个崩溃的夜晚，没有选择{verb1}。

本论文可用于研究{adj3}的{noun1}领域，如有雷同，纯属巧合。`
  },
  {
    title: "IT小哥故障排除",
    emoji: "💻",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词（设备）", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（过去式）", key: "verb1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个动词（ing形式）", key: "verb2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun3" }
    ],
    script: `您好，IT部门，请问有什么问题？

我：我的{noun1}突然{verb1}了，屏幕显示{adj1}的错误。

请问您试过重启吗？

我：重启了，还是{adj2}的状态。

那您把{noun2}拔了再插上试试？

我：试过了，还是不行，现在{verb2}的东西都{adj3}了。

好的，您稍等，我让{noun3}去看看。

我：不用了，我自己就是{noun3}，我知道是什么问题。`
  },
  {
    title: "装修投诉电话",
    emoji: "🏠",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词（房间）", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（过去式）", key: "verb1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个时间段", key: "time1" },
      { label: "一个形容词", key: "adj4" }
    ],
    script: `您好，我要投诉！你们把我的{adj1}{noun1}装成了{adj2}的猪窝！

工人：我们确实是按照{adj3}的设计图{verb1}的。

什么设计图？你们把我说的{noun2}漆成了{adj4}的颜色！

工人：这个颜色很{adj1}啊，现在很流行的。

流行？这是我家，不是展览馆！你们要不要来看看现在什么样？

工人：好的，我们安排人过去看看，大概{time1}天后到。

不行！明天必须到！否则我打12345投诉你们！`
  },
  {
    title: "分手日记",
    emoji: "📅",
    fields: [
      { label: "一个时间", key: "time1" },
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（ing形式）", key: "verb1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个形容词", key: "adj4" }
    ],
    script: `{time1}，晴

今天我们分手了。

我和他认识了{time1}天，终于走到了尽头。

他是个{adj1}的人，但我们之间有太多{adj2}的矛盾。

我曾经以为我们会一起{verb1}，但现在只剩下{noun1}。

那天我们大吵了一架，他说我太{adj3}。

他不懂我，我真的只是太在乎他了。

从今天开始，我要做一个{adj4}的人，不为{noun2}流一滴眼泪。

明天会更好。`
  },
  {
    title: "歌手自我介绍",
    emoji: "🎤",
    fields: [
      { label: "一个形容词", key: "adj1" },
      { label: "一个名词", key: "noun1" },
      { label: "一个形容词", key: "adj2" },
      { label: "一个动词（ing形式）", key: "verb1" },
      { label: "一个时间段", key: "time1" },
      { label: "一个名词", key: "noun2" },
      { label: "一个形容词", key: "adj3" },
      { label: "一个名词", key: "noun3" }
    ],
    script: `大家好，我是来自{adj1}星球的{noun1}。

我从小就喜欢{verb1}，在地下室练了{time1}年。

我的音乐风格是{adj2}的，结合了{adj3}和{adj1}元素。

我今天带来的这首歌叫《{adj1}的{noun2}》。

创作背景是这样的：我曾经在{time1}的时候，失去了我的{noun3}。

那段时间我每天{verb1}，后来我把这份感情写成了这首歌。

希望你们喜欢，谢谢大家！`
  }
];

// 导出（兼容浏览器和模块）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TEMPLATES };
} else {
  window.TEMPLATES = TEMPLATES;
}
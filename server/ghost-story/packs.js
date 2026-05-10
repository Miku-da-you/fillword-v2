"use strict";

module.exports = [
  {
    id: "dormitory-rule-13",
    title: "宿舍守则第13条",
    theme: "规则怪谈",
    intro: "新生入学手册里，宿舍守则只有12条。但所有学长都说，第13条一直都在。你们今晚第一次住进旧宿舍，墙上的值日表却已经写好了你们的名字。",
    rules: [
      { id: "r1", text: "熄灯后若有人敲门，不要回应，也不要靠近猫眼。", severity: "critical" },
      { id: "r2", text: "值班老师只会敲三下；如果敲门声超过三下，请确认所有室友是否都在床上。", severity: "warning" },
      { id: "r3", text: "门缝下出现蓝色纸条时，不要阅读纸条上的名字。", severity: "warning" },
      { id: "r4", text: "凌晨两点后，走廊广播不会播放校歌；如果听见校歌，请立刻关灯。", severity: "critical" },
      { id: "r5", text: "新生手册没有第13条；如果你看见了，请假装没有看见。", severity: "critical" },
      { id: "r6", text: "洗手间镜子里如果多出一张床，请不要数床位，也不要直视镜中人的脸。", severity: "critical" },
      { id: "r7", text: "查寝名单只会写到12号宿舍；若名单上出现13号，请立刻远离走廊尽头的告示栏。", severity: "warning" },
      { id: "r8", text: "天亮前不要替任何人开窗；窗外如果有人挥手，不代表那是人。", severity: "critical" }
    ],
    chapters: [
      {
        id: "chapter-1",
        chapterTitle: "第一章：敲门声",
        transitionNarration: "走廊重新安静了下来，但宿舍里少了一个原本熟悉的呼吸声。没有人敢去确认，刚才门外那道声音究竟学会了谁。",
        content: "凌晨两点，门外传来极轻的敲门声。第一轮是三下，所有室友都装作没听见。第二轮变成了四下，有人用你的声音在门外说：我忘带钥匙了。",
        clues: [
          "值班老师的敲门声总是三下，但今晚响了四下。",
          "门外的声音和你一模一样。"
        ],
        questions: [
          {
            id: "c1q1",
            type: "single",
            question: "第二轮敲门声最可能意味着什么？",
            options: ["值班老师巡查", "普通同学忘带钥匙", "门外的东西开始模仿宿舍成员"],
            correctAnswer: 2,
            failureFeedback: {
              failedRuleIds: ["r2"],
              reason: "你忽略了“值班老师只会敲三下”这一关键规则，四下敲门说明门外已经不是正常巡查者。",
              narration: "你把异常当成了熟悉的日常。门外的东西于是顺着你的犹豫，学会了你的声音。"
            }
          },
          {
            id: "c1q2",
            type: "true_false",
            question: "判断题：凌晨两点后可以回应敲门声。",
            correctAnswer: false,
            failureFeedback: {
              failedRuleIds: ["r1", "r4"],
              reason: "熄灯后的回应行为本身就是禁忌，尤其在凌晨两点后，任何来自走廊的异常都不能主动接触。",
              narration: "你出声的瞬间，走廊尽头传来了不该出现的校歌。门外的人也终于确认了你的位置。"
            }
          }
        ]
      },
      {
        id: "chapter-2",
        chapterTitle: "第二章：蓝色纸条",
        transitionNarration: "蓝色纸条已经不见了，只剩床脚下那一小片未干的水痕。谁都知道，有什么东西正沿着那道水迹在宿舍里来回走动。",
        content: "门缝下慢慢滑进一张蓝色纸条，上面只写着：13号床已经回来了。可宿舍里从来只有四张床。纸条边缘还沾着水，像是刚从某个潮湿的地方捞出来。",
        clues: [
          "蓝色纸条上写着一个不属于本宿舍的床位号。",
          "新生手册里根本没有第13条。",
          "纸条边缘是潮湿的，像从洗手间地面拖进来的。"
        ],
        questions: [
          {
            id: "c2q1",
            type: "single",
            question: "看见蓝色纸条后最安全的做法是？",
            options: ["读出纸条上的名字", "把纸条交给门外的人", "不要阅读名字并保持关灯"],
            correctAnswer: 2,
            failureFeedback: {
              failedRuleIds: ["r3", "r5"],
              reason: "蓝色纸条上的名字本身就是诱饵。无论读出还是递还，都是在承认那条本不该存在的第13条规则。",
              narration: "纸条上的字迹在你眼前慢慢晕开，最后变成了你的名字。等你抬头时，宿舍已经多出了一张床。"
            }
          },
          {
            id: "c2q2",
            type: "single",
            question: "纸条边缘的潮湿痕迹最应该让你联想到哪里？",
            options: ["走廊饮水机", "洗手间镜子附近", "窗台漏雨"],
            correctAnswer: 1,
            failureFeedback: {
              failedRuleIds: ["r6"],
              reason: "潮湿痕迹不是普通水渍，而是镜前地面常见的拖痕。它提示你危险已经靠近镜子与床位之间。",
              narration: "你把那团湿痕当成无关紧要的污水。可它一路延伸，最后停在了你自己的床脚。"
            }
          }
        ]
      },
      {
        id: "chapter-3",
        chapterTitle: "第三章：镜中床位",
        transitionNarration: "镜子里的那张床空了，可现实里的床位也再没有人敢去数。梳头声停下之后，整层楼像是在等最后一个决定。",
        content: "洗手间的灯忽然自己亮了。镜子里反射出的宿舍，比现实里多出一张靠墙的上铺。那张床上似乎坐着一个低头的人，正在慢慢梳头。",
        clues: [
          "镜子里的床位数量和现实不一致。",
          "多出来的人影始终低着头，没有抬脸。",
          "梳头声只在镜子里响起，现实中却听不见。"
        ],
        questions: [
          {
            id: "c3q1",
            type: "single",
            question: "这时最安全的反应是？",
            options: ["数清楚镜子里到底有几张床", "移开视线并离开镜子范围", "靠近确认那个人是谁"],
            correctAnswer: 1,
            failureFeedback: {
              failedRuleIds: ["r6"],
              reason: "镜子里的额外床位本身就是陷阱。无论细数床位还是直视那张脸，都会让你成为被确认的人。",
              narration: "你在镜中多停留了一秒。那张一直低着的脸终于抬起来，而镜子外的你却已经不见了。"
            }
          },
          {
            id: "c3q2",
            type: "true_false",
            question: "判断题：镜子里的人如果像室友，就可以直接叫出他的名字。",
            correctAnswer: false,
            failureFeedback: {
              failedRuleIds: ["r1", "r6"],
              reason: "镜中的熟悉感是最危险的伪装。你一旦叫出名字，就等于承认它属于这个宿舍。",
              narration: "你叫出了本以为最熟悉的名字。回应你的却不是声音，而是床架慢慢压下来的吱呀声。"
            }
          }
        ]
      },
      {
        id: "chapter-4",
        chapterTitle: "第四章：窗外挥手的人",
        content: "离天亮只剩十几分钟，整栋宿舍却突然停电。有人在窗外轻轻敲着玻璃，从六楼的高度探出半个身子，对着你们缓慢挥手。走廊广播同时响起：13号宿舍，开窗通风。",
        clues: [
          "这里是六楼，正常人不可能站在窗外。",
          "广播开始点名13号宿舍，但宿舍楼并没有这个编号。",
          "窗外的人影挥手的频率，和刚才敲门的节奏一样。"
        ],
        questions: [
          {
            id: "c4q1",
            type: "single",
            question: "面对窗外挥手的人和错误广播，最安全的做法是？",
            options: ["打开窗确认外面是谁", "无视广播并远离窗边", "隔着玻璃询问对方来意"],
            correctAnswer: 1,
            failureFeedback: {
              failedRuleIds: ["r7", "r8"],
              reason: "广播点到13号宿舍时，说明这栋楼的异常已经具备了明确目标。任何靠近窗边或回应，都等于接受邀请。",
              narration: "你走向窗边的那一刻，玻璃外那只手突然也贴了上来。它的五指和你的指缝，刚好一一对应。"
            }
          },
          {
            id: "c4q2",
            type: "true_false",
            question: "判断题：天亮前可以替窗外的人开窗，只要他看起来像同学。",
            correctAnswer: false,
            failureFeedback: {
              failedRuleIds: ["r8"],
              reason: "窗外的外形越像同学，越说明它在故意使用你的熟悉感。天亮前开窗会直接把异常放进宿舍。",
              narration: "窗锁弹开的瞬间，冷风里伸进来的不是手，而是一整排湿漉漉的床架。等天亮时，宿舍已经变成了13号。"
            }
          }
        ]
      }
    ],
    endings: {
      perfect: "你们没有回应门外的声音，也没有承认那条不存在的第13条。天亮时，墙上的值日表少了一个名字，而你还记得自己是谁。",
      partial: "你们勉强撑到了天亮，但宿舍楼里总有一个床位在空着。没人愿意提起昨夜到底少了谁。",
      failed: "你把所有异样都当成了正常，于是你成了规则的一部分。明年的新生手册里，第13条会写上你的名字。"
    }
  }
];

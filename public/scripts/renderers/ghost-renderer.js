(function attachGhostRenderer(globalScope) {
  const utils = globalScope.FillwordUtils;

  function escape(value) {
    if (!utils || typeof utils.escapeHtml !== "function") {
      return String(value || "");
    }
    return utils.escapeHtml(String(value || ""));
  }

  function renderPlayers(players) {
    return (players || []).map(player => {
      let badge = '<span class="badge done">存活</span>';
      if (player.connected === false) {
        badge = '<span class="badge waiting">离线</span>';
      } else if (player.alive === false) {
        badge = '<span class="badge waiting">已失败</span>';
      } else if (player.submitted) {
        badge = '<span class="badge done">已提交</span>';
      }
      return `<div class="player-item">
        <div class="player-copy">
          <strong>${escape(player.playerName)}</strong>
          <span class="player-meta">${player.alive === false ? "本轮已淘汰" : "仍在闯关中"}</span>
        </div>
        ${badge}
      </div>`;
    }).join("");
  }

  function renderQuestions(questions) {
    return (questions || []).map(question => {
      if (Array.isArray(question.options)) {
        const options = question.options.map((option, index) => {
          return `<label class="player-item ghost-question-card">
            <span class="player-copy">
              <strong class="ghost-option-choice">${escape(String.fromCharCode(65 + index))}</strong>
              <span class="player-meta ghost-option-meta">${escape(option)}</span>
            </span>
            <input type="radio" name="ghost_${escape(question.id)}" value="${index}">
          </label>`;
        }).join("");
        return `<div class="stack ghost-question-card">
          <div class="ghost-question-title">${escape(question.question)}</div>
          <div class="choice-grid">${options}</div>
        </div>`;
      }

      return `<div class="stack ghost-question-card">
        <div class="ghost-question-title">${escape(question.question)}</div>
        <div class="template-grid">
          <label class="player-item ghost-question-card">
            <span class="player-copy"><strong class="ghost-option-choice">是</strong><span class="player-meta ghost-option-meta">判断为真</span></span>
            <input type="radio" name="ghost_${escape(question.id)}" value="true">
          </label>
          <label class="player-item ghost-question-card">
            <span class="player-copy"><strong class="ghost-option-choice">否</strong><span class="player-meta ghost-option-meta">判断为假</span></span>
            <input type="radio" name="ghost_${escape(question.id)}" value="false">
          </label>
        </div>
      </div>`;
    }).join("");
  }

  function renderRules(rules) {
    if (!rules || !rules.length) {
      return '<div class="selection-summary">暂无可查看的规则。</div>';
    }
    return rules.map((rule, index) => {
      const severityLabel = rule.severity === "critical" ? "高危" : "注意";
      return `<div class="player-item">
        <div class="player-copy">
          <strong>规则 ${index + 1}</strong>
          <span class="player-meta">${escape(rule.text || "")}</span>
        </div>
        <span class="badge waiting">${escape(severityLabel)}</span>
      </div>`;
    }).join("");
  }

  function renderClues(clues) {
    if (!clues || !clues.length) return "";
    return `<div class="stack ghost-clue-card">
      <strong>本章线索</strong>
      <span class="player-meta ghost-option-meta">只会展示当前章节已经暴露出来的异常细节。</span>
      ${clues.map(clue => `<div class="ghost-option-label">${escape(clue)}</div>`).join("")}
    </div>`;
  }

  function renderOutcomeList(outcomes) {
    return (outcomes || []).map(item => {
      const label = item.status === "survived" ? "生还" : "失败";
      return `<div class="player-item">
        <div class="player-copy">
          <strong>${escape(item.playerName)}</strong>
          <span class="player-meta">${escape(item.summary || "")}</span>
        </div>
        <span class="badge ${item.status === "survived" ? "done" : "waiting"}">${escape(label)}</span>
      </div>`;
    }).join("");
  }

  function renderRoom(state) {
    if (!state) return { content: "", primaryLabel: "", secondaryLabel: "" };

    const playersHtml = renderPlayers(state.players);
    const isHost = state.viewerRole === "host";

    if (state.status === "lobby") {
      return {
        eyebrow: "Ghost Story",
        title: "故事包已就位",
        subtitle: isHost ? "确认人齐后开始本局。" : "等待房主开始后，就会进入第一章节。",
        playersHtml,
        content: `<div class="selection-summary ghost-chapter-card">
          <strong>${escape(state.packTitle)}</strong><br>
          ${escape(state.intro)}
        </div>
        <details class="selection-summary ghost-rules-panel">
          <summary><strong>预览规则列表</strong></summary>
          <div class="stack">${renderRules(state.rules)}</div>
        </details>`,
        primaryLabel: isHost ? "开始本局" : "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    if (state.status === "ending_reveal" && state.result) {
      return {
        eyebrow: "Ghost Ending",
        title: "结局揭晓",
        subtitle: state.result.endingKey === "perfect" ? "至少有玩家撑到了最后一章。" : "所有玩家都倒在了守则之中。",
        playersHtml,
        content: `<div class="selection-summary ghost-chapter-card">
          <strong>${escape(String(state.result.endingKey || "").toUpperCase())}</strong><br>
          ${escape(state.result.endingText || "")}
        </div>
        <div class="selection-summary ghost-feedback-card ghost-feedback-narration">${escape(state.result.aiEndingSummary || "")}</div>
        <div class="stack">${renderOutcomeList(state.result.playerOutcomes)}</div>`,
        primaryLabel: "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    if (state.viewerAlive === false) {
      const failedChapter = Number(state.viewerFailedAtChapterIndex || 0) + 1;
      const failure = state.viewerFailureDetails || {};
      const failedRules = (failure.failedRuleIds || []).map(ruleId => {
        return (state.rules || []).find(rule => rule.id === ruleId);
      }).filter(Boolean);
      return {
        eyebrow: "Ghost Eliminated",
        title: "你已失败",
        subtitle: `你倒在第 ${escape(String(failedChapter))} 章，无法继续进入后续章节。`,
        playersHtml,
        content: `<div class="ghost-feedback-card">
          <strong>失败等待页</strong><br>
          <span class="ghost-feedback-reason">请等待其他仍存活的玩家完成本局，结局会自动同步到这里。</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>答错题目</strong><br>
          <span class="ghost-feedback-reason">${escape(failure.question || "你没有通过本章守则判定。")}</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>你的选择</strong><br>
          <span class="ghost-feedback-reason">${escape(failure.selectedAnswer || "未记录")}</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>正确答案</strong><br>
          <span class="ghost-feedback-reason">${escape(failure.correctAnswer || "未记录")}</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>违反规则</strong><br>
          <span class="ghost-feedback-reason">${failedRules.length ? failedRules.map(rule => escape(rule.text)).join("<br>") : "你在当前章节触犯了隐藏守则。"}</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>死因说明</strong><br>
          <span class="ghost-feedback-reason">${escape(failure.failureReason || "你违反了当前章节的守则。")}</span>
        </div>
        <div class="ghost-feedback-card ghost-feedback-narration">
          <strong>最后发生了什么</strong><br>
          ${escape(failure.failureNarration || "门外的异常已经注意到了你。")}
        </div>`,
        primaryLabel: "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    if (state.status === "chapter_resolved" && state.chapterResolution) {
      const resolution = state.chapterResolution;
      const eliminatedNames = (resolution.eliminated || []).map(item => item.playerName).join("、");
      return {
        eyebrow: "Ghost Transition",
        title: `${escape(resolution.chapterTitle || "本章")} 已结束`,
        subtitle: eliminatedNames
          ? `这一章之后，${escape(eliminatedNames)} 没能继续往前。`
          : "这一章暂时没有人掉队，但整层楼比刚才更安静了。",
        playersHtml,
        content: `<div class="ghost-feedback-card ghost-feedback-narration">${escape(resolution.transitionNarration || "走廊里没有人说话，但灯光还在缓慢闪烁。")}</div>
        <div class="ghost-clue-card">
          <strong>本章结果</strong><br>
          存活 ${escape(String((resolution.survivors || []).length))} 人，淘汰 ${escape(String((resolution.eliminated || []).length))} 人。
        </div>
        <div class="ghost-feedback-card">
          <strong>仍可继续的人</strong><br>
          <span class="ghost-feedback-reason">${(resolution.survivors || []).length ? escape((resolution.survivors || []).map(item => item.playerName).join("、")) : "无人幸存"}</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>已停在上一章的人</strong><br>
          <span class="ghost-feedback-reason">${(resolution.eliminated || []).length ? escape((resolution.eliminated || []).map(item => item.playerName).join("、")) : "本章无人淘汰"}</span>
        </div>
        <div class="ghost-feedback-card">
          <strong>进入下一章</strong><br>
          <span class="ghost-feedback-reason">${escape(resolution.nextChapterTitle || "下一章")}</span>
        </div>`,
        primaryLabel: state.viewerAlive ? "继续前进" : "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    if (state.viewerSubmittedCurrentChapter) {
      return {
        eyebrow: "Ghost Waiting",
        title: "等待本章统一结算",
        subtitle: "你已完成本章作答，系统正在等待其他仍存活的玩家提交答案。",
        playersHtml,
        content: `<div class="selection-summary ghost-clue-card">
          <strong>已提交</strong><br>
          保持页面开启。等所有存活玩家作答后，系统会统一判定谁能进入下一章。
        </div>`,
        primaryLabel: "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    return {
      eyebrow: "Ghost Chapter",
      title: `${escape(state.currentChapterTitle || "当前章节")}`,
      subtitle: `当前是第 ${escape(String((state.currentChapterIndex || 0) + 1))} 章。所有存活玩家完成本章后，系统才会统一结算。`,
      playersHtml,
      content: `<div class="selection-summary ghost-feedback-card ghost-feedback-narration">${escape(state.introNarration || state.intro || "")}</div>
      <details class="selection-summary ghost-rules-panel" open>
        <summary><strong>查看规则列表</strong></summary>
        <div class="stack">${renderRules(state.rules)}</div>
      </details>
      <div class="ghost-chapter-card">
        <strong>${escape(state.currentChapterTitle || "当前章节")}</strong><br>
        ${escape(state.currentChapterContent || "")}
      </div>
      ${renderClues(state.currentChapterClues)}
      <div class="stack">${renderQuestions(state.currentChapterQuestions)}</div>`,
      primaryLabel: "提交本章答案",
      secondaryLabel: isHost ? "关闭房间" : "离开房间",
    };
  }

  globalScope.FillwordGhostRenderer = {
    renderRoom,
  };
})(window);

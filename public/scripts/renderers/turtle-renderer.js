(function attachTurtleRenderer(globalScope) {
  const utils = globalScope.FillwordUtils;

  function escape(value) {
    if (!utils || typeof utils.escapeHtml !== "function") {
      return String(value || "");
    }
    return utils.escapeHtml(String(value || ""));
  }

  function renderPlayers(players) {
    return (players || []).map(player => {
      let badge = '<span class="badge done">在线</span>';
      if (player.connected === false) {
        badge = '<span class="badge waiting">离线</span>';
      } else if (player.guessed) {
        badge = '<span class="badge done">已猜测</span>';
      }
      return `<div class="player-item">
        <div class="player-copy">
          <strong>${escape(player.playerName)}</strong>
          <span class="player-meta">一起推理真相</span>
        </div>
        ${badge}
      </div>`;
    }).join("");
  }

  function renderHistory(history) {
    if (!history || !history.length) {
      return '<div class="selection-summary">还没有提问，先从最可疑的线索问起。</div>';
    }
    return history.map(item => {
      const index = item.index ? `第 ${item.index} 问 · ` : "";
      return `<div class="player-item">
        <div class="player-copy">
          <strong>${escape(item.playerName || "玩家")}</strong>
          <span class="player-meta">${escape(index)}${escape(item.question || "")}</span>
        </div>
        <span class="badge done">${escape(item.reply || item.verdict || "")}</span>
      </div>`;
    }).join("");
  }

  function renderGuesses(guesses) {
    return (guesses || []).map(item => {
      return `<div class="player-item">
        <div class="player-copy">
          <strong>${escape(item.playerName)}</strong>
          <span class="player-meta">${escape(item.guess || "未提交最终猜测")}</span>
        </div>
        <span class="badge done">${escape(item.scoreLabel)}</span>
      </div>`;
    }).join("");
  }

  function renderQuestionMeter(state) {
    const count = Number(state.questionCount || 0);
    const limit = Number(state.questionLimit || 20);
    const remaining = Math.max(0, Number(state.remainingQuestions ?? (limit - count)));
    const tone = remaining <= 3 ? "warning" : "done";
    return `<div class="player-item">
      <div class="player-copy">
        <strong>AI 主持人提问计数</strong>
        <span class="player-meta">已提问 ${escape(String(count))} / ${escape(String(limit))}，剩余 ${escape(String(remaining))} 次</span>
      </div>
      <span class="badge ${tone}">${remaining <= 0 ? "揭晓" : "计数中"}</span>
    </div>`;
  }

  function renderGuessFeedback(feedback, viewerRole) {
    if (!feedback || !feedback.hostHint) return "";
    const speaker = viewerRole === "host" ? "主持反馈" : "海龟汤主持人";
    return `<div class="selection-summary">
      <strong>${escape(speaker)}</strong><br>
      ${escape(feedback.hostHint)}
    </div>`;
  }

  function renderRoom(state) {
    if (!state) return { content: "", primaryLabel: "", secondaryLabel: "" };

    const playersHtml = renderPlayers(state.players);
    const isHost = state.viewerRole === "host";

    if (state.status === "lobby") {
      return {
        eyebrow: "Turtle Soup",
        title: "题面已就位",
        subtitle: isHost ? "确认大家都进房后，点击开始本局。" : "等待房主开始后，就能直接提问推理。",
        playersHtml,
        content: `<div class="selection-summary">
          <strong>${escape(state.caseTitle)}</strong><br>
          ${escape(state.opening)}
        </div>`,
        primaryLabel: isHost ? "开始本局" : "",
        primaryDisabled: false,
        dangerLabel: "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    if (state.status === "truth_reveal" && state.result) {
      const solvedText = state.result.outcome === "solved" && state.result.solvedBy
        ? `${escape(state.result.solvedBy.playerName)} 提前破解了谜底。`
        : state.result.outcome === "abandoned"
          ? "主持人已选择放弃本局，现在直接公布真相。"
          : `提问次数已用尽（${escape(String(state.result.questionCount || 0))}/${escape(String(state.result.questionLimit || 20))}），本局失败。`;
      return {
        eyebrow: "Turtle Reveal",
        title: state.result.outcome === "solved" ? "成功通关" : (state.result.outcome === "abandoned" ? "主持人终止" : "真相公布"),
        subtitle: solvedText,
        playersHtml,
        content: `${renderQuestionMeter(state)}
        ${renderGuessFeedback(state.guessFeedback, state.viewerRole)}
        <div class="selection-summary">
          <strong>官方真相</strong><br>
          ${escape(state.result.fullTruth)}
        </div>
        <div class="stack">${renderGuesses(state.result.guesses)}</div>`,
        primaryLabel: "",
        dangerLabel: "",
        secondaryLabel: isHost ? "关闭房间" : "离开房间",
      };
    }

    return {
      eyebrow: "Turtle Asking",
      title: "开始提问",
      subtitle: `AI 主持人会回答“是 / 否 / 无关 / 接近了”，剩余 ${escape(String((state.questionLimit || 20) - (state.questionCount || 0)))} 次提问机会。`,
      playersHtml,
      content: `<div class="selection-summary">
        <strong>${escape(state.caseTitle)}</strong><br>
        ${escape(state.opening)}
      </div>
      ${renderQuestionMeter(state)}
      ${renderGuessFeedback(state.guessFeedback, state.viewerRole)}
      <div class="field-group">
        <label class="label" for="turtleQuestionInput">你的问题</label>
        <input class="field" id="turtleQuestionInput" maxlength="80" autocomplete="off" placeholder="比如：他是不是看到了镜子里的自己？">
      </div>
      <label class="player-item">
        <span class="player-copy">
          <strong>我准备直接猜真相</strong>
          <span class="player-meta">抓住核心因果会直接通关；如果只差最后一步，主持人会提示你继续补充</span>
        </span>
        <input type="checkbox" id="turtleGuessMode">
      </label>
      <div class="stack">${renderHistory(state.qaHistory)}</div>`,
      primaryLabel: "提交内容",
      dangerLabel: isHost ? "放弃本局" : "",
      secondaryLabel: isHost ? "关闭房间" : "离开房间",
    };
  }

  globalScope.FillwordTurtleRenderer = {
    renderRoom,
  };
})(window);

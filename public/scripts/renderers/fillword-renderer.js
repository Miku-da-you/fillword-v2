(function attachFillwordRenderer(globalScope) {
  const utils = globalScope.FillwordUtils;

  function escape(value) {
    return utils.escapeHtml(String(value || ""));
  }

  function getPlayerBadge(player) {
    if (player.connected === false) {
      return '<span class="badge waiting">离线</span>';
    }
    if (player.submitted) {
      return '<span class="badge done">已提交</span>';
    }
    return '<span class="badge waiting">待提交</span>';
  }

  function renderPlayers(players, hostPlayerId) {
    return players
      .filter(player => player.playerId !== hostPlayerId)
      .map(player => {
        return `<div class="player-item">
          <div class="player-copy">
            <strong>${escape(player.playerName)}</strong>
            <span class="player-meta">负责 ${player.assignedFieldKeys.length} 项</span>
          </div>
          ${getPlayerBadge(player)}
        </div>`;
      })
      .join("");
  }

  function renderPlayersForViewer(players, state) {
    if (state.isHost) {
      return renderPlayers(players, state.hostPlayerId);
    }

    return (players || [])
      .filter(player => !player.isHost)
      .map(player => {
        const roleLabel = player.isViewer
          ? `你：${state.viewerSubmitted ? "已提交" : "待填写"}`
          : "同房玩家";
        return `<div class="player-item">
          <div class="player-copy">
            <strong>${escape(player.playerName)}</strong>
            <span class="player-meta">${escape(roleLabel)}</span>
          </div>
          ${getPlayerBadge(player)}
        </div>`;
      }).join("");
  }

  function renderPromptInputs(prompts) {
    return (prompts || []).map(prompt => {
      return `<div class="field-group">
        <label class="label" for="field_${prompt.key}">${escape(prompt.label)}</label>
        <input class="field" id="field_${prompt.key}" maxlength="40" autocomplete="off"
          placeholder="${escape(prompt.placeholder || "输入内容")}">
        <div class="field-hint">${escape(prompt.exampleHint || "")}</div>
      </div>`;
    }).join("");
  }

  function renderRoom(state) {
    if (!state) return { content: "", primaryLabel: "", secondaryLabel: "" };

    if (state.isHost) {
      const joinedPlayers = Number(state.joinedPlayerCount || 0);
      const targetPlayers = Number(state.targetPlayerCount || 0);
      const submittedPlayers = Number(state.submittedPlayerCount || 0);
      return {
        eyebrow: "Fillword Host",
        title: "主持人控制台",
        subtitle: `你是主持人，只负责建房、选剧本和公布结果。当前 ${submittedPlayers}/${targetPlayers} 名玩家已提交，还差 ${Math.max(0, targetPlayers - submittedPlayers)} 人。`,
        playersHtml: renderPlayersForViewer(state.players, state),
        content: `<div class="selection-summary">
          <strong>主持人说明</strong><br>
          你不参与填词，只负责等待所有玩家提交后点击“生成结果”。
        </div>
        <div class="selection-summary">
          <strong>玩家进度</strong><br>
          已加入 ${escape(String(joinedPlayers))}/${escape(String(targetPlayers))} 名玩家，已提交 ${escape(String(submittedPlayers))} 人。
        </div>`,
        primaryLabel: state.canGenerate ? "生成结果" : "等待全部提交",
        primaryDisabled: !state.canGenerate,
        secondaryLabel: "关闭房间",
      };
    }

    if (state.result) {
      return {
        eyebrow: "Fillword Result",
        title: "这一轮结果已生成",
        subtitle: "结果会自动同步给所有人。",
        playersHtml: "",
        content: "",
        primaryLabel: "",
        secondaryLabel: "",
      };
    }

    if (state.status === "waiting" && !state.viewerSubmitted) {
      return {
        eyebrow: "Fillword Player",
        title: `欢迎你，${escape(state.viewerPlayerName || "玩家")}`,
        subtitle: "你现在是玩家视角，只需要填写自己分到的内容。提交后等待主持人公布结果即可。",
        playersHtml: renderPlayersForViewer(state.players, state),
        content: `<div class="selection-summary">
          <strong>你的任务</strong><br>
          当前为待填写，本轮共负责 ${escape(String((state.assignedFieldKeys || []).length))} 项内容。
        </div>
        <div class="selection-summary">
          <strong>填写说明</strong><br>
          只填写你自己的内容，其他玩家的部分由他们分别完成。
        </div>${renderPromptInputs(state.assignedPrompts || [])}`,
        primaryLabel: "提交答案",
        secondaryLabel: "离开房间",
      };
    }

    return {
      eyebrow: "Fillword Waiting",
      title: `已收到 ${escape(state.viewerPlayerName || "你的")} 提交`,
      subtitle: "你现在仍然是玩家视角。保持页面开启，等待主持人公布结果。",
      playersHtml: renderPlayersForViewer(state.players, state),
      content: `<div class="selection-summary">
        <strong>当前状态</strong><br>
        你的答案已提交成功，现在只需等待主持人生成结果。
      </div>
      <div class="wait-card"><div class="spinner">&#9203;</div><p>结果会自动推送到这里。</p></div>`,
      primaryLabel: "",
      secondaryLabel: "离开房间",
    };
  }

  globalScope.FillwordFillwordRenderer = {
    renderRoom,
  };
})(window);

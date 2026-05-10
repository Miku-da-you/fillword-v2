(() => {
  const TEMPLATES = window.TEMPLATES || [];
  const utils = window.FillwordUtils;
  const appSocket = window.FillwordAppSocket;
  const fillwordRenderer = window.FillwordFillwordRenderer;
  const turtleRenderer = window.FillwordTurtleRenderer;
  const ghostRenderer = window.FillwordGhostRenderer;
  let turtleCases = [];
  let ghostPacks = [];

  let selectedMode = "fillword";
  let selectedTemplateId = null;
  let selectedCaseId = null;
  let selectedPackId = null;
  let currentRoomState = null;
  let currentPrompts = [];

  function getRenderer(mode) {
    if (mode === "turtle") return turtleRenderer;
    if (mode === "ghost") return ghostRenderer;
    return fillwordRenderer;
  }

  function getTemplateById(templateId) {
    return TEMPLATES.find(template => template.id === templateId);
  }

  function getCaseById(caseId) {
    return turtleCases.find(item => item.id === caseId);
  }

  function getPackById(packId) {
    return ghostPacks.find(item => item.id === packId);
  }

  function getSelectedPlayerCount() {
    if (selectedMode === "turtle") {
      return Number(document.getElementById("turtlePlayerCountSelect").value);
    }
    if (selectedMode === "ghost") {
      return Number(document.getElementById("ghostPlayerCountSelect").value);
    }
    return Number(document.getElementById("playerCountSelect").value);
  }

  function showPage(name) {
    utils.showPage(name);
  }

  function updateCreateSummary() {
    const summary = document.getElementById("selectionSummary");
    const btn = document.getElementById("createRoomBtn");
    const count = getSelectedPlayerCount();
    if (selectedMode === "turtle") {
      const gameCase = getCaseById(selectedCaseId);
      if (!gameCase) {
        summary.textContent = "先选一个海龟汤题包，再创建房间。";
        btn.disabled = true;
        btn.textContent = "请选择题包";
        return;
      }
      summary.textContent = `已选海龟汤：「${gameCase.emoji} ${gameCase.title}」，${count} 人局`;
      btn.disabled = false;
      btn.textContent = `创建 ${count} 人海龟汤房间`;
      return;
    }

    if (selectedMode === "ghost") {
      const pack = getPackById(selectedPackId);
      if (!pack) {
        summary.textContent = "先选一个怪谈故事包，再创建房间。";
        btn.disabled = true;
        btn.textContent = "请选择故事包";
        return;
      }
      summary.textContent = `已选怪谈：「${pack.emoji} ${pack.title}」，${count} 人局`;
      btn.disabled = false;
      btn.textContent = `创建 ${count} 人怪谈房间`;
      return;
    }

    const template = getTemplateById(selectedTemplateId);
    if (!template) {
      summary.textContent = "先点一个剧本，再创建房间。";
      btn.disabled = true;
      btn.textContent = "请选择剧本";
      return;
    }

    summary.textContent = `已选：「${template.emoji} ${template.title}」，${count} 人局`;
    btn.disabled = false;
    btn.textContent = `创建 ${count} 人房间`;
  }

  function renderTemplates() {
    const grid = document.getElementById("templateGrid");
    grid.innerHTML = TEMPLATES.map((template, index) => {
      const counts = template.supportedPlayerCounts.join(" / ");
      return `<div class="template-card" data-index="${index}" data-id="${template.id}">
        <div class="emoji">${template.emoji}</div>
        <div class="name">${template.title}</div>
        <div class="meta">支持 ${counts} 人</div>
      </div>`;
    }).join("");

    grid.querySelectorAll(".template-card").forEach(card => {
      card.addEventListener("click", () => {
        grid.querySelectorAll(".template-card").forEach(node => node.classList.remove("is-selected"));
        card.classList.add("is-selected");
        selectedTemplateId = card.dataset.id;
        const template = getTemplateById(selectedTemplateId);
        const select = document.getElementById("playerCountSelect");
        if (template) {
          select.innerHTML = template.supportedPlayerCounts
            .map(count => `<option value="${count}">${count} 人</option>`)
            .join("");
        }
        updateCreateSummary();
      });
    });
  }

  function renderModePicker({ gridId, items, selectedId, onSelect }) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = items.map(item => {
      const selectedClass = item.id === selectedId ? " is-selected" : "";
      return `<button class="template-card${selectedClass}" data-id="${item.id}" type="button">
        <div class="emoji">${item.emoji}</div>
        <div class="name">${item.title}</div>
        <div class="meta">${item.summary}</div>
      </button>`;
    }).join("");

    grid.querySelectorAll(".template-card").forEach(card => {
      card.addEventListener("click", () => {
        grid.querySelectorAll(".template-card").forEach(node => node.classList.remove("is-selected"));
        card.classList.add("is-selected");
        onSelect(card.dataset.id);
        updateCreateSummary();
      });
    });
  }

  function renderTurtleCases() {
    renderModePicker({
      gridId: "turtleCaseGrid",
      items: turtleCases,
      selectedId: selectedCaseId,
      onSelect(id) {
        selectedCaseId = id;
      }
    });
  }

  function renderGhostPacks() {
    renderModePicker({
      gridId: "ghostPackGrid",
      items: ghostPacks,
      selectedId: selectedPackId,
      onSelect(id) {
        selectedPackId = id;
      }
    });
  }

  function renderModeCards() {
    document.querySelectorAll("#modeGrid .template-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll("#modeGrid .template-card").forEach(node => node.classList.remove("is-selected"));
        card.classList.add("is-selected");
        selectedMode = card.dataset.mode;
        document.getElementById("fillwordCreateFields").hidden = selectedMode !== "fillword";
        document.getElementById("turtleCreateFields").hidden = selectedMode !== "turtle";
        document.getElementById("ghostCreateFields").hidden = selectedMode !== "ghost";
        updateCreateSummary();
      });
    });
  }

  async function loadModeContent() {
    const response = await fetch("/fillword/content-manifest", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("题包配置加载失败");
    }

    const payload = await response.json();
    turtleCases = Array.isArray(payload.turtleCases) ? payload.turtleCases : [];
    ghostPacks = Array.isArray(payload.ghostPacks) ? payload.ghostPacks : [];
    selectedCaseId = turtleCases[0] ? turtleCases[0].id : null;
    selectedPackId = ghostPacks[0] ? ghostPacks[0].id : null;
  }

  async function handleCreateRoom() {
    const btn = document.getElementById("createRoomBtn");
    btn.disabled = true;
    btn.textContent = "创建中...";
    try {
      const payload = {
        mode: selectedMode,
        targetPlayerCount: getSelectedPlayerCount(),
      };
      if (selectedMode === "fillword") {
        payload.templateId = selectedTemplateId;
      } else if (selectedMode === "turtle") {
        payload.caseId = selectedCaseId;
      } else if (selectedMode === "ghost") {
        payload.packId = selectedPackId;
      }

      const response = await appSocket.createRoom(payload);
      currentPrompts = [];
      applyRoomState(response.roomState);
    } catch (error) {
      utils.showError(error.message);
      updateCreateSummary();
    }
  }

  async function handleJoinRoom() {
    const btn = document.getElementById("joinBtn");
    const roomCode = document.getElementById("roomCodeInput").value.trim().toUpperCase();
    const playerName = document.getElementById("playerNameInput").value.trim();

    if (!roomCode) {
      utils.showError("请输入房间号");
      return;
    }
    if (!playerName) {
      utils.showError("请输入你的名字");
      return;
    }

    btn.disabled = true;
    btn.textContent = "加入中...";
    try {
      const response = await appSocket.joinRoom({ roomCode, playerName });
      currentPrompts = response.assignedPrompts || [];
      applyRoomState(response.roomState);
    } catch (error) {
      utils.showError(error.message);
      btn.disabled = false;
      btn.textContent = "加入游戏";
    }
  }

  function getRoomStatusLabel(state) {
    const map = {
      waiting: state.mode === "fillword" ? "等待填写" : "等待开始",
      all_submitted: "全部已提交",
      result_ready: "结果已生成",
      lobby: "等待开始",
      asking: "提问中",
      truth_reveal: "真相揭晓",
      choosing: "阅读作答",
      chapter_answering: "阅读作答",
      chapter_resolved: "章节过场",
      judging: "等待作答",
      ending_reveal: "结局揭晓",
      closed: "房间已关闭",
    };
    return map[state.status] || "进行中";
  }

  function applyRoomState(state) {
    if (!state) return;
    currentRoomState = {
      ...state,
      assignedPrompts: (state.assignedPrompts && state.assignedPrompts.length) ? state.assignedPrompts : currentPrompts
    };

    if (
      (state.mode === "fillword" && state.status === "result_ready" && state.result) ||
      (state.mode === "turtle" && state.status === "truth_reveal" && state.result) ||
      (state.mode === "ghost" && state.status === "ending_reveal" && state.result)
    ) {
      renderResult(state.result);
      return;
    }

    renderCurrentRoom();
  }

  function renderCurrentRoom() {
    if (!currentRoomState) return;
    showPage("room");
    utils.setText("displayRoomCode", currentRoomState.roomCode);
    const joinedCount = currentRoomState.mode === "fillword"
      ? (currentRoomState.joinedPlayerCount || 0)
      : (currentRoomState.joinedTotalCount || currentRoomState.joined || 0);
    utils.setText("statJoined", joinedCount);
    utils.setText("statTarget", currentRoomState.targetPlayerCount || 0);
    utils.setText("statStatus", getRoomStatusLabel(currentRoomState));

    const stateForRender = {
      ...currentRoomState,
      assignedPrompts: currentRoomState.assignedPrompts && currentRoomState.assignedPrompts.length
        ? currentRoomState.assignedPrompts
        : currentPrompts
    };
    const renderer = getRenderer(currentRoomState.mode);
    const view = renderer.renderRoom(stateForRender);

    utils.setText("roomEyebrow", view.eyebrow || "Room");
    utils.setText("roomTitle", view.title || "房间进行中");
    utils.setText("roomSubtitle", view.subtitle || "");
    utils.setHtml("playersList", view.playersHtml || "");
    utils.setHtml("modeContent", view.content || "");

    const primaryBtn = document.getElementById("primaryActionBtn");
    const dangerBtn = document.getElementById("dangerActionBtn");
    const secondaryBtn = document.getElementById("secondaryActionBtn");

    if (view.primaryLabel) {
      primaryBtn.hidden = false;
      primaryBtn.disabled = Boolean(view.primaryDisabled);
      primaryBtn.textContent = view.primaryLabel;
    } else {
      primaryBtn.hidden = true;
    }

    if (view.dangerLabel) {
      dangerBtn.hidden = false;
      dangerBtn.disabled = false;
      dangerBtn.textContent = view.dangerLabel;
    } else {
      dangerBtn.hidden = true;
    }

    if (view.secondaryLabel) {
      secondaryBtn.hidden = false;
      secondaryBtn.disabled = false;
      secondaryBtn.textContent = view.secondaryLabel;
    } else {
      secondaryBtn.hidden = true;
    }
  }

  function renderResult(result) {
    const mode = currentRoomState && currentRoomState.mode;
    if (mode === "turtle") {
      utils.setText("resultTag", currentRoomState.caseTitle || "海龟汤");
      utils.setText("resultTitle", result.title || currentRoomState.caseTitle || "真相公布");
      utils.setText("resultScript", result.fullTruth || "");
      utils.setHtml("resultPlayers", (result.guesses || []).map(player => {
        return `<div class="result-player">
          <span class="result-player-name">${utils.escapeHtml(player.playerName)}</span>
          <span class="result-player-answers">${utils.escapeHtml(player.guess)} · ${utils.escapeHtml(player.scoreLabel)}</span>
        </div>`;
      }).join(""));
      showPage("result");
      return;
    }

    if (mode === "ghost") {
      const endingLabelMap = {
        perfect: "完美结局",
        partial: "部分破解",
        failed: "坠入规则"
      };
      utils.setText("resultTag", currentRoomState.packTitle || "恐怖怪谈");
      utils.setText("resultTitle", endingLabelMap[result.endingKey] || "怪谈结局");
      utils.setText("resultScript", [result.endingText, result.aiEndingSummary].filter(Boolean).join("\n\n"));
      utils.setHtml("resultPlayers", (result.scores || []).map(player => {
        const percent = Math.round(Number(player.accuracy || 0) * 100);
        return `<div class="result-player">
          <span class="result-player-name">${utils.escapeHtml(player.playerName)}</span>
          <span class="result-player-answers">${utils.escapeHtml(String(player.correctCount || 0))}/${utils.escapeHtml(String(player.totalQuestions || 0))} · ${utils.escapeHtml(String(percent))}%</span>
        </div>`;
      }).join(""));
      showPage("result");
      return;
    }

    const template = currentRoomState ? getTemplateById(currentRoomState.templateId) : null;
    utils.setText("resultTag", template ? template.title : (currentRoomState.mode || "Party"));
    utils.setText("resultTitle", result.resultTitle || "结果");
    utils.setText("resultScript", result.script || "");
    utils.setHtml("resultPlayers", (result.players || []).map(player => {
      const answers = Object.values(player.answers || {}).join("、");
      return `<div class="result-player">
        <span class="result-player-name">${utils.escapeHtml(player.playerName)}</span>
        <span class="result-player-answers">${utils.escapeHtml(answers)}</span>
      </div>`;
    }).join(""));
    showPage("result");
  }

  function collectGhostAnswers(questions) {
    const answers = {};
    for (const question of questions || []) {
      const checked = document.querySelector(`input[name="ghost_${question.id}"]:checked`);
      if (!checked) {
        throw new Error("请先完成所有题目");
      }
      answers[question.id] = Array.isArray(question.options)
        ? Number(checked.value)
        : checked.value === "true";
    }
    return answers;
  }

  async function handlePrimaryAction() {
    if (!currentRoomState) return;
    if (currentRoomState.mode === "turtle") {
      try {
        if (currentRoomState.status === "lobby") {
          const response = await appSocket.startRoom();
          applyRoomState(response.roomState);
          return;
        }

        const input = document.getElementById("turtleQuestionInput");
        const text = input && input.value.trim();
        if (!text) {
          utils.showError("请输入问题或猜测");
          return;
        }
        const guessMode = document.getElementById("turtleGuessMode");
        if (guessMode && guessMode.checked) {
          const response = await appSocket.submitTurtleGuess(text);
          if (input) input.value = "";
          if (guessMode) guessMode.checked = false;
          applyRoomState(response.roomState);
        } else {
          const response = await appSocket.submitTurtleQuestion(text);
          if (input) input.value = "";
          applyRoomState(response.roomState);
        }
      } catch (error) {
        utils.showError(error.message);
      }
      return;
    }

    if (currentRoomState.mode === "ghost") {
      try {
        if (currentRoomState.status === "lobby") {
          const response = await appSocket.startRoom();
          applyRoomState(response.roomState);
          return;
        }
        if (currentRoomState.status === "chapter_resolved") {
          const response = await appSocket.continueGhostChapter();
          applyRoomState(response.roomState);
          return;
        }
        const answers = collectGhostAnswers(currentRoomState.currentChapterQuestions || currentRoomState.questions);
        const response = await appSocket.submitGhostAnswers(answers);
        applyRoomState(response.roomState);
      } catch (error) {
        utils.showError(error.message);
      }
      return;
    }

    if (currentRoomState.isHost) {
      try {
        const response = await appSocket.generateResult();
        applyRoomState(response.roomState);
      } catch (error) {
        utils.showError(error.message);
      }
      return;
    }

    const answers = utils.collectAnswers(currentPrompts);
    try {
      const response = await appSocket.submitAnswers(answers);
      applyRoomState(response.roomState);
    } catch (error) {
      utils.showError(error.message);
    }
  }

  async function handleDangerAction() {
    if (!currentRoomState) return;
    if (currentRoomState.mode === "turtle" && currentRoomState.isHost && currentRoomState.status === "asking") {
      try {
        const response = await appSocket.abandonTurtleGame();
        applyRoomState(response.roomState);
      } catch (error) {
        utils.showError(error.message || "放弃本局失败");
      }
      return;
    }

    utils.showError("当前阶段不能放弃本局");
  }

  async function handleSecondaryAction() {
    if (!currentRoomState) return;
    try {
      if (currentRoomState.isHost) {
        await appSocket.closeRoom();
      } else {
        await appSocket.leaveRoom();
      }
    } catch (_error) {
    }
    appSocket.disconnect();
    currentRoomState = null;
    currentPrompts = [];
    showPage("landing");
  }

  function resetToLanding() {
    appSocket.disconnect();
    currentRoomState = null;
    currentPrompts = [];
    document.getElementById("roomCodeInput").value = "";
    document.getElementById("playerNameInput").value = "";
    document.getElementById("joinBtn").disabled = false;
    document.getElementById("joinBtn").textContent = "加入游戏";
    updateCreateSummary();
    showPage("landing");
  }

  appSocket.onRoomState((state) => {
    if (state.mode === "turtle" && state.status === "truth_reveal" && state.result) {
      if (state.result.outcome === "failed") {
        utils.showError("20 次提问已用完，本局失败，已公布真相。");
      }
      if (state.result.outcome === "solved") {
        utils.showError("已有玩家成功猜中谜底，提前通关。");
      }
      if (state.result.outcome === "abandoned") {
        utils.showError("主持人已选择放弃本局，现直接公布真相。");
      }
    }
    applyRoomState(state);
  });

  appSocket.onResultGenerated((result) => {
    if (currentRoomState) {
      currentRoomState = { ...currentRoomState, result, status: "result_ready" };
    }
    renderResult(result);
  });

  appSocket.onRoomClosed(() => {
    utils.showError("房间已关闭");
    resetToLanding();
  });

  document.getElementById("goCreateBtn").addEventListener("click", () => showPage("create"));
  document.getElementById("goJoinBtn").addEventListener("click", () => showPage("join"));
  document.getElementById("backToLandingBtn").addEventListener("click", () => showPage("landing"));
  document.getElementById("backFromJoinBtn").addEventListener("click", () => showPage("landing"));
  document.getElementById("backToLandingResultBtn").addEventListener("click", () => resetToLanding());
  document.getElementById("playerCountSelect").addEventListener("change", updateCreateSummary);
  document.getElementById("turtlePlayerCountSelect").addEventListener("change", updateCreateSummary);
  document.getElementById("ghostPlayerCountSelect").addEventListener("change", updateCreateSummary);
  document.getElementById("createRoomBtn").addEventListener("click", handleCreateRoom);
  document.getElementById("joinBtn").addEventListener("click", handleJoinRoom);
  document.getElementById("primaryActionBtn").addEventListener("click", handlePrimaryAction);
  document.getElementById("dangerActionBtn").addEventListener("click", handleDangerAction);
  document.getElementById("secondaryActionBtn").addEventListener("click", handleSecondaryAction);

  async function bootstrap() {
    renderTemplates();
    await loadModeContent();
    renderTurtleCases();
    renderGhostPacks();
    renderModeCards();
    updateCreateSummary();
    showPage("landing");
  }

  bootstrap().catch(error => {
    utils.showError(error.message || "加载失败");
    renderTemplates();
    renderTurtleCases();
    renderGhostPacks();
    renderModeCards();
    updateCreateSummary();
    showPage("landing");
  });
})();

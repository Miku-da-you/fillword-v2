(() => {
  const TEMPLATES = window.TEMPLATES;
  let currentTemplateId = null;
  let currentRoomId = null;
  let currentPlayerId = null;
  let currentRoomState = null;

  function getTemplateById(templateId) {
    return TEMPLATES.find(t => t.id === templateId);
  }

  function getSelectedTemplate() {
    return currentTemplateId ? getTemplateById(currentTemplateId) : null;
  }

  function updateSelectionSummary() {
    const summary = document.getElementById("selectionSummary");
    const btn = document.getElementById("createRoomBtn");
    const template = getSelectedTemplate();
    if (!template) {
      summary.textContent = "先点一个剧本，再创建房间。";
      btn.disabled = true;
      btn.textContent = "请选择剧本";
    } else {
      const count = Number(document.getElementById("playerCountSelect").value);
      summary.textContent = `已选：「${template.emoji} ${template.title}」，${count} 人局`;
      btn.disabled = false;
      btn.textContent = `创建 ${count} 人房间`;
    }
  }

  function renderTemplates() {
    const grid = document.getElementById("templateGrid");
    grid.innerHTML = TEMPLATES.map((t, i) => {
      const counts = t.supportedPlayerCounts.join(" / ");
      return `<div class="template-card" data-index="${i}" data-id="${t.id}">
        <div class="emoji">${t.emoji}</div>
        <div class="name">${t.title}</div>
        <div class="meta">支持 ${counts} 人</div>
      </div>`;
    }).join("");

    grid.querySelectorAll(".template-card").forEach(card => {
      card.addEventListener("click", () => {
        grid.querySelectorAll(".template-card").forEach(c => c.classList.remove("is-selected"));
        card.classList.add("is-selected");
        currentTemplateId = card.dataset.id;
        updateSelectionSummary();
      });
    });
  }

  function updatePlayerCountOptions() {
    const template = getSelectedTemplate();
    const select = document.getElementById("playerCountSelect");
    if (!template) return;
    select.innerHTML = template.supportedPlayerCounts
      .map(n => `<option value="${n}">${n} 人</option>`)
      .join("");
  }

  async function handleCreateRoom() {
    const btn = document.getElementById("createRoomBtn");
    btn.disabled = true;
    btn.textContent = "创建中...";
    try {
      const template = getSelectedTemplate();
      const targetPlayerCount = Number(document.getElementById("playerCountSelect").value);
      const result = await FillwordSocket.createRoom(template.id, targetPlayerCount);
      currentRoomId = result.roomId;
      currentPlayerId = result.playerId;
      currentRoomState = result.roomState;
      FillwordUtils.showPage("waiting");
      renderWaitingRoom(result.roomState);
    } catch (err) {
      FillwordUtils.showError(err.message);
    } finally {
      updateSelectionSummary();
    }
  }

  function renderWaitingRoom(state) {
    FillwordUtils.setText("displayRoomCode", state.roomCode);
    FillwordUtils.setText("stat-target", state.targetPlayerCount);
    FillwordUtils.setText("stat-joined", state.joined);
    FillwordUtils.setText("stat-submitted", state.players.filter(p => !p.isHost && p.submitted).length);
    renderPlayersList(state.players);
    updateGenerateBtn(state);
  }

  function renderPlayersList(players) {
    const list = document.getElementById("playersList");
    list.innerHTML = players
      .filter(p => !(currentRoomState && currentRoomState.hostPlayerId === p.playerId))
      .map(p => {
        const status = p.submitted
          ? `<span class="badge done">已提交</span>`
          : `<span class="badge waiting">待提交</span>`;
        return `<div class="player-item">
          <div class="player-copy">
            <strong>${FillwordUtils.escapeHtml(p.playerName)}</strong>
            <span class="player-meta">负责 ${p.assignedFieldKeys.length} 项</span>
          </div>
          ${status}
        </div>`;
      }).join("");
  }

  function updateGenerateBtn(state) {
    const btn = document.getElementById("generateResultBtn");
    if (state.canGenerate) {
      btn.disabled = false;
      btn.textContent = "生成结果";
    } else {
      btn.disabled = true;
      btn.textContent = "等待全部提交";
    }
  }

  async function handleGenerateResult() {
    const btn = document.getElementById("generateResultBtn");
    btn.disabled = true;
    btn.textContent = "生成中...";
    try {
      await FillwordSocket.generateResult();
    } catch (err) {
      FillwordUtils.showError(err.message);
      updateGenerateBtn(currentRoomState);
    }
  }

  async function handleCloseRoom() {
    try {
      await FillwordSocket.closeRoom();
      FillwordSocket.disconnect();
      resetToSelect();
    } catch (err) {
      FillwordUtils.showError(err.message);
    }
  }

  function handleResultGenerated(result) {
    currentRoomState.result = result;
    currentRoomState.status = "result_ready";
    FillwordUtils.showPage("result");
    renderResult(result);
  }

  function renderResult(result) {
    const template = currentRoomState ? getTemplateById(currentRoomState.templateId) : null;
    FillwordUtils.setText("resultTag", template ? template.title : "Fillword");
    FillwordUtils.setText("resultTitle", result.resultTitle);
    FillwordUtils.setText("resultScript", result.script);
    const playersEl = document.getElementById("resultPlayers");
    playersEl.innerHTML = result.players.map(p => {
      const answers = Object.values(p.answers).join("、");
      return `<span>${FillwordUtils.escapeHtml(p.playerName)}：${FillwordUtils.escapeHtml(answers)}</span>`;
    }).join("");
  }

  function resetToSelect() {
    currentTemplateId = null;
    currentRoomId = null;
    currentPlayerId = null;
    currentRoomState = null;
    FillwordUtils.showPage("select");
    document.querySelectorAll(".template-card").forEach(c => c.classList.remove("is-selected"));
    updateSelectionSummary();
  }

  FillwordSocket.onRoomState((state) => {
    currentRoomState = state;
    if (state.status === "waiting" || state.status === "all_submitted") {
      FillwordUtils.showPage("waiting");
      renderWaitingRoom(state);
      return;
    }

    if (state.status === "result_ready" && state.result) {
      handleResultGenerated(state.result);
    }
  });

  FillwordSocket.onResultGenerated((result) => {
    handleResultGenerated(result);
  });

  FillwordSocket.onRoomClosed(() => {
    FillwordSocket.disconnect();
    resetToSelect();
  });

  document.getElementById("playerCountSelect").addEventListener("change", () => {
    updateSelectionSummary();
  });

  document.getElementById("createRoomBtn").addEventListener("click", handleCreateRoom);
  document.getElementById("generateResultBtn").addEventListener("click", handleGenerateResult);
  document.getElementById("closeRoomBtn").addEventListener("click", handleCloseRoom);
  document.getElementById("closeRoomResultBtn").addEventListener("click", handleCloseRoom);
  document.getElementById("playAgainBtn").addEventListener("click", () => {
    FillwordSocket.disconnect();
    resetToSelect();
  });

  renderTemplates();
  updateSelectionSummary();
})();

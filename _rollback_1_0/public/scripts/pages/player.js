(() => {
  let currentTemplateId = null;
  let currentPrompts = [];
  let currentPlayerId = null;
  let currentRoomId = null;
  let hasSubmitted = false;

  async function handleJoin() {
    const codeInput = document.getElementById("roomCodeInput");
    const nameInput = document.getElementById("playerNameInput");
    const btn = document.getElementById("joinBtn");

    const roomCode = codeInput.value.trim().toUpperCase();
    const playerName = nameInput.value.trim();

    if (!roomCode) { FillwordUtils.showError("请输入房间号"); return; }
    if (!playerName) { FillwordUtils.showError("请输入你的名字"); return; }

    btn.disabled = true;
    btn.textContent = "加入中...";
    try {
      const result = await FillwordSocket.joinRoom(roomCode, playerName);
      currentTemplateId = result.templateId;
      currentPlayerId = result.playerId;
      currentRoomId = result.roomState.roomId;
      currentPrompts = result.assignedPrompts || [];
      FillwordUtils.showPage("fill");
      renderTemplate(currentTemplateId, currentPrompts);
    } catch (err) {
      FillwordUtils.showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "加入游戏";
    }
  }

  function renderTemplate(templateId, prompts) {
    const titleEl = document.getElementById("templateTitle");
    const TEMPLATES = window.TEMPLATES;
    const template = TEMPLATES.find(t => t.id === templateId);
    if (titleEl && template) titleEl.textContent = template.title;

    const container = document.getElementById("fieldsContainer");
    container.innerHTML = (prompts || []).map(prompt => {
      return `<div class="field-group">
        <label class="label" for="field_${prompt.key}">${FillwordUtils.escapeHtml(prompt.label)}</label>
        <input class="field" id="field_${prompt.key}" maxlength="40" autocomplete="off"
          placeholder="${FillwordUtils.escapeHtml(prompt.placeholder || "输入内容")}">
        <div class="field-hint">${FillwordUtils.escapeHtml(prompt.exampleHint || "")}</div>
      </div>`;
    }).join("");
  }

  async function handleSubmit() {
    if (hasSubmitted) return;
    const answers = FillwordUtils.collectAnswers(currentPrompts);
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "提交中...";
    try {
      await FillwordSocket.submitAnswers(answers);
      hasSubmitted = true;
      FillwordUtils.showPage("waiting");
    } catch (err) {
      FillwordUtils.showError(err.message);
      btn.disabled = false;
      btn.textContent = "提交答案";
    }
  }

  function handleResultGenerated(result) {
    FillwordUtils.showPage("result");
    renderResult(result);
  }

  function renderResult(result) {
    const titleEl = document.getElementById("resultTitle");
    if (titleEl && result.resultTitle) titleEl.textContent = result.resultTitle;
    const scriptEl = document.getElementById("resultScript");
    if (scriptEl) scriptEl.textContent = result.script;
    const playersEl = document.getElementById("resultPlayers");
    if (playersEl && result.players) {
      playersEl.innerHTML = result.players.map(p => {
        const answers = Object.values(p.answers || {}).join("、");
        return `<div class="result-player">
          <span class="result-player-name">${FillwordUtils.escapeHtml(p.playerName)}</span>
          <span class="result-player-answers">${FillwordUtils.escapeHtml(answers)}</span>
        </div>`;
      }).join("");
    }
  }

  function resetToJoin() {
    currentTemplateId = null;
    currentPrompts = [];
    currentPlayerId = null;
    currentRoomId = null;
    hasSubmitted = false;
    document.getElementById("roomCodeInput").value = "";
    document.getElementById("playerNameInput").value = "";
    document.getElementById("submitBtn").disabled = false;
    document.getElementById("submitBtn").textContent = "提交答案";
    FillwordUtils.showPage("join");
  }

  FillwordSocket.onRoomClosed(() => {
    FillwordUtils.showError("主持人关闭了房间");
    resetToJoin();
  });

  FillwordSocket.onResultGenerated((result) => {
    handleResultGenerated(result);
  });

  document.getElementById("joinBtn").addEventListener("click", handleJoin);
  document.getElementById("roomCodeInput").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("playerNameInput").focus();
  });
  document.getElementById("playerNameInput").addEventListener("keydown", e => {
    if (e.key === "Enter") handleJoin();
  });
  document.getElementById("submitBtn").addEventListener("click", handleSubmit);
  document.getElementById("backToJoinBtn").addEventListener("click", () => {
    FillwordSocket.disconnect();
    resetToJoin();
  });
})();

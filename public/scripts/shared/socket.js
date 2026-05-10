(function attachFillwordSocket(globalScope) {
  let socket = null;
  let currentPlayerId = null;
  let currentRoomId = null;
  let currentRoomCode = null;
  const pendingListeners = new Map();

  function createSocketInstance() {
    if (typeof globalScope.io === "function") {
      return globalScope.io({
        path: "/socket.io",
        transports: ["websocket", "polling"]
      });
    }

    if (globalScope.io && typeof globalScope.io.connect === "function") {
      return globalScope.io.connect(undefined, {
        path: "/socket.io",
        transports: ["websocket", "polling"]
      });
    }

    throw new TypeError("Socket.IO client is unavailable");
  }

  function bindPendingListeners(instance) {
    pendingListeners.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        instance.on(eventName, handler);
      });
    });
  }

  function getSocket() {
    if (socket) {
      return socket;
    }

    socket = createSocketInstance();
    bindPendingListeners(socket);

    return socket;
  }

  function emitWithAck(eventName, payload) {
    return new Promise((resolve, reject) => {
      getSocket().emit(eventName, payload, response => {
        if (response && response.success) {
          resolve(response);
          return;
        }

        reject(new Error((response && (response.message || response.error)) || "UNKNOWN_ERROR"));
      });
    });
  }

  function connect() {
    return new Promise((resolve, reject) => {
      const instance = getSocket();
      if (instance.connected) {
        resolve(instance);
        return;
      }

      instance.once("connect", () => resolve(instance));
      instance.once("connect_error", reject);
    });
  }

  function updateSessionFromResponse(response) {
    currentPlayerId = response.playerId || currentPlayerId;
    currentRoomId = response.roomId || (response.roomState && response.roomState.roomId) || currentRoomId;
    currentRoomCode = response.roomCode || (response.roomState && response.roomState.roomCode) || currentRoomCode;
  }

  async function createRoom(templateId, targetPlayerCount, extra) {
    const response = await emitWithAck("create_room", {
      templateId,
      targetPlayerCount,
      ...(extra || {})
    });
    updateSessionFromResponse(response);
    return response;
  }

  async function joinRoom(roomCode, playerName, extra) {
    const response = await emitWithAck("join_room", { roomCode, playerName, ...(extra || {}) });
    updateSessionFromResponse(response);
    return response;
  }

  async function submitAnswers(answers) {
    return emitWithAck("submit_answers", {
      answers
    });
  }

  async function generateResult() {
    return emitWithAck("generate_result", {
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
  }

  async function startRoom() {
    return emitWithAck("start_room", {
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
  }

  async function submitTurtleQuestion(question) {
    return emitWithAck("submit_turtle_question", {
      question
    });
  }

  async function submitTurtleGuess(guess) {
    return emitWithAck("submit_turtle_guess", {
      guess
    });
  }

  async function abandonTurtleGame() {
    return emitWithAck("abandon_turtle_game", {
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
  }

  async function submitGhostAnswers(answers) {
    return emitWithAck("submit_ghost_answers", {
      answers
    });
  }

  async function continueGhostChapter() {
    return emitWithAck("continue_ghost_chapter", {
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
  }

  async function submitModeAction(payload) {
    return emitWithAck("submit_mode_action", {
      playerId: currentPlayerId,
      payload
    });
  }

  async function advancePhase() {
    return emitWithAck("advance_phase", {
      roomId: currentRoomId
    });
  }

  async function leaveRoom() {
    return emitWithAck("leave_room", {
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
  }

  async function closeRoom() {
    return emitWithAck("close_room", {
      roomId: currentRoomId,
      playerId: currentPlayerId
    });
  }

  function on(eventName, handler) {
    if (!pendingListeners.has(eventName)) {
      pendingListeners.set(eventName, []);
    }
    pendingListeners.get(eventName).push(handler);
    if (socket) {
      socket.on(eventName, handler);
    }
  }

  function onRoomState(handler) {
    on("room_state", handler);
  }

  function onResultGenerated(handler) {
    on("result_generated", handler);
  }

  function onRoomClosed(handler) {
    on("room_closed", handler);
  }

  function resetSession() {
    currentPlayerId = null;
    currentRoomId = null;
    currentRoomCode = null;
  }

  function disconnect() {
    if (socket && typeof socket.disconnect === "function") {
      socket.disconnect();
    }
    socket = null;
    resetSession();
  }

  globalScope.FillwordSocket = {
    abandonTurtleGame,
    closeRoom,
    connect,
    createRoom,
    disconnect,
    generateResult,
    joinRoom,
    leaveRoom,
    on,
    onRoomClosed,
    onResultGenerated,
    onRoomState,
    resetSession,
    startRoom,
    submitGhostAnswers,
    continueGhostChapter,
    submitModeAction,
    submitAnswers,
    submitTurtleGuess,
    submitTurtleQuestion,
    get currentPlayerId() {
      return currentPlayerId;
    },
    get currentRoomId() {
      return currentRoomId;
    },
    get currentRoomCode() {
      return currentRoomCode;
    }
  };
})(window);

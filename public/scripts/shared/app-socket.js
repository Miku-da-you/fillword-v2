(function attachAppSocket(globalScope) {
  const baseSocket = globalScope.FillwordSocket;
  const identity = globalScope.FillwordIdentity;

  function requireDeps() {
    if (!baseSocket) throw new Error("FillwordSocket is unavailable");
    if (!identity) throw new Error("FillwordIdentity is unavailable");
  }

  async function createRoom(payload) {
    requireDeps();
    const mode = payload.mode || "fillword";
    return baseSocket.createRoom(payload.templateId, payload.targetPlayerCount, {
      clientId: identity.getClientId(),
      mode,
      caseId: payload.caseId,
      packId: payload.packId,
    });
  }

  async function joinRoom(payload) {
    requireDeps();
    return baseSocket.joinRoom(payload.roomCode, payload.playerName, {
      clientId: identity.getClientId(),
    });
  }

  globalScope.FillwordAppSocket = {
    connect: () => baseSocket.connect(),
    createRoom,
    disconnect: () => baseSocket.disconnect(),
    joinRoom,
    startRoom: () => baseSocket.startRoom(),
    submitAnswers: answers => baseSocket.submitAnswers(answers),
    submitGhostAnswers: answers => baseSocket.submitGhostAnswers(answers),
    continueGhostChapter: () => baseSocket.continueGhostChapter(),
    submitTurtleGuess: guess => baseSocket.submitTurtleGuess(guess),
    submitTurtleQuestion: question => baseSocket.submitTurtleQuestion(question),
    abandonTurtleGame: () => baseSocket.abandonTurtleGame(),
    generateResult: () => baseSocket.generateResult(),
    closeRoom: () => baseSocket.closeRoom(),
    leaveRoom: () => baseSocket.leaveRoom(),
    onRoomClosed: handler => baseSocket.onRoomClosed(handler),
    onRoomState: handler => baseSocket.onRoomState(handler),
    onResultGenerated: handler => baseSocket.onResultGenerated(handler),
  };
})(window);

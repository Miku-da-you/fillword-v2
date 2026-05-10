window.FillwordSocket = (() => {
  let socket = null;
  let currentPlayerId = null;
  let currentRoomId = null;

  function connect() {
    return new Promise((resolve, reject) => {
      if (socket && socket.connected) { resolve(socket); return; }
      socket = window.io("/", { transports: ["websocket", "polling"] });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", reject);
    });
  }

  function emit(event, data, callback) {
    if (!socket) return;
    socket.emit(event, data, callback || (() => {}));
  }

  async function createRoom(templateId, targetPlayerCount) {
    await connect();
    return new Promise((resolve, reject) => {
      emit("create_room", { templateId, targetPlayerCount }, (res) => {
        if (res.success) {
          currentPlayerId = res.playerId;
          currentRoomId = res.roomId;
          resolve(res);
        } else {
          reject(new Error(res.message || "创建房间失败"));
        }
      });
    });
  }

  async function joinRoom(roomCode, playerName) {
    await connect();
    return new Promise((resolve, reject) => {
      emit("join_room", { roomCode, playerName }, (res) => {
        if (res.success) {
          currentPlayerId = res.playerId;
          currentRoomId = res.roomState.roomId;
          resolve(res);
        } else {
          reject(new Error(res.message || "加入房间失败"));
        }
      });
    });
  }

  async function submitAnswers(answers) {
    await connect();
    return new Promise((resolve, reject) => {
      emit("submit_answers", { answers }, (res) => {
        if (res.success) resolve(res);
        else reject(new Error(res.message || "提交失败"));
      });
    });
  }

  async function generateResult() {
    await connect();
    return new Promise((resolve, reject) => {
      emit("generate_result", { roomId: currentRoomId }, (res) => {
        if (res.success) resolve(res);
        else reject(new Error(res.message || "生成结果失败"));
      });
    });
  }

  async function closeRoom() {
    await connect();
    return new Promise((resolve, reject) => {
      emit("close_room", { roomId: currentRoomId }, (res) => {
        if (res.success) resolve(res);
        else reject(new Error(res.message || "关闭房间失败"));
      });
    });
  }

  function onRoomState(cb) {
    if (socket) socket.on("room_state", cb);
  }

  function onResultGenerated(cb) {
    if (socket) socket.on("result_generated", cb);
  }

  function onRoomClosed(cb) {
    if (socket) socket.on("room_closed", cb);
  }

  function disconnect() {
    if (socket) socket.disconnect();
    socket = null;
    currentPlayerId = null;
    currentRoomId = null;
  }

  return {
    connect, createRoom, joinRoom, submitAnswers, generateResult,
    closeRoom, onRoomState, onResultGenerated, onRoomClosed, disconnect,
  };
})();

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workspaceRoot = path.join(__dirname, "..", "..");
const socketScriptPath = path.join(workspaceRoot, "public", "scripts", "shared", "socket.js");
const socketScript = fs.readFileSync(socketScriptPath, "utf8");

function createHarness(ioValue, ackResponse) {
  const handlers = {};
  const emitted = [];
  const fakeSocket = {
    connected: false,
    on(event, handler) {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    },
    once(event, handler) {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
      if (event === "connect") {
        setTimeout(() => {
          this.connected = true;
          handler();
        }, 0);
      }
    },
    emit(event, payload, callback) {
      emitted.push({ event, payload });
      if (callback) {
        callback(ackResponse || {
          success: true,
          roomId: "ROOM1",
          roomCode: "ABCD",
          playerId: "PLAYER1",
          roomState: { roomId: "ROOM1", roomCode: "ABCD" }
        });
      }
    },
    disconnect() {
      this.connected = false;
      this.disconnected = true;
    }
  };
  const resolvedIoValue = ioValue || (() => fakeSocket);

  const sandbox = {
    window: {
      io: resolvedIoValue
    },
    console,
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(socketScript, sandbox, { filename: socketScriptPath });

  return {
    wrapper: sandbox.window.FillwordSocket,
    fakeSocket,
    handlers,
    emitted
  };
}

test("socket wrapper accepts Socket.IO namespace objects instead of only bare functions", async () => {
  const fakeSocket = {
    connected: false,
    on() {},
    once(event, handler) {
      if (event === "connect") {
        handler();
      }
    },
    emit(_event, _payload, callback) {
      callback({ success: true, roomId: "ROOM1", roomCode: "ABCD", playerId: "PLAYER1", roomState: { roomId: "ROOM1", roomCode: "ABCD" } });
    },
    disconnect() {}
  };

  const ioNamespace = {
    connect() {
      return fakeSocket;
    }
  };

  const sandbox = {
    window: { io: ioNamespace },
    console,
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(socketScript, sandbox, { filename: socketScriptPath });

  await assert.doesNotReject(() => sandbox.window.FillwordSocket.createRoom("social-death-intro", 3));
});

test("socket wrapper emits create_room with templateId and targetPlayerCount", async () => {
  const harness = createHarness();
  await harness.wrapper.createRoom("social-death-intro", 3);

  assert.deepEqual(JSON.parse(JSON.stringify(harness.emitted[0])), {
    event: "create_room",
    payload: {
      templateId: "social-death-intro",
      targetPlayerCount: 3
    }
  });
});

test("socket wrapper emits join_room with roomCode and playerName", async () => {
  const harness = createHarness(undefined, {
    success: true,
    playerId: "PLAYER2",
    roomState: { roomId: "ROOM1", roomCode: "WXYZ" }
  });

  await harness.wrapper.joinRoom("wxyz", "Alice");

  assert.deepEqual(JSON.parse(JSON.stringify(harness.emitted[0])), {
    event: "join_room",
    payload: {
      roomCode: "wxyz",
      playerName: "Alice"
    }
  });
});

test("socket wrapper preserves event listeners registered before connect", async () => {
  const harness = createHarness();
  let roomStateCount = 0;
  let resultCount = 0;
  let roomClosedCount = 0;

  harness.wrapper.onRoomState(() => {
    roomStateCount += 1;
  });
  harness.wrapper.onResultGenerated(() => {
    resultCount += 1;
  });
  harness.wrapper.onRoomClosed(() => {
    roomClosedCount += 1;
  });

  await harness.wrapper.connect();

  harness.handlers.room_state[0]({ roomId: "ROOM1" });
  harness.handlers.result_generated[0]({ resultTitle: "ok" });
  harness.handlers.room_closed[0]({ roomId: "ROOM1" });

  assert.equal(roomStateCount, 1);
  assert.equal(resultCount, 1);
  assert.equal(roomClosedCount, 1);
});

test("socket wrapper disconnect clears cached session state", async () => {
  const harness = createHarness();

  await harness.wrapper.createRoom("social-death-intro", 3);
  assert.equal(harness.wrapper.currentPlayerId, "PLAYER1");
  assert.equal(harness.wrapper.currentRoomId, "ROOM1");

  harness.wrapper.disconnect();

  assert.equal(harness.wrapper.currentPlayerId, null);
  assert.equal(harness.wrapper.currentRoomId, null);
  assert.equal(harness.fakeSocket.disconnected, true);
});

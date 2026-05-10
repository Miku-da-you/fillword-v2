const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const { io: createClient } = require("socket.io-client");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
    } catch (_error) {
    }
    await wait(150);
  }
  throw new Error("Server did not become healthy in time");
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  child.kill();

  const exited = await Promise.race([
    new Promise(resolve => child.once("exit", () => resolve(true))),
    wait(1500).then(() => false),
  ]);

  if (!exited && process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    await new Promise(resolve => killer.once("exit", resolve));
    await wait(200);
  }
}

async function closeClient(client) {
  if (!client) return;
  client.close();
  await wait(100);
}

function emitAck(client, event, payload) {
  return new Promise((resolve, reject) => {
    client.emit(event, payload, response => {
      if (response && response.success) {
        resolve(response);
        return;
      }
      reject(new Error((response && (response.error || response.message)) || `${event} failed`));
    });
  });
}

function buildAnswers(prompts) {
  return Object.fromEntries((prompts || []).map(prompt => [prompt.key, `test-${prompt.key}`]));
}

async function withServer(port, run) {
  const serverProcess = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });

  try {
    await waitForServer(port);
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await stopProcess(serverProcess);
  }
}

test("socket flow supports create, join, submit, and result broadcast for fillword 1.0", { timeout: 15000 }, async () => {
  await withServer(3107, async (baseUrl) => {
    const host = createClient(baseUrl, { transports: ["websocket"] });
    const playerA = createClient(baseUrl, { transports: ["websocket"] });
    const playerB = createClient(baseUrl, { transports: ["websocket"] });

    try {
      await Promise.all([once(host, "connect"), once(playerA, "connect"), once(playerB, "connect")]);

      const created = await emitAck(host, "create_room", { templateId: "social-death-intro", targetPlayerCount: 2 });
      const joinedA = await emitAck(playerA, "join_room", { roomCode: created.roomCode, playerName: "Alice" });
      const joinedB = await emitAck(playerB, "join_room", { roomCode: created.roomCode, playerName: "Bob" });

      await emitAck(playerA, "submit_answers", { answers: buildAnswers(joinedA.assignedPrompts) });
      await emitAck(playerB, "submit_answers", { answers: buildAnswers(joinedB.assignedPrompts) });

      const resultPromise = once(playerA, "result_generated");
      await emitAck(host, "generate_result", { roomId: created.roomId });
      const [result] = await Promise.race([
        resultPromise,
        wait(5000).then(() => Promise.reject(new Error("Timed out waiting for result broadcast")))
      ]);

      assert.equal(typeof result.resultTitle, "string");
      assert.equal(Array.isArray(result.players), true);
      assert.equal(result.players.length, 2);
    } finally {
      await closeClient(host);
      await closeClient(playerA);
      await closeClient(playerB);
    }
  });
});

test("socket flow tags the creator as host by clientId and preserves the role on rejoin", { timeout: 15000 }, async () => {
  await withServer(3110, async (baseUrl) => {
    const host = createClient(baseUrl, { transports: ["websocket"] });
    const player = createClient(baseUrl, { transports: ["websocket"] });
    let hostReconnect;

    try {
      await Promise.all([once(host, "connect"), once(player, "connect")]);

      const created = await emitAck(host, "create_room", {
        templateId: "social-death-intro",
        targetPlayerCount: 2,
        clientId: "host-client-id",
        mode: "fillword"
      });

      assert.equal(created.roomState.viewerRole, "host");
      assert.equal(created.roomState.mode, "fillword");

      const joined = await emitAck(player, "join_room", {
        roomCode: created.roomCode,
        playerName: "Alice",
        clientId: "player-client-id"
      });

      assert.equal(joined.roomState.viewerRole, "player");
      assert.equal(joined.roomState.mode, "fillword");

      await closeClient(host);
      hostReconnect = createClient(baseUrl, { transports: ["websocket"] });
      await once(hostReconnect, "connect");

      const rejoined = await emitAck(hostReconnect, "join_room", {
        roomCode: created.roomCode,
        playerName: "Ignored",
        clientId: "host-client-id"
      });

      assert.equal(rejoined.roomState.viewerRole, "host");
    } finally {
      await closeClient(host);
      await closeClient(player);
      await closeClient(hostReconnect);
    }
  });
});

test("socket flow keeps the room open when a player leaves voluntarily", { timeout: 15000 }, async () => {
  await withServer(3108, async (baseUrl) => {
    const host = createClient(baseUrl, { transports: ["websocket"] });
    const playerA = createClient(baseUrl, { transports: ["websocket"] });

    try {
      await Promise.all([once(host, "connect"), once(playerA, "connect")]);

      const created = await emitAck(host, "create_room", { templateId: "social-death-intro", targetPlayerCount: 2 });
      const joinedA = await emitAck(playerA, "join_room", { roomCode: created.roomCode, playerName: "Alice" });
      const updatedStatePromise = once(host, "room_state");

      await emitAck(playerA, "leave_room", { roomId: joinedA.roomState.roomId });
      const [updatedState] = await Promise.race([
        updatedStatePromise,
        wait(5000).then(() => Promise.reject(new Error("Timed out waiting for updated room_state")))
      ]);

      assert.equal(updatedState.joined, 1);
      assert.equal(updatedState.players.some(player => player.playerName === "Alice"), false);
    } finally {
      await closeClient(host);
      await closeClient(playerA);
    }
  });
});

test("socket flow keeps room open when a submitted player disconnects", { timeout: 15000 }, async () => {
  await withServer(3109, async (baseUrl) => {
    const host = createClient(baseUrl, { transports: ["websocket"] });
    const playerA = createClient(baseUrl, { transports: ["websocket"] });
    const playerB = createClient(baseUrl, { transports: ["websocket"] });

    try {
      await Promise.all([once(host, "connect"), once(playerA, "connect"), once(playerB, "connect")]);

      const created = await emitAck(host, "create_room", { templateId: "social-death-intro", targetPlayerCount: 2 });
      const joinedA = await emitAck(playerA, "join_room", { roomCode: created.roomCode, playerName: "Alice" });
      const joinedB = await emitAck(playerB, "join_room", { roomCode: created.roomCode, playerName: "Bob" });

      await emitAck(playerA, "submit_answers", { answers: buildAnswers(joinedA.assignedPrompts) });
      const updatedStatePromise = once(host, "room_state");
      await closeClient(playerA);

      const [updatedState] = await Promise.race([
        updatedStatePromise,
        wait(5000).then(() => Promise.reject(new Error("Timed out waiting for disconnect update")))
      ]);

      const alice = updatedState.players.find(player => player.playerName === "Alice");
      assert.ok(alice);
      assert.equal(alice.connected, false);
      assert.equal(updatedState.joined, 3);

      await emitAck(playerB, "submit_answers", { answers: buildAnswers(joinedB.assignedPrompts) });
      await emitAck(host, "generate_result", { roomId: created.roomId });
    } finally {
      await closeClient(host);
      await closeClient(playerA);
      await closeClient(playerB);
    }
  });
});

test("socket flow broadcasts room_state with each viewer's own role and player list", { timeout: 15000 }, async () => {
  await withServer(3113, async (baseUrl) => {
    const host = createClient(baseUrl, { transports: ["websocket"] });
    const player = createClient(baseUrl, { transports: ["websocket"] });

    try {
      await Promise.all([once(host, "connect"), once(player, "connect")]);

      const created = await emitAck(host, "create_room", {
        templateId: "social-death-intro",
        targetPlayerCount: 2,
        clientId: "host-client",
        mode: "fillword"
      });

      const hostStatePromise = once(host, "room_state");
      const joined = await emitAck(player, "join_room", {
        roomCode: created.roomCode,
        playerName: "Alice",
        clientId: "player-client"
      });

      const [hostState] = await Promise.race([
        hostStatePromise,
        wait(5000).then(() => Promise.reject(new Error("Timed out waiting for host room_state")))
      ]);

      assert.equal(joined.roomState.viewerRole, "player");
      assert.equal(hostState.viewerRole, "host");
      assert.equal(Array.isArray(joined.roomState.players), true);
      assert.equal(joined.roomState.players.length, 2);
      assert.equal(joined.roomState.players.some(playerInfo => playerInfo.playerName === "Alice"), true);
    } finally {
      await closeClient(host);
      await closeClient(player);
    }
  });
});

test("socket flow keeps player room_state in player perspective after other room updates", { timeout: 15000 }, async () => {
  await withServer(3114, async (baseUrl) => {
    const host = createClient(baseUrl, { transports: ["websocket"] });
    const playerA = createClient(baseUrl, { transports: ["websocket"] });
    const playerB = createClient(baseUrl, { transports: ["websocket"] });

    try {
      await Promise.all([once(host, "connect"), once(playerA, "connect"), once(playerB, "connect")]);

      const created = await emitAck(host, "create_room", {
        templateId: "social-death-intro",
        targetPlayerCount: 2,
        clientId: "host-client",
        mode: "fillword"
      });

      await emitAck(playerA, "join_room", {
        roomCode: created.roomCode,
        playerName: "Alice",
        clientId: "player-a"
      });

      const playerStatePromise = once(playerA, "room_state");
      await emitAck(playerB, "join_room", {
        roomCode: created.roomCode,
        playerName: "Bob",
        clientId: "player-b"
      });

      const [playerState] = await Promise.race([
        playerStatePromise,
        wait(5000).then(() => Promise.reject(new Error("Timed out waiting for player room_state")))
      ]);

      assert.equal(playerState.viewerRole, "player");
      assert.equal(playerState.players.some(playerInfo => playerInfo.playerName === "Bob"), true);
    } finally {
      await closeClient(host);
      await closeClient(playerA);
      await closeClient(playerB);
    }
  });
});

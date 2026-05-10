const test = require("node:test");
const assert = require("node:assert/strict");

const { RoomManager } = require("../room-manager");
const TEMPLATES = require("../templates");

function createManager() {
  return new RoomManager({ templates: TEMPLATES });
}

function buildAnswers(prompts, overrides = {}) {
  return Object.fromEntries(
    prompts.map(prompt => [prompt.key, overrides[prompt.key] || (`test-${prompt.key}`)])
  );
}

function joinPlayers(manager, roomId, count) {
  return Array.from({ length: count }, (_unused, index) => {
    const name = ["Alice", "Bob", "Cara", "Dylan", "Eve", "Finn"][index] || `玩家${index + 1}`;
    return manager.joinRoom(roomId, name, `socket-${index}`, `client-${index}`);
  });
}

test("fillword host creates the room but never receives fill prompts", () => {
  const manager = createManager();
  const created = manager.createRoom("social-death-intro", 3, "host-socket", "host-client");

  assert.equal(created.roomState.viewerRole, "host");
  assert.equal(created.roomState.isHost, true);
  assert.equal(created.roomState.playerId, created.playerId);
  assert.deepEqual(created.roomState.assignedFieldKeys, []);
  assert.deepEqual(created.roomState.assignedPrompts, []);
  assert.equal(created.roomState.targetPlayerCount, 3);
  assert.equal(created.roomState.targetTotalCount, 4);
  assert.equal(created.roomState.joinedPlayerCount, 0);
  assert.equal(created.roomState.joinedTotalCount, 1);
  assert.equal(created.roomState.joined, 1);

  const hostRecord = manager.rooms.get(created.roomId).players.find(player => player.playerId === created.playerId);
  assert.equal(hostRecord.playerName, "主持人");
  assert.deepEqual(hostRecord.assignedFieldKeys, []);
  assert.equal(hostRecord.submitted, false);
});

test("fillword players get non-empty, separate prompt assignments and stay in player perspective", () => {
  const manager = createManager();
  const created = manager.createRoom("social-death-intro", 3, "host-socket", "host-client");
  const [joinedA, joinedB, joinedC] = joinPlayers(manager, created.roomId, 3);

  for (const joined of [joinedA, joinedB, joinedC]) {
    assert.equal(joined.roomState.viewerRole, "player");
    assert.equal(joined.roomState.isHost, false);
    assert.ok(joined.roomState.assignedPrompts.length > 0);
    assert.equal(joined.roomState.viewerPlayerName.length > 0, true);
    assert.equal(joined.roomState.viewerSubmitted, false);
    assert.deepEqual(
      joined.roomState.assignedPrompts.map(prompt => prompt.key),
      joined.roomState.assignedFieldKeys
    );
    const selfRow = joined.roomState.players.find(player => player.playerId === joined.playerId);
    assert.equal(selfRow.isViewer, true);
    assert.equal(selfRow.isHost, false);
  }

  assert.notDeepEqual(joinedA.roomState.assignedFieldKeys, joinedB.roomState.assignedFieldKeys);
  assert.notDeepEqual(joinedB.roomState.assignedFieldKeys, joinedC.roomState.assignedFieldKeys);

  const hostState = manager.buildRoomState(manager.rooms.get(created.roomId), created.playerId, "host-client");
  assert.equal(hostState.joinedPlayerCount, 3);
  assert.equal(hostState.joinedTotalCount, 4);
  assert.equal(hostState.submittedPlayerCount, 0);
  assert.equal(hostState.waitingPlayerCount, 3);
  assert.equal(hostState.canGenerate, false);
  const hostPlayer = hostState.players.find(player => player.playerId === created.playerId);
  assert.equal(hostPlayer.isHost, true);
  const visibleAssignments = hostState.players
    .filter(player => !player.isHost)
    .map(player => player.assignedFieldKeys.length);
  assert.ok(visibleAssignments.every(count => count > 0));
});

test("fillword rejects incomplete answers and only lets host generate after all players submit", () => {
  const manager = createManager();
  const created = manager.createRoom("social-death-intro", 2, "host-socket", "host-client");
  const [joinedA, joinedB] = joinPlayers(manager, created.roomId, 2);

  assert.throws(() => manager.submitAnswers(joinedA.playerId, {}), /答案不完整/);

  const firstSubmitted = manager.submitAnswers(joinedA.playerId, buildAnswers(joinedA.roomState.assignedPrompts));
  assert.equal(firstSubmitted.status, "waiting");
  let hostState = manager.buildRoomState(manager.rooms.get(created.roomId), created.playerId, "host-client");
  assert.equal(hostState.canGenerate, false);
  assert.throws(() => manager.generateResult(created.roomId, created.playerId), /还有玩家未完成提交/);

  const secondSubmitted = manager.submitAnswers(joinedB.playerId, buildAnswers(joinedB.roomState.assignedPrompts));
  assert.equal(secondSubmitted.status, "all_submitted");
  hostState = manager.buildRoomState(manager.rooms.get(created.roomId), created.playerId, "host-client");
  assert.equal(hostState.canGenerate, true);

  const generated = manager.generateResult(created.roomId, created.playerId);
  assert.equal(generated.status, "result_ready");
  assert.equal(generated.result.players.length, 2);
  assert.equal(typeof generated.result.script, "string");
  assert.ok(generated.result.script.length > 0);
});

test("fillword final script is composed from submitted player values only", () => {
  const manager = createManager();
  const created = manager.createRoom("social-death-intro", 2, "host-socket", "host-client");
  const [joinedA, joinedB] = joinPlayers(manager, created.roomId, 2);
  const keyA = joinedA.roomState.assignedPrompts[0].key;
  const keyB = joinedB.roomState.assignedPrompts[0].key;

  manager.submitAnswers(joinedA.playerId, buildAnswers(joinedA.roomState.assignedPrompts, { [keyA]: "alpha-value" }));
  manager.submitAnswers(joinedB.playerId, buildAnswers(joinedB.roomState.assignedPrompts, { [keyB]: "beta-value" }));

  const generated = manager.generateResult(created.roomId, created.playerId);
  assert.match(generated.result.script, /alpha-value|beta-value/);
  assert.equal(generated.result.players.some(player => player.playerName === "主持人"), false);
});

test("fillword host disconnect keeps room alive and same client id restores host role", () => {
  const manager = createManager();
  const created = manager.createRoom("social-death-intro", 2, "host-socket", "host-client");
  joinPlayers(manager, created.roomId, 1);

  const disconnected = manager.handleDisconnect("host-socket");
  const room = manager.rooms.get(created.roomId);
  const hostRecord = room.players.find(player => player.playerId === created.playerId);

  assert.equal(disconnected.type, "updated");
  assert.equal(manager.rooms.has(created.roomId), true);
  assert.equal(hostRecord.connected, false);

  const rejoined = manager.joinRoom(created.roomId, "Ignored Name", "host-socket-2", "host-client");
  assert.equal(rejoined.playerId, created.playerId);
  assert.equal(rejoined.roomState.viewerRole, "host");
  assert.equal(rejoined.roomState.isHost, true);
  assert.equal(rejoined.roomState.assignedPrompts.length, 0);
});

test("fillword player leave and disconnect update counts without closing the room", () => {
  const manager = createManager();
  const created = manager.createRoom("social-death-intro", 2, "host-socket", "host-client");
  const [joinedA, joinedB] = joinPlayers(manager, created.roomId, 2);
  const preservedKey = joinedA.roomState.assignedPrompts[0].key;

  manager.submitAnswers(joinedA.playerId, buildAnswers(joinedA.roomState.assignedPrompts, {
    [preservedKey]: "preserved-value",
  }));
  const disconnected = manager.handleDisconnect("socket-0");
  const roomAfterDisconnect = manager.rooms.get(created.roomId);
  const preservedPlayer = roomAfterDisconnect.players.find(player => player.playerId === joinedA.playerId);

  assert.equal(disconnected.type, "updated");
  assert.equal(preservedPlayer.connected, false);
  assert.equal(preservedPlayer.answers[preservedKey], "preserved-value");
  assert.equal(disconnected.roomState.joinedPlayerCount, 2);
  assert.equal(disconnected.roomState.joinedTotalCount, 3);

  const left = manager.leaveRoom(created.roomId, joinedB.playerId);
  assert.equal(left.type, "updated");
  assert.equal(left.roomState.joinedPlayerCount, 1);
  assert.equal(left.roomState.joinedTotalCount, 2);
  assert.equal(manager.rooms.get(created.roomId).players.some(player => player.playerId === joinedB.playerId), false);
});

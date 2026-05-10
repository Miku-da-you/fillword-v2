"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { RoomManager } = require("./room-manager");
const { getConfig } = require("./config");
const { RoomCodeRegistry } = require("./room-code-registry");
const MODE_MANIFEST = require("./mode-manifest");
const { createSparkLiteClient } = require("./integrations/spark-lite-client");
const { createAiAdjudicator } = require("./turtle-soup/ai-adjudicator");
const { TurtleSoupManager } = require("./turtle-soup/manager");
const { createGhostNarrator } = require("./ghost-story/ai-narrator");
const { GhostStoryManager } = require("./ghost-story/manager");
const { buildTurtleCaseSummaries, buildGhostPackSummaries } = require("./mode-content");
const { createError } = require("./utils");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const TEMPLATES = require("./templates");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

const config = getConfig();
const sparkClient = config.sparkApiPassword
  ? createSparkLiteClient({
    apiPassword: config.sparkApiPassword,
    model: config.sparkModel,
    baseUrl: config.sparkApiBaseUrl,
    timeoutMs: config.sparkTimeoutMs,
  })
  : null;
const roomManager = new RoomManager({ templates: TEMPLATES });
const turtleManager = new TurtleSoupManager({
  adjudicator: createAiAdjudicator({ sparkClient })
});
const ghostManager = new GhostStoryManager({
  narrator: createGhostNarrator({ sparkClient })
});
const roomCodeRegistry = new RoomCodeRegistry();

app.use("/fillword", express.static(PUBLIC_DIR, {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
      return;
    }
    if (/\.(css|js)$/.test(filePath)) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    }
  },
}));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/fillword", (_req, res) => {
  res.redirect("/fillword/app.html");
});

app.get("/fillword/content-manifest", (_req, res) => {
  res.json({
    turtleCases: buildTurtleCaseSummaries(),
    ghostPacks: buildGhostPackSummaries(),
  });
});

function emitWithAck(event, data, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket timeout")), timeout);
    this.emit(event, data, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

function getManagerByMode(mode) {
  if (mode === MODE_MANIFEST.turtle.id) return turtleManager;
  if (mode === MODE_MANIFEST.ghost.id) return ghostManager;
  return roomManager;
}

function findRoomEntryByCode(roomCode) {
  const registered = roomCodeRegistry.get(roomCode);
  if (registered) return registered;

  const fillwordRoom = roomManager.getRoomByCode(roomCode);
  if (fillwordRoom) {
    return { mode: MODE_MANIFEST.fillword.id, roomId: fillwordRoom.roomId };
  }
  const turtleRoom = turtleManager.getRoomByCode(roomCode);
  if (turtleRoom) {
    return { mode: MODE_MANIFEST.turtle.id, roomId: turtleRoom.roomId };
  }
  const ghostRoom = ghostManager.getRoomByCode(roomCode);
  if (ghostRoom) {
    return { mode: MODE_MANIFEST.ghost.id, roomId: ghostRoom.roomId };
  }
  return null;
}

async function emitRoomStateForRoom(manager, roomId) {
  const room = manager.rooms.get(roomId);
  if (!room) return;

  const sockets = await io.in(roomId).fetchSockets();
  for (const roomSocket of sockets) {
    roomSocket.emit(
      "room_state",
      manager.buildRoomState(room, roomSocket.data.playerId, roomSocket.data.clientId)
    );
  }
}

io.on("connection", (socket) => {
  socket.emitWithAck = emitWithAck.bind(socket);

  socket.on("create_room", ({ templateId, templateIndex, targetPlayerCount, clientId, mode, caseId, packId }, callback) => {
    try {
      const resolvedMode = mode || MODE_MANIFEST.fillword.id;
      const resolvedTemplateId = templateId || (TEMPLATES[templateIndex] && TEMPLATES[templateIndex].id);
      const resolvedPlayerCount = Number(targetPlayerCount || 2);
      let created;
      if (resolvedMode === MODE_MANIFEST.turtle.id) {
        created = turtleManager.createRoom(caseId || "late-night-elevator", resolvedPlayerCount, socket.id, clientId);
      } else if (resolvedMode === MODE_MANIFEST.ghost.id) {
        created = ghostManager.createRoom(packId || "dormitory-rule-13", resolvedPlayerCount, socket.id, clientId);
      } else {
        created = roomManager.createRoom(resolvedTemplateId, resolvedPlayerCount, socket.id, clientId);
      }
      roomCodeRegistry.register(created.roomCode, { mode: resolvedMode, roomId: created.roomId });
      socket.data.roomId = created.roomId;
      socket.data.playerId = created.playerId;
      socket.data.mode = resolvedMode;
      socket.data.clientId = clientId;
      socket.join(created.roomId);
      const manager = getManagerByMode(resolvedMode);
      const room = manager.rooms.get(created.roomId);
      const roomState = manager.buildRoomState(room, created.playerId, clientId);
      const fn = callback || (() => {});
      fn({ success: true, ...created, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "CREATE_ROOM_ERROR", message: err.message });
    }
  });

  socket.on("join_room", async ({ roomCode, playerName, clientId }, callback) => {
    try {
      const normalizedRoomCode = String(roomCode || "").toUpperCase().trim();
      const entry = findRoomEntryByCode(normalizedRoomCode);
      if (!entry) {
        const fn = callback || (() => {});
        fn({ success: false, error: "ROOM_NOT_FOUND", message: "房间不存在" });
        return;
      }
      const manager = getManagerByMode(entry.mode);
      const joined = manager.joinRoom(entry.roomId, playerName, socket.id, clientId);
      socket.data.roomId = joined.roomState.roomId;
      socket.data.playerId = joined.playerId;
      socket.data.mode = entry.mode;
      socket.data.clientId = clientId;
      socket.join(joined.roomState.roomId);
      await emitRoomStateForRoom(manager, joined.roomState.roomId);
      const fn = callback || (() => {});
      fn({
        success: true,
        playerId: joined.playerId,
        assignedFieldKeys: joined.roomState.assignedFieldKeys,
        assignedPrompts: joined.roomState.assignedPrompts,
        roomState: joined.roomState,
        templateId: joined.roomState.templateId,
        mode: joined.roomState.mode,
      });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "JOIN_ROOM_ERROR", message: err.message });
    }
  });

  socket.on("submit_answers", async ({ answers }, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const manager = getManagerByMode(socket.data.mode);
      const roomState = manager.submitAnswers(playerId, answers || {});
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "SUBMIT_ERROR", message: err.message });
    }
  });

  socket.on("generate_result", async (payload, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const roomState = roomManager.generateResult(payload?.roomId || socket.data.roomId, playerId);
      await emitRoomStateForRoom(roomManager, roomState.roomId);
      io.to(roomState.roomId).emit("result_generated", roomState.result);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "GENERATE_ERROR", message: err.message });
    }
  });

  socket.on("start_room", async (_payload, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const manager = getManagerByMode(socket.data.mode);
      const roomState = await manager.startRoom(socket.data.roomId, playerId);
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "START_ROOM_ERROR", message: err.message });
    }
  });

  socket.on("submit_turtle_question", async ({ question }, callback) => {
    try {
      const manager = turtleManager;
      const roomState = await manager.submitQuestion(socket.data.playerId, question);
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "TURTLE_QUESTION_ERROR", message: err.message });
    }
  });

  socket.on("submit_turtle_guess", async ({ guess }, callback) => {
    try {
      const manager = turtleManager;
      const roomState = await manager.submitGuess(socket.data.playerId, guess);
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "TURTLE_GUESS_ERROR", message: err.message });
    }
  });

  socket.on("abandon_turtle_game", async (_payload, callback) => {
    try {
      const manager = turtleManager;
      const roomState = manager.abandonGame(socket.data.roomId, socket.data.playerId);
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "TURTLE_ABANDON_ERROR", message: err.message });
    }
  });

  socket.on("submit_ghost_answers", async ({ answers }, callback) => {
    try {
      const manager = ghostManager;
      const roomState = await manager.submitAnswers(socket.data.playerId, answers || {});
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "GHOST_ANSWER_ERROR", message: err.message });
    }
  });

  socket.on("continue_ghost_chapter", async (_payload, callback) => {
    try {
      const manager = ghostManager;
      const roomState = manager.continueChapter(socket.data.playerId);
      await emitRoomStateForRoom(manager, roomState.roomId);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "GHOST_CONTINUE_ERROR", message: err.message });
    }
  });

  socket.on("leave_room", async (payload, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const manager = getManagerByMode(socket.data.mode);
      const room = manager.rooms.get(payload?.roomId || socket.data.roomId);
      const roomCode = room && room.roomCode;
      const result = manager.leaveRoom(payload?.roomId || socket.data.roomId, playerId);
      if (result?.type === "closed") {
        if (roomCode) roomCodeRegistry.unregister(roomCode);
        io.to(result.roomId).emit("room_closed", { roomId: result.roomId });
      } else if (result?.type === "updated") {
        await emitRoomStateForRoom(manager, result.roomId);
      }
      socket.data.roomId = null;
      socket.data.playerId = null;
      const fn = callback || (() => {});
      fn({ success: true, result });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "LEAVE_ROOM_ERROR", message: err.message });
    }
  });

  socket.on("close_room", (payload, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const manager = getManagerByMode(socket.data.mode);
      const room = manager.rooms.get(payload?.roomId || socket.data.roomId);
      const roomCode = room && room.roomCode;
      const result = manager.closeRoom(payload?.roomId || socket.data.roomId, playerId);
      if (roomCode) roomCodeRegistry.unregister(roomCode);
      if (result) io.to(result.roomId).emit("room_closed", result);
      const fn = callback || (() => {});
      fn({ success: true });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "CLOSE_ERROR", message: err.message });
    }
  });

  socket.on("disconnect", async () => {
    const manager = getManagerByMode(socket.data.mode);
    const result = manager.handleDisconnect(socket.id);
    if (!result) return;
    if (result.type === "closed") {
      io.to(result.roomId).emit("room_closed", { roomId: result.roomId });
      return;
    }
    if (result.type === "updated") {
      await emitRoomStateForRoom(manager, result.roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Fillword 服务已启动: http://localhost:${PORT}/fillword`);
  console.log(`统一入口: http://localhost:${PORT}/fillword/app.html`);
});

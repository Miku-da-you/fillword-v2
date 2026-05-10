"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { RoomManager } = require("./room-manager");
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

const roomManager = new RoomManager({ templates: TEMPLATES });

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
  res.redirect("/fillword/host.html");
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

io.on("connection", (socket) => {
  socket.emitWithAck = emitWithAck.bind(socket);

  socket.on("create_room", ({ templateId, templateIndex, targetPlayerCount }, callback) => {
    try {
      const resolvedTemplateId = templateId || (TEMPLATES[templateIndex] && TEMPLATES[templateIndex].id);
      const resolvedPlayerCount = Number(targetPlayerCount || 2);
      const created = roomManager.createRoom(resolvedTemplateId, resolvedPlayerCount, socket.id);
      socket.data.roomId = created.roomId;
      socket.data.playerId = created.playerId;
      const room = roomManager.rooms.get(created.roomId);
      const roomState = roomManager.buildRoomState(room, created.playerId);
      const fn = callback || (() => {});
      fn({ success: true, ...created, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "CREATE_ROOM_ERROR", message: err.message });
    }
  });

  socket.on("join_room", ({ roomCode, playerName }, callback) => {
    try {
      const room = roomManager.getRoomByCode(String(roomCode || "").toUpperCase().trim());
      if (!room) {
        const fn = callback || (() => {});
        fn({ success: false, error: "ROOM_NOT_FOUND", message: "房间不存在" });
        return;
      }
      const joined = roomManager.joinRoom(room.roomId, playerName, socket.id);
      socket.data.roomId = joined.roomState.roomId;
      socket.data.playerId = joined.playerId;
      io.to(room.roomId).emit("room_state", joined.roomState);
      const fn = callback || (() => {});
      fn({
        success: true,
        playerId: joined.playerId,
        assignedFieldKeys: joined.roomState.assignedFieldKeys,
        assignedPrompts: joined.roomState.assignedPrompts,
        roomState: joined.roomState,
        templateId: joined.roomState.templateId,
      });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "JOIN_ROOM_ERROR", message: err.message });
    }
  });

  socket.on("submit_answers", ({ answers }, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const roomState = roomManager.submitAnswers(playerId, answers || {});
      io.to(roomState.roomId).emit("room_state", roomState);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "SUBMIT_ERROR", message: err.message });
    }
  });

  socket.on("generate_result", (payload, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const roomState = roomManager.generateResult(payload?.roomId || socket.data.roomId, playerId);
      io.to(roomState.roomId).emit("room_state", roomState);
      io.to(roomState.roomId).emit("result_generated", roomState.result);
      const fn = callback || (() => {});
      fn({ success: true, roomState });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "GENERATE_ERROR", message: err.message });
    }
  });

  socket.on("close_room", (payload, callback) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) throw createError("NOT_IN_ROOM");
      const result = roomManager.closeRoom(payload?.roomId || socket.data.roomId, playerId);
      if (result) io.to(result.roomId).emit("room_closed", result);
      const fn = callback || (() => {});
      fn({ success: true });
    } catch (err) {
      const fn = callback || (() => {});
      fn({ success: false, error: err.code || "CLOSE_ERROR", message: err.message });
    }
  });

  socket.on("disconnect", () => {
    const result = roomManager.handleDisconnect(socket.id);
    if (result) io.to(result.roomId).emit("room_closed", { roomId: result.roomId });
  });
});

server.listen(PORT, () => {
  console.log(`Fillword 服务已启动: http://localhost:${PORT}/fillword`);
  console.log(`主持人入口: http://localhost:${PORT}/fillword/host.html`);
  console.log(`玩家入口: http://localhost:${PORT}/fillword/player.html`);
});

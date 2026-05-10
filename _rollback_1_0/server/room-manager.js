"use strict";

const { randomUUID } = require("node:crypto");
const { ROOM_CODE_CHARS } = require("./utils");

function generateRoomCode(existingRooms) {
  let attempts = 0;
  while (attempts < 100) {
    const code = Array.from({ length: 4 }, () =>
      ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join("");
    if (!existingRooms.has(code)) return code;
    attempts++;
  }
  throw new Error("无法生成唯一房间码");
}

function createError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

class RoomManager {
  constructor({ templates }) {
    this.templates = templates;
    this.templatesById = new Map(templates.map(t => [t.id, t]));
    this.rooms = new Map();
    this.players = new Map();
  }

  createRoom(templateId, targetPlayerCount, hostSocketId) {
    const template = this.templatesById.get(templateId);
    if (!template) throw createError("TEMPLATE_NOT_FOUND", "模板不存在");
    if (!template.supportedPlayerCounts.includes(Number(targetPlayerCount))) {
      throw createError("UNSUPPORTED_PLAYER_COUNT");
    }

    const roomId = randomUUID();
    const roomCode = generateRoomCode(this.rooms);
    const room = {
      roomId,
      roomCode,
      hostPlayerId: null,
      templateId,
      targetPlayerCount: Number(targetPlayerCount),
      status: "waiting",
      players: [],
      result: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    const playerId = this._joinRoom(roomId, null, hostSocketId, true);
    room.hostPlayerId = playerId;
    return { roomId, roomCode, playerId };
  }

  joinRoom(roomId, playerName, socketId) {
    return this._joinRoom(roomId, playerName, socketId, false);
  }

  _joinRoom(roomId, playerName, socketId, isHost) {
    const room = this.rooms.get(roomId);
    if (!room) throw createError("ROOM_NOT_FOUND", "房间不存在");
    if (room.status !== "waiting") throw createError("ROOM_NOT_WAITING", "游戏已开始或已结束");

    if (!isHost && room.players.length >= room.targetPlayerCount) {
      throw createError("ROOM_FULL", "房间已满");
    }

    if (socketId) {
      for (const p of room.players) {
        if (p.socketId === socketId) {
          return { playerId: p.playerId, roomState: this._buildRoomState(room, p.playerId) };
        }
      }
    }

    const playerId = randomUUID();
    const template = this.templatesById.get(room.templateId);
    const variant = template.variants[room.targetPlayerCount];
    const assignmentIndex = room.players.length;
    const assignedFieldKeys = [...(variant.assignments[assignmentIndex] || [])];
    const assignedPrompts = variant.promptGroups.filter(p => assignedFieldKeys.includes(p.key));

    const player = {
      playerId,
      playerName: isHost ? "主持人" : (String(playerName || "").trim() || "匿名"),
      socketId,
      assignedFieldKeys,
      assignedPrompts,
      answers: {},
      submitted: false,
      joinedAt: Date.now(),
    };

    room.players.push(player);
    this.players.set(playerId, { playerId, roomId, ...player });

    return { playerId, roomState: this._buildRoomState(room, playerId) };
  }

  submitAnswers(playerId, answers) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND", "玩家不存在");

    const room = this.rooms.get(ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND", "房间不存在");

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) throw createError("PLAYER_NOT_IN_ROOM");
    if (player.submitted) throw createError("ALREADY_SUBMITTED", "已经提交过");

    const nextAnswers = {};
    for (const key of player.assignedFieldKeys) {
      const value = String((answers && answers[key]) || "").trim();
      if (!value) throw createError("INVALID_ANSWERS", "答案不完整");
      nextAnswers[key] = value;
    }
    player.answers = nextAnswers;
    player.submitted = true;

    const allSubmitted = room.players.every(p => p.submitted);
    if (allSubmitted) room.status = "all_submitted";

    return this._buildRoomState(room, playerId);
  }

  generateResult(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST", "只有主持人可以生成结果");

    const template = this.templatesById.get(room.templateId);
    const variant = template.variants[room.targetPlayerCount];
    const mergedAnswers = {};
    for (const player of room.players) {
      Object.assign(mergedAnswers, player.answers);
    }

    const script = variant.scriptTemplate.replace(/\{(\w+)\}/g, (_match, key) => {
      return mergedAnswers[key] || "";
    });

    room.result = {
      resultTitle: variant.resultTitle,
      script,
      players: room.players.map(p => ({
        playerName: p.playerName,
        answers: p.answers,
      })),
    };
    room.status = "result_ready";
    return this._buildRoomState(room, playerId);
  }

  closeRoom(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) return;
    const room = this.rooms.get(ctx.roomId);
    if (!room) return;
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST");
    room.status = "closed";
    this._cleanupRoom(roomId);
    return { roomId, status: "closed" };
  }

  handleDisconnect(socketId) {
    for (const [roomId, room] of this.rooms) {
      const player = room.players.find(p => p.socketId === socketId);
      if (!player) continue;
      room.status = "closed";
      this._cleanupRoom(roomId);
      return { roomId, closed: true };
    }
  }

  getRoomByCode(roomCode) {
    for (const room of this.rooms.values()) {
      if (room.roomCode === roomCode) return room;
    }
    return null;
  }

  buildRoomState(room, forPlayerId) {
    const forPlayer = room.players.find(p => p.playerId === forPlayerId);
    const isHost = room.hostPlayerId === forPlayerId;

    const canGenerate = isHost &&
      room.players.length >= room.targetPlayerCount &&
      room.players.every(p => p.submitted);

    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      hostPlayerId: room.hostPlayerId,
      playerId: forPlayerId,
      isHost,
      templateId: room.templateId,
      targetPlayerCount: room.targetPlayerCount,
      status: room.status,
      result: room.result || null,
      joined: room.players.length,
      players: room.players.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        submitted: p.submitted,
        assignedFieldKeys: isHost ? p.assignedFieldKeys : (p.playerId === forPlayerId ? p.assignedFieldKeys : []),
      })),
      assignedFieldKeys: forPlayer ? forPlayer.assignedFieldKeys : [],
      assignedPrompts: forPlayer ? forPlayer.assignedPrompts : [],
      canGenerate,
    };
  }

  _cleanupRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const player of room.players) {
      this.players.delete(player.playerId);
    }
    this.rooms.delete(roomId);
  }
}

module.exports = { RoomManager };

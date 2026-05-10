"use strict";

const { randomUUID } = require("node:crypto");
const { getViewerRole } = require("./client-role");
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

  _getPlayerRecord(room, playerId) {
    return room.players.find(player => player.playerId === playerId);
  }

  _getParticipants(room) {
    return room.players.filter(player => player.playerId !== room.hostPlayerId);
  }

  _syncRoomStatus(room) {
    if (room.result) {
      room.status = "result_ready";
      return;
    }

    const participants = this._getParticipants(room);
    room.status = participants.length >= room.targetPlayerCount && participants.every(player => player.submitted)
      ? "all_submitted"
      : "waiting";
  }

  _getDisplayCounts(room) {
    const participants = this._getParticipants(room);
    return {
      targetPlayerCount: room.targetPlayerCount,
      targetTotalCount: room.targetPlayerCount + 1,
      joinedPlayerCount: participants.length,
      joinedTotalCount: room.players.length,
      submittedPlayerCount: participants.filter(player => player.submitted).length,
      waitingPlayerCount: participants.filter(player => !player.submitted).length,
    };
  }

  _buildHostRoomState(room) {
    return this.buildRoomState(room, room.hostPlayerId);
  }

  _removePlayerFromRoom(room, playerId) {
    const nextPlayers = room.players.filter(player => player.playerId !== playerId);
    room.players = nextPlayers;
    this.players.delete(playerId);
  }

  createRoom(templateId, targetPlayerCount, hostSocketId, hostClientId) {
    const template = this.templatesById.get(templateId);
    if (!template) throw createError("TEMPLATE_NOT_FOUND", "模板不存在");
    if (!template.supportedPlayerCounts.includes(Number(targetPlayerCount))) {
      throw createError("UNSUPPORTED_PLAYER_COUNT");
    }

    const roomId = randomUUID();
    const existingCodes = new Set([...this.rooms.values()].map(room => room.roomCode));
    const roomCode = generateRoomCode(existingCodes);
    const room = {
      roomId,
      roomCode,
      hostPlayerId: null,
      hostClientId: String(hostClientId || "").trim() || randomUUID(),
      templateId,
      mode: "fillword",
      targetPlayerCount: Number(targetPlayerCount),
      status: "waiting",
      players: [],
      result: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    const joinedHost = this._joinRoom(roomId, null, hostSocketId, true, room.hostClientId);
    room.hostPlayerId = joinedHost.playerId;
    return {
      roomId,
      roomCode,
      playerId: joinedHost.playerId,
      roomState: this.buildRoomState(room, joinedHost.playerId, room.hostClientId),
    };
  }

  joinRoom(roomId, playerName, socketId, clientId) {
    return this._joinRoom(roomId, playerName, socketId, false, clientId);
  }

  _joinRoom(roomId, playerName, socketId, isHost, clientId) {
    const room = this.rooms.get(roomId);
    if (!room) throw createError("ROOM_NOT_FOUND", "房间不存在");

    const normalizedClientId = String(clientId || "").trim() || randomUUID();
    const expectedHostJoin = room.hostClientId === normalizedClientId;
    const existingByClient = room.players.find(player => player.clientId === normalizedClientId);
    if (existingByClient) {
      existingByClient.socketId = socketId;
      existingByClient.connected = true;
      if (expectedHostJoin) {
        room.hostPlayerId = existingByClient.playerId;
      }
      return {
        playerId: existingByClient.playerId,
        roomState: this.buildRoomState(room, existingByClient.playerId, normalizedClientId)
      };
    }

    if (room.status !== "waiting") throw createError("ROOM_NOT_WAITING", "游戏已开始或已结束");

    if (!isHost && !expectedHostJoin && this._getParticipants(room).length >= room.targetPlayerCount) {
      throw createError("ROOM_FULL", "房间已满");
    }

    if (socketId) {
      for (const p of room.players) {
        if (p.socketId === socketId) {
          return { playerId: p.playerId, roomState: this.buildRoomState(room, p.playerId, normalizedClientId) };
        }
      }
    }

    const playerId = randomUUID();
    const template = this.templatesById.get(room.templateId);
    const variant = template && template.variants && template.variants[room.targetPlayerCount];
    if (!variant) throw createError("VARIANT_NOT_FOUND", "当前人数没有可用剧本配置");
    const assignments = variant[room.targetPlayerCount] && variant[room.targetPlayerCount].assignments;
    const assignmentIndex = this._getParticipants(room).length;
    if (!isHost && (!assignments || !Array.isArray(assignments[assignmentIndex]))) {
      throw createError("ASSIGNMENT_NOT_FOUND", "当前玩家没有可用填空分配");
    }
    const assignedFieldKeys = isHost ? [] : [...assignments[assignmentIndex]];
    const assignedPrompts = isHost ? [] : variant.promptGroups.filter(p => assignedFieldKeys.includes(p.key));

    const player = {
      playerId,
      playerName: isHost ? "主持人" : (String(playerName || "").trim() || "匿名"),
      clientId: normalizedClientId,
      socketId,
      assignedFieldKeys,
      assignedPrompts,
      answers: {},
      submitted: false,
      connected: true,
      joinedAt: Date.now(),
    };

    room.players.push(player);
    this.players.set(playerId, { playerId, roomId, clientId: normalizedClientId });

    return { playerId, roomState: this.buildRoomState(room, playerId, normalizedClientId) };
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
    player.connected = true;

    this._syncRoomStatus(room);

    return this.buildRoomState(room, playerId, player.clientId);
  }

  generateResult(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(roomId || ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST", "只有主持人可以生成结果");

    const template = this.templatesById.get(room.templateId);
    const variant = template.variants[room.targetPlayerCount];
    const participants = this._getParticipants(room);
    if (participants.length < room.targetPlayerCount || participants.some(player => !player.submitted)) {
      throw createError("NOT_READY", "还有玩家未完成提交");
    }
    const mergedAnswers = {};
    for (const player of participants) {
      Object.assign(mergedAnswers, player.answers);
    }

    const scriptTemplate = variant.script || template.script;
    const script = scriptTemplate.replace(/\{(\w+)\}/g, (_match, key) => {
      return mergedAnswers[key] || "";
    });

    room.result = {
      resultTitle: variant.resultTitle,
      script,
      players: participants.map(p => ({
        playerName: p.playerName,
        answers: p.answers,
      })),
    };
    room.status = "result_ready";
    return this.buildRoomState(room, playerId, ctx.clientId);
  }

  closeRoom(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) return;
    const room = this.rooms.get(roomId || ctx.roomId);
    if (!room) return;
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST");
    room.status = "closed";
    this._cleanupRoom(room.roomId);
    return { type: "closed", roomId: room.roomId, status: "closed", closed: true };
  }

  leaveRoom(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) return;
    const room = this.rooms.get(roomId || ctx.roomId);
    if (!room) return;
    if (room.hostPlayerId === playerId) {
      return this.closeRoom(room.roomId, playerId);
    }

    const player = this._getPlayerRecord(room, playerId);
    if (!player) return;

    this._removePlayerFromRoom(room, playerId);
    this._syncRoomStatus(room);
    return {
      type: "updated",
      roomId: room.roomId,
      roomState: this._buildHostRoomState(room)
    };
  }

  handleDisconnect(socketId) {
    for (const [roomId, room] of this.rooms) {
      const player = room.players.find(p => p.socketId === socketId);
      if (!player) continue;

      if (room.hostPlayerId === player.playerId) {
        player.connected = false;
        player.socketId = null;
        return {
          type: "updated",
          roomId,
          roomState: this._buildHostRoomState(room)
        };
      }

      if (player.submitted) {
        player.connected = false;
        player.socketId = null;
      } else {
        this._removePlayerFromRoom(room, player.playerId);
      }

      this._syncRoomStatus(room);
      return {
        type: "updated",
        roomId,
        roomState: this._buildHostRoomState(room)
      };
    }
  }

  getRoomByCode(roomCode) {
    for (const room of this.rooms.values()) {
      if (room.roomCode === roomCode) return room;
    }
    return null;
  }

  buildRoomState(room, forPlayerId, clientId) {
    const forPlayer = room.players.find(p => p.playerId === forPlayerId);
    const safeClientId = clientId || (forPlayer && forPlayer.clientId) || null;
    const viewerRole = getViewerRole(room, safeClientId, forPlayerId);
    const isHost = viewerRole === "host";
    const participants = this._getParticipants(room);

    const canGenerate = isHost &&
      participants.length >= room.targetPlayerCount &&
      participants.every(p => p.submitted);
    const counts = this._getDisplayCounts(room);

    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      hostPlayerId: room.hostPlayerId,
      mode: room.mode || "fillword",
      playerId: forPlayerId,
      viewerRole,
      isHost,
      templateId: room.templateId,
      targetPlayerCount: counts.targetPlayerCount,
      targetTotalCount: counts.targetTotalCount,
      joinedPlayerCount: counts.joinedPlayerCount,
      joinedTotalCount: counts.joinedTotalCount,
      submittedPlayerCount: counts.submittedPlayerCount,
      waitingPlayerCount: counts.waitingPlayerCount,
      status: room.status,
      result: room.result || null,
      joined: counts.joinedTotalCount,
      viewerPlayerName: forPlayer ? forPlayer.playerName : "",
      viewerSubmitted: Boolean(forPlayer && forPlayer.submitted),
      viewerConnected: Boolean(forPlayer && forPlayer.connected !== false),
      players: room.players.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        isHost: room.hostPlayerId === p.playerId,
        connected: p.connected !== false,
        submitted: p.submitted,
        isViewer: p.playerId === forPlayerId,
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

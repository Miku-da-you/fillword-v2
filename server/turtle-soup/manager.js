"use strict";

const { randomUUID } = require("node:crypto");
const { ROOM_CODE_CHARS } = require("../utils");
const { getViewerRole } = require("../client-role");
const DEFAULT_CASES = require("./cases");
const { createScoring } = require("./scoring");
const { createAiAdjudicator } = require("./ai-adjudicator");
const { createFinalGuessAdjudicator } = require("./final-guess-adjudicator");

function createError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function generateRoomCode(existingRooms) {
  let attempts = 0;
  while (attempts < 100) {
    const code = Array.from({ length: 4 }, () =>
      ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join("");
    if (![...existingRooms.values()].some(room => room.roomCode === code)) {
      return code;
    }
    attempts++;
  }
  throw createError("ROOM_CODE_EXHAUSTED");
}

class TurtleSoupManager {
  constructor({ cases = DEFAULT_CASES, adjudicator, scoring, finalGuessAdjudicator } = {}) {
    this.cases = cases;
    this.casesById = new Map(cases.map(item => [item.id, item]));
    this.rooms = new Map();
    this.players = new Map();
    this.adjudicator = adjudicator || createAiAdjudicator();
    this.scoring = scoring || createScoring();
    this.finalGuessAdjudicator = finalGuessAdjudicator || createFinalGuessAdjudicator();
  }

  _buildHostRoomState(room) {
    return this.buildRoomState(room, room.hostPlayerId, room.hostClientId);
  }

  _removePlayer(room, playerId) {
    room.players = room.players.filter(player => player.playerId !== playerId);
    this.players.delete(playerId);
    room.guesses.delete(playerId);
  }

  createRoom(caseId, targetPlayerCount, hostSocketId, hostClientId) {
    const gameCase = this.casesById.get(caseId);
    if (!gameCase) throw createError("CASE_NOT_FOUND", "题包不存在");

    const roomId = randomUUID();
    const room = {
      roomId,
      roomCode: generateRoomCode(this.rooms),
      mode: "turtle",
      caseId,
      targetPlayerCount: Number(targetPlayerCount),
      hostClientId: String(hostClientId || "").trim() || randomUUID(),
      hostPlayerId: null,
      status: "lobby",
      qaHistory: [],
      questionCount: 0,
      questionLimit: 20,
      guesses: new Map(),
      result: null,
      solvedBy: null,
      failureReason: null,
      lastGuessFeedback: null,
      players: [],
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    const hostJoin = this._joinRoom(roomId, "房主", hostSocketId, room.hostClientId, true);
    room.hostPlayerId = hostJoin.playerId;
    return { roomId, roomCode: room.roomCode, playerId: hostJoin.playerId, roomState: hostJoin.roomState };
  }

  joinRoom(roomId, playerName, socketId, clientId) {
    return this._joinRoom(roomId, playerName, socketId, clientId, false);
  }

  _joinRoom(roomId, playerName, socketId, clientId, isHost) {
    const room = this.rooms.get(roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    const normalizedClientId = String(clientId || "").trim() || randomUUID();
    const existing = room.players.find(player => player.clientId === normalizedClientId);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      return { playerId: existing.playerId, roomState: this.buildRoomState(room, existing.playerId, normalizedClientId) };
    }

    if (room.status !== "lobby") throw createError("ROOM_NOT_WAITING");
    if (!isHost && room.players.length >= room.targetPlayerCount) throw createError("ROOM_FULL");

    const playerId = randomUUID();
    const player = {
      playerId,
      clientId: normalizedClientId,
      socketId,
      playerName: isHost ? "房主" : (String(playerName || "").trim() || "匿名"),
      connected: true,
      joinedAt: Date.now(),
    };
    room.players.push(player);
    this.players.set(playerId, { roomId, clientId: normalizedClientId });
    return { playerId, roomState: this.buildRoomState(room, playerId, normalizedClientId) };
  }

  startRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST");
    room.status = "asking";
    const ctx = this.players.get(playerId);
    return this.buildRoomState(room, playerId, ctx && ctx.clientId);
  }

  _buildResult(room, outcome) {
    const gameCase = this.casesById.get(room.caseId);
    return {
      title: gameCase.title,
      opening: gameCase.opening,
      fullTruth: gameCase.fullTruth,
      outcome,
      solvedBy: room.solvedBy,
      failureReason: room.failureReason,
      questionCount: room.questionCount,
      questionLimit: room.questionLimit,
      guesses: room.players.map(item => {
        const recorded = room.guesses.get(item.playerId) || { guess: "" };
        const score = recorded.score || (recorded.guess
          ? this.scoring.scoreGuess(recorded.guess, gameCase.fullTruth)
          : { label: "未提交", overlap: 0, solved: false });
        return {
          playerId: item.playerId,
          playerName: item.playerName,
          guess: recorded.guess,
          scoreLabel: score.label,
          solved: Boolean(score.solved),
        };
      })
    };
  }

  _revealTruth(room, outcome) {
    room.status = "truth_reveal";
    room.result = this._buildResult(room, outcome);
  }

  abandonGame(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(roomId || ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST");
    if (room.status !== "asking") throw createError("ROOM_NOT_ASKING", "当前阶段不能放弃本局");
    room.failureReason = "host_abandoned";
    this._revealTruth(room, "abandoned");
    return this.buildRoomState(room, playerId, ctx.clientId);
  }

  async submitQuestion(playerId, question) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.status !== "asking") throw createError("ROOM_NOT_ASKING");
    if (room.questionCount >= room.questionLimit) {
      room.failureReason = "question_limit_exceeded";
      this._revealTruth(room, "failed");
      return this.buildRoomState(room, playerId, ctx.clientId);
    }

    const gameCase = this.casesById.get(room.caseId);
    const judged = await this.adjudicator.judgeQuestion({
      gameCase,
      question,
      history: room.qaHistory,
    });
    room.questionCount += 1;
    room.qaHistory.push({
      playerId,
      playerName: room.players.find(player => player.playerId === playerId)?.playerName || "匿名",
      question,
      reply: judged.reply,
      verdict: judged.verdict,
      source: judged.source,
      index: room.questionCount,
    });

    if (room.questionCount >= room.questionLimit) {
      room.failureReason = "question_limit_exceeded";
      this._revealTruth(room, "failed");
    }

    return this.buildRoomState(room, playerId, ctx.clientId);
  }

  async submitGuess(playerId, guess) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (!["asking", "guessing"].includes(room.status)) throw createError("ROOM_NOT_ASKING");
    const player = room.players.find(item => item.playerId === playerId);
    const normalizedGuess = String(guess || "").trim();
    if (!normalizedGuess) throw createError("EMPTY_GUESS", "请输入你的最终猜测");
    const gameCase = this.casesById.get(room.caseId);
    const adjudicated = await this.finalGuessAdjudicator.judgeGuess({
      gameCase,
      guess: normalizedGuess,
    });
    const score = {
      label: adjudicated.scoreLabel || "未命中",
      solved: adjudicated.outcome === "solved",
    };

    room.guesses.set(playerId, {
      playerId,
      playerName: player ? player.playerName : "匿名",
      guess: normalizedGuess,
      score,
    });
    room.lastGuessFeedback = {
      playerId,
      playerName: player ? player.playerName : "匿名",
      outcome: adjudicated.outcome,
      hostHint: adjudicated.hostHint,
      guess: normalizedGuess,
    };

    if (adjudicated.outcome === "solved") {
      room.solvedBy = {
        playerId,
        playerName: player ? player.playerName : "匿名",
        guess: normalizedGuess,
        scoreLabel: score.label,
      };
      this._revealTruth(room, "solved");
      return this.buildRoomState(room, playerId, ctx.clientId);
    }

    if (adjudicated.outcome === "close") {
      room.status = "asking";
      return this.buildRoomState(room, playerId, ctx.clientId);
    }

    room.questionCount += 1;
    if (room.questionCount >= room.questionLimit) {
      room.failureReason = "question_limit_exceeded";
      this._revealTruth(room, "failed");
      return this.buildRoomState(room, playerId, ctx.clientId);
    }

    room.status = "asking";
    return this.buildRoomState(room, playerId, ctx.clientId);
  }

  leaveRoom(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) return null;
    const room = this.rooms.get(roomId || ctx.roomId);
    if (!room) return null;
    if (room.hostPlayerId === playerId) {
      return this.closeRoom(room.roomId, playerId);
    }
    this._removePlayer(room, playerId);
    return { type: "updated", roomId: room.roomId, roomState: this._buildHostRoomState(room) };
  }

  closeRoom(roomId, playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) return null;
    const room = this.rooms.get(roomId || ctx.roomId);
    if (!room) return null;
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST");
    this._cleanupRoom(room.roomId);
    return { type: "closed", roomId: room.roomId, closed: true };
  }

  handleDisconnect(socketId) {
    for (const room of this.rooms.values()) {
      const player = room.players.find(item => item.socketId === socketId);
      if (!player) continue;
      if (room.hostPlayerId === player.playerId) {
        player.connected = false;
        player.socketId = null;
        return { type: "updated", roomId: room.roomId, roomState: this._buildHostRoomState(room) };
      }
      if (room.status === "lobby") {
        this._removePlayer(room, player.playerId);
      } else {
        player.connected = false;
        player.socketId = null;
      }
      return { type: "updated", roomId: room.roomId, roomState: this._buildHostRoomState(room) };
    }
    return null;
  }

  getRoomByCode(roomCode) {
    for (const room of this.rooms.values()) {
      if (room.roomCode === roomCode) return room;
    }
    return null;
  }

  buildRoomState(room, playerId, clientId) {
    const viewerRole = getViewerRole(room, clientId, playerId);
    const gameCase = this.casesById.get(room.caseId);
    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      mode: room.mode,
      viewerRole,
      isHost: viewerRole === "host",
      playerId,
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      targetPlayerCount: room.targetPlayerCount,
      joined: room.players.length,
      hasSubmittedGuess: room.guesses.has(playerId),
      questionCount: room.questionCount,
      questionLimit: room.questionLimit,
      remainingQuestions: Math.max(0, room.questionLimit - room.questionCount),
      solvedBy: room.solvedBy,
      failureReason: room.failureReason,
      players: room.players.map(player => ({
        playerId: player.playerId,
        playerName: player.playerName,
        connected: player.connected !== false,
        guessed: room.guesses.has(player.playerId),
      })),
      caseId: room.caseId,
      caseTitle: gameCase.title,
      opening: gameCase.opening,
      qaHistory: room.qaHistory.slice(),
      guessFeedback: room.lastGuessFeedback,
      result: room.result,
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

module.exports = { TurtleSoupManager };

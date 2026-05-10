"use strict";

const { randomUUID } = require("node:crypto");
const { ROOM_CODE_CHARS } = require("../utils");
const { getViewerRole } = require("../client-role");
const DEFAULT_PACKS = require("./packs");
const { selectEnding } = require("./ending-selector");
const { createGhostNarrator } = require("./ai-narrator");

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

function normalizeAnswerValue(question, value) {
  if (question.type === "true_false") {
    return value === true || value === "true";
  }
  return Number(value);
}

function formatAnswerLabel(question, value) {
  const normalized = normalizeAnswerValue(question, value);
  if (question.type === "true_false") {
    return normalized ? "是" : "否";
  }
  if (Array.isArray(question.options)) {
    return question.options[Number(normalized)] || String(normalized);
  }
  return String(normalized);
}

class GhostStoryManager {
  constructor({ packs = DEFAULT_PACKS, narrator } = {}) {
    this.packs = packs;
    this.packsById = new Map(packs.map(item => [item.id, item]));
    this.rooms = new Map();
    this.players = new Map();
    this.narrator = narrator || createGhostNarrator();
  }

  _buildHostRoomState(room) {
    return this.buildRoomState(room, room.hostPlayerId, room.hostClientId);
  }

  _removePlayer(room, playerId) {
    room.players = room.players.filter(player => player.playerId !== playerId);
    this.players.delete(playerId);
    room.chapterSubmissions.delete(playerId);
    room.alivePlayerIds = room.alivePlayerIds.filter(id => id !== playerId);
    room.failedPlayerIds = room.failedPlayerIds.filter(id => id !== playerId);
  }

  _getPack(room) {
    const pack = this.packsById.get(room.packId);
    if (!pack) throw createError("PACK_NOT_FOUND", "故事包不存在");
    return pack;
  }

  _getCurrentChapter(room) {
    const pack = this._getPack(room);
    const chapter = pack.chapters && pack.chapters[room.currentChapterIndex];
    if (!chapter) throw createError("CHAPTER_CONFIG_INVALID", "当前章节配置缺失");
    return chapter;
  }

  _getAlivePlayers(room) {
    return room.players.filter(player => player.alive !== false);
  }

  _resetChapterSubmissionState(room) {
    room.chapterSubmissions.clear();
    room.players.forEach(player => {
      player.submittedCurrentChapter = false;
      player.chapterAnswers = {};
    });
  }

  _scoreChapter(chapter, answers) {
    const questions = chapter.questions || [];
    let correctCount = 0;
    for (const question of questions) {
      const submitted = normalizeAnswerValue(question, answers ? answers[question.id] : undefined);
      const expected = normalizeAnswerValue(question, question.correctAnswer);
      if (submitted === expected) {
        correctCount += 1;
      }
    }
    return {
      correctCount,
      totalQuestions: questions.length,
      passed: correctCount === questions.length,
    };
  }

  _resolveCurrentChapter(room) {
    const chapter = this._getCurrentChapter(room);
    const alivePlayers = this._getAlivePlayers(room);
    const resolution = alivePlayers.map(player => {
      const submittedAnswers = room.chapterSubmissions.get(player.playerId) || {};
      const score = this._scoreChapter(chapter, submittedAnswers);
      if (score.passed) {
        player.survivedChapters += 1;
        player.failureDetails = null;
      } else {
        player.alive = false;
        player.failedAtChapterIndex = room.currentChapterIndex;
        const failedQuestion = (chapter.questions || []).find(question => {
          const submitted = normalizeAnswerValue(question, submittedAnswers[question.id]);
          const expected = normalizeAnswerValue(question, question.correctAnswer);
          return submitted !== expected;
        }) || null;
        player.failureDetails = failedQuestion ? {
          failedQuestionId: failedQuestion.id,
          question: failedQuestion.question,
          selectedAnswer: formatAnswerLabel(failedQuestion, submittedAnswers[failedQuestion.id]),
          correctAnswer: formatAnswerLabel(failedQuestion, failedQuestion.correctAnswer),
          failedRuleIds: (failedQuestion.failureFeedback && failedQuestion.failureFeedback.failedRuleIds) || [],
          failureReason: (failedQuestion.failureFeedback && failedQuestion.failureFeedback.reason) || "你违反了当前章节的守则。",
          failureNarration: (failedQuestion.failureFeedback && failedQuestion.failureFeedback.narration) || "门外的异常已经注意到了你。",
        } : {
          failedQuestionId: null,
          question: "",
          selectedAnswer: "",
          correctAnswer: "",
          failedRuleIds: [],
          failureReason: "你违反了当前章节的守则。",
          failureNarration: "门外的异常已经注意到了你。",
        };
        room.alivePlayerIds = room.alivePlayerIds.filter(id => id !== player.playerId);
        if (!room.failedPlayerIds.includes(player.playerId)) {
          room.failedPlayerIds.push(player.playerId);
        }
      }
      return {
        playerId: player.playerId,
        playerName: player.playerName,
        passed: score.passed,
        correctCount: score.correctCount,
        totalQuestions: score.totalQuestions,
      };
    });

    const survivors = room.players.filter(player => player.alive !== false);
    const eliminated = room.players.filter(player => player.alive === false && player.failedAtChapterIndex === room.currentChapterIndex);

    room.chapterResolution = {
      chapterId: chapter.id,
      chapterTitle: chapter.chapterTitle,
      results: resolution,
      transitionNarration: chapter.transitionNarration || "这一章结束后，宿舍里的安静比刚才更让人不安。",
      survivors: survivors.map(player => ({ playerId: player.playerId, playerName: player.playerName })),
      eliminated: eliminated.map(player => ({ playerId: player.playerId, playerName: player.playerName })),
      nextChapterIndex: room.currentChapterIndex + 1,
      nextChapterTitle: null,
      readyPlayerIds: [],
    };
    room.completedChapterCount += 1;
    this._resetChapterSubmissionState(room);

    if (!room.alivePlayerIds.length) {
      room.status = "ending_reveal";
      return;
    }

    const pack = this._getPack(room);
    if (room.currentChapterIndex >= pack.chapters.length - 1) {
      room.status = "ending_reveal";
      return;
    }

    const nextChapter = pack.chapters[room.currentChapterIndex + 1];
    room.chapterResolution.nextChapterTitle = nextChapter ? nextChapter.chapterTitle : "下一章";
    room.status = "chapter_resolved";
  }

  async _buildEndingResult(room) {
    const pack = this._getPack(room);
    const survivors = room.players.filter(player => player.alive !== false);
    const endingKey = survivors.length > 0 ? "perfect" : "failed";
    const endingText = pack.endings[endingKey] || pack.endings.failed || "故事结束。";
    let aiEndingSummary = "";
    try {
      aiEndingSummary = await this.narrator.narrateEnding({ pack, endingText });
    } catch (_error) {
      aiEndingSummary = endingText;
    }

    room.result = {
      packTitle: pack.title,
      endingKey,
      endingText,
      aiEndingSummary,
      playerOutcomes: room.players.map(player => ({
        playerId: player.playerId,
        playerName: player.playerName,
        status: player.alive !== false ? "survived" : "failed",
        survivedChapters: player.survivedChapters || 0,
        failedAtChapterIndex: player.failedAtChapterIndex,
        failureDetails: player.failureDetails || null,
        summary: player.alive !== false
          ? "成功撑到最后一章。"
          : `倒在第 ${Number(player.failedAtChapterIndex || 0) + 1} 章。`,
      }))
    };
  }

  createRoom(packId, targetPlayerCount, hostSocketId, hostClientId) {
    const pack = this.packsById.get(packId);
    if (!pack) throw createError("PACK_NOT_FOUND", "故事包不存在");

    const roomId = randomUUID();
    const room = {
      roomId,
      roomCode: generateRoomCode(this.rooms),
      mode: "ghost",
      packId,
      targetPlayerCount: Number(targetPlayerCount),
      hostClientId: String(hostClientId || "").trim() || randomUUID(),
      hostPlayerId: null,
      status: "lobby",
      introNarration: "",
      currentChapterIndex: 0,
      completedChapterCount: 0,
      chapterSubmissions: new Map(),
      chapterResolution: null,
      continueVotes: new Set(),
      alivePlayerIds: [],
      failedPlayerIds: [],
      result: null,
      players: [],
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
      alive: true,
      failedAtChapterIndex: null,
      failureDetails: null,
      submittedCurrentChapter: false,
      chapterAnswers: {},
      survivedChapters: 0,
    };
    room.players.push(player);
    room.alivePlayerIds.push(playerId);
    this.players.set(playerId, { roomId, clientId: normalizedClientId });
    return { playerId, roomState: this.buildRoomState(room, playerId, normalizedClientId) };
  }

  async startRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.hostPlayerId !== playerId) throw createError("NOT_HOST");
    room.status = "chapter_answering";
    room.currentChapterIndex = 0;
    room.completedChapterCount = 0;
    room.chapterResolution = null;
    room.failedPlayerIds = [];
    room.continueVotes = new Set();
    room.alivePlayerIds = room.players.map(player => player.playerId);
    this._resetChapterSubmissionState(room);
    room.players.forEach(player => {
      player.alive = true;
      player.failedAtChapterIndex = null;
      player.failureDetails = null;
      player.survivedChapters = 0;
      player.connected = player.connected !== false;
    });
    const pack = this._getPack(room);
    try {
      room.introNarration = await this.narrator.narrateIntro(pack);
    } catch (_error) {
      room.introNarration = pack.intro || "";
    }
    const ctx = this.players.get(playerId);
    return this.buildRoomState(room, playerId, ctx && ctx.clientId);
  }

  async submitAnswers(playerId, answers) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.status !== "chapter_answering") throw createError("ROOM_NOT_ANSWERING", "当前阶段不能作答");

    const player = room.players.find(item => item.playerId === playerId);
    if (!player) throw createError("PLAYER_NOT_FOUND");
    if (player.alive === false) throw createError("PLAYER_ELIMINATED", "你已失败，无法继续作答");
    if (player.submittedCurrentChapter) throw createError("ALREADY_SUBMITTED", "本章已经提交过了");

    const chapter = this._getCurrentChapter(room);
    const submittedAnswers = answers || {};
    for (const question of chapter.questions || []) {
      if (!(question.id in submittedAnswers)) {
        throw createError("INVALID_ANSWERS", "请先完成本章全部题目");
      }
    }

    player.submittedCurrentChapter = true;
    player.chapterAnswers = submittedAnswers;
    room.chapterSubmissions.set(playerId, submittedAnswers);

    const alivePlayers = this._getAlivePlayers(room);
    if (alivePlayers.some(item => !item.submittedCurrentChapter)) {
      return this.buildRoomState(room, playerId, ctx.clientId);
    }

    this._resolveCurrentChapter(room);
    if (room.status === "ending_reveal") {
      await this._buildEndingResult(room);
    }

    return this.buildRoomState(room, playerId, ctx.clientId);
  }

  continueChapter(playerId) {
    const ctx = this.players.get(playerId);
    if (!ctx) throw createError("PLAYER_NOT_FOUND");
    const room = this.rooms.get(ctx.roomId);
    if (!room) throw createError("ROOM_NOT_FOUND");
    if (room.status !== "chapter_resolved") throw createError("ROOM_NOT_RESOLVED", "当前还不能进入下一章");

    const player = room.players.find(item => item.playerId === playerId);
    if (!player) throw createError("PLAYER_NOT_FOUND");
    if (player.alive === false) throw createError("PLAYER_ELIMINATED", "你已失败，无法进入下一章");

    room.continueVotes.add(playerId);
    if (room.chapterResolution) {
      room.chapterResolution.readyPlayerIds = [...room.continueVotes];
    }

    const aliveIds = room.alivePlayerIds.slice();
    const everyoneReady = aliveIds.every(id => room.continueVotes.has(id));
    if (everyoneReady) {
      room.currentChapterIndex += 1;
      room.status = "chapter_answering";
      room.continueVotes = new Set();
      room.chapterResolution = null;
    }

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
    const pack = this._getPack(room);
    const viewer = room.players.find(player => player.playerId === playerId) || null;
    const currentChapter = room.status === "lobby" || room.status === "ending_reveal"
      ? pack.chapters[Math.min(room.currentChapterIndex, pack.chapters.length - 1)]
      : this._getCurrentChapter(room);

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
      alivePlayerCount: room.alivePlayerIds.length,
      failedPlayerCount: room.failedPlayerIds.length,
      hasSubmitted: Boolean(viewer && viewer.submittedCurrentChapter),
      viewerAlive: Boolean(viewer && viewer.alive !== false),
      viewerFailedAtChapterIndex: viewer ? viewer.failedAtChapterIndex : null,
      viewerSubmittedCurrentChapter: Boolean(viewer && viewer.submittedCurrentChapter),
      viewerFailureDetails: viewer ? (viewer.failureDetails || null) : null,
      players: room.players.map(player => ({
        playerId: player.playerId,
        playerName: player.playerName,
        connected: player.connected !== false,
        submitted: Boolean(player.submittedCurrentChapter),
        alive: player.alive !== false,
        failedAtChapterIndex: player.failedAtChapterIndex,
      })),
      packId: room.packId,
      packTitle: pack.title,
      intro: pack.intro,
      rules: pack.rules || [],
      introNarration: room.introNarration,
      currentChapterIndex: room.currentChapterIndex,
      currentChapterTitle: currentChapter ? currentChapter.chapterTitle : "",
      currentChapterContent: currentChapter ? currentChapter.content : "",
      currentChapterClues: currentChapter ? (currentChapter.clues || []) : [],
      currentChapterQuestions: currentChapter ? (currentChapter.questions || []) : [],
      completedChapterCount: room.completedChapterCount,
      chapterResolution: room.chapterResolution,
      viewerReadyForNextChapter: Boolean(viewer && room.continueVotes && room.continueVotes.has(viewer.playerId)),
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

module.exports = { GhostStoryManager };

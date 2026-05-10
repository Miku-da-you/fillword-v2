"use strict";

const { randomUUID } = require("node:crypto");

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

function createPlayerId() {
  return randomUUID();
}

module.exports = { ROOM_CODE_CHARS, generateRoomCode, createError, createPlayerId };

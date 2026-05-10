"use strict";

class RoomCodeRegistry {
  constructor() {
    this.entries = new Map();
  }

  register(roomCode, payload) {
    this.entries.set(roomCode, payload);
  }

  unregister(roomCode) {
    this.entries.delete(roomCode);
  }

  get(roomCode) {
    return this.entries.get(roomCode) || null;
  }
}

module.exports = { RoomCodeRegistry };

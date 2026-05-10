"use strict";

function isHostClient(room, clientId) {
  return Boolean(room && clientId && room.hostClientId === clientId);
}

function getViewerRole(room, clientId, playerId) {
  if (!room) return "player";
  if (isHostClient(room, clientId)) return "host";
  if (playerId && room.hostPlayerId === playerId) return "host";
  return "player";
}

module.exports = {
  getViewerRole,
  isHostClient,
};

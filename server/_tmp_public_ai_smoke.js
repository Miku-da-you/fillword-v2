"use strict";

const { io: createClient } = require("socket.io-client");

function onceEvent(emitter, event) {
  return new Promise(resolve => emitter.once(event, resolve));
}

function ack(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, response => {
      if (response && response.success) {
        resolve(response);
        return;
      }
      reject(new Error((response && (response.message || response.error)) || `${event} failed`));
    });
  });
}

async function main() {
  const suffix = Date.now();
  const host = createClient("http://117.72.205.240", { transports: ["websocket"] });
  const player = createClient("http://117.72.205.240", { transports: ["websocket"] });

  await Promise.all([onceEvent(host, "connect"), onceEvent(player, "connect")]);

  try {
    const created = await ack(host, "create_room", {
      mode: "turtle",
      caseId: "late-night-elevator",
      targetPlayerCount: 2,
      clientId: `spark-host-${suffix}`,
    });

    await ack(player, "join_room", {
      roomCode: created.roomCode,
      playerName: "Spark玩家",
      clientId: `spark-player-${suffix}`,
    });

    await ack(host, "start_room", {});

    const asked = await ack(player, "submit_turtle_question", {
      question: "他是不是看到了镜子里的自己？",
    });

    const latest = asked.roomState && asked.roomState.qaHistory && asked.roomState.qaHistory[0];
    console.log(JSON.stringify({
      roomCode: created.roomCode,
      source: latest && latest.source,
      verdict: latest && latest.verdict,
      reply: latest && latest.reply,
    }));
  } finally {
    host.close();
    player.close();
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
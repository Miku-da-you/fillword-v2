const { io } = require("socket.io-client");

const HOST = process.env.FILLWORD_HOST || "http://117.72.205.240";
const BROWSER_PLAYER_NAME = "怪谈浏览器玩家";

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
      reject(new Error((response && (response.message || response.error)) || "ACK_FAIL"));
    });
  });
}

async function main() {
  const host = io(HOST, { transports: ["websocket"] });
  let started = false;
  let hostSubmitted = false;
  let resultResolved = false;

  const timeout = setTimeout(() => {
    if (!resultResolved) {
      console.error("TIMEOUT: 怪谈浏览器回归未在时限内完成");
      process.exit(1);
    }
  }, 90000);

  host.on("room_state", async state => {
    try {
      const names = (state.players || []).map(player => `${player.playerName}:${player.submitted ? "Y" : "N"}`);
      console.log(`HOST_STATE status=${state.status} players=${names.join(",")}`);

      if (!started && names.some(item => item.startsWith(`${BROWSER_PLAYER_NAME}:`))) {
        await ack(host, "start_room", {});
        started = true;
        console.log("HOST_STARTED");
        return;
      }

      if (!hostSubmitted && state.status === "judging") {
        hostSubmitted = true;
        await ack(host, "submit_ghost_answers", {
          answers: { q1: 2, q2: false }
        });
        console.log("HOST_SUBMITTED_ANSWERS");
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

  host.on("room_state", state => {
    if (state.status === "ending_reveal" && state.result && !resultResolved) {
      resultResolved = true;
      console.log(`ENDING_REVEAL ending=${state.result.endingKey}`);
      clearTimeout(timeout);
      host.close();
      process.exit(0);
    }
  });

  await onceEvent(host, "connect");
  const created = await ack(host, "create_room", {
    mode: "ghost",
    packId: "dormitory-rule-13",
    targetPlayerCount: 2,
    clientId: "browser-regression-ghost-host"
  });
  console.log(`ROOM_CODE=${created.roomCode}`);
  console.log("WAITING_FOR_BROWSER_PLAYER");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

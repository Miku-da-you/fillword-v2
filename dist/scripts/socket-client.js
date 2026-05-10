/**
 * 填词大作战 - Socket.IO 客户端同步模块
 * 连接部署在服务器上的 Node.js 后端
 */

const SOCKET_URL = window.location.hostname === '117.72.205.240' 
  ? window.location.origin 
  : 'http://117.72.205.240:3000';

let socket = null;
let currentPlayerId = null;
let currentRoomId = null;
let reconnectAttempts = 0;

const MAX_RECONNECT = 5;

function connect() {
  return new Promise((resolve, reject) => {
    if (typeof io === 'undefined') {
      // 加载 Socket.IO 客户端
      const script = document.createElement('script');
      script.src = 'scripts/socket.io.min.js?t=2026050201';
      script.onload = () => {
        initSocket(resolve, reject);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      initSocket(resolve, reject);
    }
  });
}

function initSocket(resolve, reject) {
  console.log('[SocketIO] initSocket called, connecting to:', SOCKET_URL);
  socket = io(SOCKET_URL, {
    transports: ['polling', 'websocket'],
    timeout: 8000,
    reconnection: false
  });

  socket.on('connect', () => {
    console.log('[SocketIO] Connected! id:', socket.id);
    reconnectAttempts = 0;
    resolve(socket);
  });

  socket.on('connect_error', (err) => {
    console.error('[SocketIO] connect_error:', err.message, 'type:', err.type);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT) {
      console.error('[SocketIO] Max attempts reached, rejecting');
      reject(new Error('连接失败: ' + err.message));
    }
  });

  socket.on('disconnect', () => {
    console.log('[SocketIO] Disconnected');
  });

  // Timeout fallback
  setTimeout(() => {
    if (!socket || !socket.connected) {
      console.error('[SocketIO] Timeout - no connection after 15s');
      reject(new Error('连接超时，请检查网络'));
    }
  }, 15000);
}

// ============================================================
// 房间操作
// ============================================================

async function createRoom(templateIndex) {
  const sock = await connect();
  return new Promise((resolve, reject) => {
    sock.emit('create_room', { templateIndex }, res => {
      if (res.success) {
        currentPlayerId = res.playerId;
        currentRoomId = res.roomId;
        resolve({ roomId: res.roomId, playerId: res.playerId });
      } else {
        reject(new Error(res.error));
      }
    });
  });
}

async function joinRoom(roomId, playerName) {
  const sock = await connect();
  return new Promise((resolve, reject) => {
    sock.emit('join_room', { roomId, playerName }, res => {
      if (res.success) {
        currentPlayerId = res.playerId;
        currentRoomId = roomId;
        resolve({ playerId: res.playerId, players: res.players });
      } else {
        reject(new Error(res.error));
      }
    });
  });
}

async function submitAnswers(answers) {
  if (!socket || !currentPlayerId) throw new Error('Not connected');
  return new Promise((resolve, reject) => {
    socket.emit('submit_answers', { playerId: currentPlayerId, answers }, res => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });
}

async function generateResult() {
  if (!socket || !currentRoomId) throw new Error('Not connected');
  return new Promise((resolve, reject) => {
    socket.emit('generate_result', { roomId: currentRoomId }, res => {
      if (res.success) resolve({ script: res.script });
      else reject(new Error(res.error));
    });
  });
}

// ============================================================
// 事件监听
// ============================================================

function onPlayerJoined(callback) {
  socket?.on('player_joined', data => callback(data));
}

function onPlayerSubmitted(callback) {
  socket?.on('player_submitted', data => callback(data));
}

function onPlayerLeft(callback) {
  socket?.on('player_left', data => callback(data));
}

function onResultGenerated(callback) {
  socket?.on('result_generated', data => callback(data));
}

function disconnect() {
  socket?.disconnect();
  socket = null;
  currentPlayerId = null;
  currentRoomId = null;
}

// 导出
window.SocketSync = {
  connect,
  createRoom,
  joinRoom,
  submitAnswers,
  generateResult,
  onPlayerJoined,
  onPlayerSubmitted,
  onPlayerLeft,
  onResultGenerated,
  disconnect,
  get currentPlayerId() { return currentPlayerId; },
  get currentRoomId() { return currentRoomId; }
};
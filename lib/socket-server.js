/** @type {import('socket.io').Server | null} */
let io = null;

function setIO(server) {
  io = server;
}

function getIO() {
  return io;
}

function broadcastRoomUpdate(roomId) {
  const socketIO = io || (typeof global !== 'undefined' && global.__SOCKET_IO__);
  if (!socketIO) {
    console.warn('[ws] Socket.io 未初始化，请使用 npm run dev 或 node server.js 启动');
    return;
  }
  const roomName = `room:${roomId}`;
  const room = socketIO.sockets.adapter.rooms.get(roomName);
  const count = room ? room.size : 0;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ws] broadcast room-update to ${roomName}, ${count} clients`);
  }
  socketIO.to(roomName).emit('room-update');
}

module.exports = { setIO, getIO, broadcastRoomUpdate };

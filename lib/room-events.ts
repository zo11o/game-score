import type { RoomDrawEvent } from './types';

type SocketServer = {
  to: (roomName: string) => {
    emit: (eventName: string, payload?: unknown) => void;
  };
};

export function broadcastRoomUpdate(roomId: string) {
  try {
    const io = (globalThis as typeof globalThis & { __SOCKET_IO__?: SocketServer }).__SOCKET_IO__;
    if (io) {
      io.to(`room:${roomId}`).emit('room-update');
    }
  } catch (err) {
    console.error('broadcastRoomUpdate error:', err);
  }
}

export function broadcastRoomDraw(event: RoomDrawEvent) {
  try {
    const io = (globalThis as typeof globalThis & { __SOCKET_IO__?: SocketServer }).__SOCKET_IO__;
    if (io) {
      io.to(`room:${event.roomId}`).emit('room-draw', event);
    }
  } catch (err) {
    console.error('broadcastRoomDraw error:', err);
  }
}

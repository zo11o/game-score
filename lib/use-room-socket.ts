'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { RoomDrawEvent } from './types';

type RoomSocketHandlers = {
  onUpdate: () => void;
  onDraw?: (event: RoomDrawEvent) => void;
};

export function useRoomSocket(roomId: string | undefined, handlers: RoomSocketHandlers) {
  const onUpdateRef = useRef(handlers.onUpdate);
  const onDrawRef = useRef(handlers.onDraw);
  onUpdateRef.current = handlers.onUpdate;
  onDrawRef.current = handlers.onDraw;

  useEffect(() => {
    if (!roomId) return;

    const socket = io();

    socket.on('connect', () => {
      socket.emit('join-room', roomId);
    });

    socket.on('room-update', () => {
      onUpdateRef.current();
    });

    socket.on('room-draw', (event: RoomDrawEvent) => {
      onDrawRef.current?.(event);
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.disconnect();
    };
  }, [roomId]);
}

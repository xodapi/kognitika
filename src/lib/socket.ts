import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const duelActions = {
  join: (roomId: string, userId: string) => {
    socket.connect();
    socket.emit('duel:join', { roomId, userId });
  },
  sendProgress: (roomId: string, progress: number) => {
    socket.emit('duel:progress', { roomId, progress });
  },
  disconnect: () => {
    socket.disconnect();
  }
};

import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export function connectSocket(token: string) {
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
}

export const duelActions = {
  join: (roomId: string, token: string) => {
    connectSocket(token);
    socket.emit('duel:join', { roomId });
  },
  sendProgress: (roomId: string, progress: number) => {
    socket.emit('duel:progress', { roomId, progress });
  },
  disconnect: () => {
    socket.disconnect();
  }
};

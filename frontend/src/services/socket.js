import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
      auth: {
        token: localStorage.getItem('crypto-sim-token') || ''
      }
    });
  } else {
    socket.auth = {
      token: localStorage.getItem('crypto-sim-token') || ''
    };
  }

  return socket;
};
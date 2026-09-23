const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 8000;

// Serve o frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Guarda os usuários de cada sala: { roomName: { socketId: username } }
const rooms = {};

io.on('connection', (socket) => {
  // Usuário informa username e room name
  socket.on('join-room', ({ username, room }) => {
    if (!username || !room) {
      socket.emit('error-message', 'Username e room name são obrigatórios.');
      return;
    }

    socket.username = username;
    socket.room = room;
    socket.join(room);

    if (!rooms[room]) rooms[room] = {};
    rooms[room][socket.id] = username;

    // Avisa aos outros da sala que alguém entrou
    socket.to(room).emit('user-connected', {
      id: socket.id,
      username,
    });

    // Envia ao usuário recém-chegado a lista atual de participantes
    socket.emit('room-users', Object.values(rooms[room]));
  });

  // Mensagens de chat dentro da sala
  socket.on('chat-message', ({ message }) => {
    if (!socket.room || !message) return;

    io.to(socket.room).emit('chat-message', {
      username: socket.username,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // Localização ao vivo, enviada para todos na sala
  socket.on('send-location', ({ latitude, longitude }) => {
    if (!socket.room) return;

    io.to(socket.room).emit('receive-location', {
      id: socket.id,
      username: socket.username,
      latitude,
      longitude,
    });
  });

  // Ao desconectar, avisa a sala e limpa os registros
  socket.on('disconnect', () => {
    const { room, username } = socket;
    if (room && rooms[room]) {
      delete rooms[room][socket.id];

      socket.to(room).emit('user-disconnected', {
        id: socket.id,
        username,
      });

      if (Object.keys(rooms[room]).length === 0) {
        delete rooms[room];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = { app, server, io };

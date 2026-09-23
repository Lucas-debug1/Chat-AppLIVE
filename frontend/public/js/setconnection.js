// Conexão com o servidor via Socket.IO
const socket = io();

// Elementos da tela
const joinScreen = document.getElementById('join-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const joinBtn = document.getElementById('join-btn');
const roomTitle = document.getElementById('room-title');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const locationBtn = document.getElementById('location-btn');
const locationsDiv = document.getElementById('locations');

let currentUsername = '';
let currentRoom = '';

// 1) Envia username + room para o servidor
joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();

  if (!username || !room) {
    alert('Preencha username e room name.');
    return;
  }

  currentUsername = username;
  currentRoom = room;

  socket.emit('join-room', { username, room });

  joinScreen.style.display = 'none';
  chatScreen.style.display = 'block';
  roomTitle.textContent = `Sala: ${room}`;
});

// 2) Envio de mensagens de chat
function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  socket.emit('chat-message', { message });
  messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Recebe mensagens de todos na sala (incluindo as próprias, ecoadas pelo servidor)
socket.on('chat-message', ({ username, message, timestamp }) => {
  const el = document.createElement('div');
  const time = new Date(timestamp).toLocaleTimeString();
  el.textContent = `[${time}] ${username}: ${message}`;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('user-connected', ({ username }) => {
  const el = document.createElement('div');
  el.style.fontStyle = 'italic';
  el.textContent = `${username} entrou na sala.`;
  messagesDiv.appendChild(el);
});

socket.on('user-disconnected', ({ username }) => {
  const el = document.createElement('div');
  el.style.fontStyle = 'italic';
  el.textContent = `${username} saiu da sala.`;
  messagesDiv.appendChild(el);
});

socket.on('error-message', (msg) => {
  alert(msg);
});

// 3) Envio de localização ao vivo
locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocalização não é suportada neste navegador.');
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      socket.emit('send-location', { latitude, longitude });
    },
    (err) => {
      console.error('Erro ao obter localização:', err);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
});

socket.on('receive-location', ({ username, latitude, longitude }) => {
  let el = document.getElementById(`loc-${username}`);
  if (!el) {
    el = document.createElement('div');
    el.id = `loc-${username}`;
    locationsDiv.appendChild(el);
  }
  const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
  el.innerHTML = `${username}: <a href="${mapLink}" target="_blank" rel="noopener">Ver localização no mapa</a>`;
});

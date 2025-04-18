import { randomUUID } from 'crypto';
import { io } from 'socket.io-client';
import * as qrcode from 'qrcode-terminal';

// const socket = io('ws://localhost:3001/sessions', {
//   autoConnect: true,
//   rejectUnauthorized: false,
// });

const socket = io('ws://201.54.12.58:3001/sessions', {
  autoConnect: true,
  rejectUnauthorized: false,
});


socket.on('connect', () => {
  const session_id = randomUUID();
  console.log(session_id);
  socket.emit('load-session', {
    session_id,
    notify_webhooks: ['https://webhook.site/a5a76b07-e660-4bc8-a5a8-7a7958f7df78'],
  });
});

socket.on('connect_error', (err) => {
  console.error('❌ connect_error', err);
});


socket.on('error', () => {
  console.log('deu shabu');
});

socket.on('end', () => {
  console.log('closed');
});

socket.on('whatsapp.qrcode', ({ qr }) => qrcode.generate(qr, { small: true }));

import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ROOMS = 200;
const MAX_GUESTS = 4;
const MAX_SIGNAL_BYTES = 64 * 1024;
const MAX_CONNECTIONS_PER_IP = 12;
const ROOM_CODE = /^[A-Z0-9]{6,10}$/;
const TOKEN = /^[A-Za-z0-9_-]{32,96}$/;

const json = (res, status, body, origin = '') => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'vary': 'Origin' };
  if (origin) headers['access-control-allow-origin'] = origin;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
};
const equalSecret = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
const roomCode = () => randomBytes(5).toString('hex').toUpperCase();

export function createGuestSignalServer({ host = '127.0.0.1', port = 18788, now = Date.now, maxRooms = MAX_ROOMS, maxGuests = MAX_GUESTS, allowedOrigins = [], turnUrls = [], turnSharedSecret = '', turnCredentialTtlSeconds = 3600 } = {}) {
  function iceServers(roomCode) { const servers = [{ urls: ['stun:stun.l.google.com:19302'] }]; if (turnUrls.length && turnSharedSecret) { const expiry = Math.floor(now() / 1000) + turnCredentialTtlSeconds; const username = `${expiry}:${roomCode}`; const credential = createHmac('sha1', turnSharedSecret).update(username).digest('base64'); servers.push({ urls: turnUrls, username, credential }); } return servers; }
  const rooms = new Map();
  const ipConnections = new Map();
  const roomCreationBuckets = new Map();
  const server = createServer((req, res) => {
    const origin = req.headers.origin || '';
    const originAllowed = !allowedOrigins.length || (!!origin && allowedOrigins.includes(origin));
    if (req.method === 'OPTIONS' && req.url === '/api/guest-rooms') {
      if (!originAllowed) return json(res, 403, { error: 'Origin not allowed.' }, origin);
      res.writeHead(204, { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600', 'vary': 'Origin' }); return res.end();
    }
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', service: 'every-frame-guest-signaling' });
    if (req.method !== 'POST' || req.url !== '/api/guest-rooms') return json(res, 404, { error: 'Not found.' });
    if (!originAllowed) return json(res, 403, { error: 'Origin not allowed.' }, origin);
    const ip = req.socket.remoteAddress || 'unknown';
    const bucket = roomCreationBuckets.get(ip) || { start: now(), count: 0 };
    if (now() - bucket.start >= 10 * 60 * 1000) { bucket.start = now(); bucket.count = 0; }
    bucket.count += 1; roomCreationBuckets.set(ip, bucket);
    if (bucket.count > 5) return json(res, 429, { error: 'Room creation limit reached. Try again later.' }, origin);
    let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > 2048) { json(res, 413, { error: 'Request too large.' }, origin); req.destroy(); } });
    req.on('end', () => {
      for (const [code, room] of rooms) if (room.expiresAt <= now() || room.closed) closeRoom(code);
      if (rooms.size >= maxRooms) return json(res, 503, { error: 'Room capacity reached. Try again later.' }, origin);
      let code; do { code = roomCode(); } while (rooms.has(code));
      const hostToken = randomToken();
      const room = { code, hostToken, host: null, guests: new Map(), createdAt: now(), expiresAt: now() + ROOM_TTL_MS, closed: false };
      rooms.set(code, room);
      return json(res, 201, { roomCode: code, hostToken, expiresAt: room.expiresAt, maxGuests, signalingPath: '/ws' }, origin);
    });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_SIGNAL_BYTES, perMessageDeflate: false });
  function send(ws, payload) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); }
  function closeRoom(code) {
    const room = rooms.get(code); if (!room) return;
    room.closed = true;
    for (const ws of [room.host, ...room.guests.values()]) if (ws?.readyState === WebSocket.OPEN) { send(ws, { type: 'room-closed' }); ws.close(1000, 'Room closed'); }
    rooms.delete(code);
  }
  server.on('upgrade', (req, socket, head) => {
    const origin = req.headers.origin;
    if (allowedOrigins.length && (!origin || !allowedOrigins.includes(origin))) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/ws') { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); return socket.destroy(); }
    const ip = req.socket.remoteAddress || 'unknown';
    if ((ipConnections.get(ip) || 0) >= MAX_CONNECTIONS_PER_IP) { socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, ws => {
      ipConnections.set(ip, (ipConnections.get(ip) || 0) + 1);
      ws.once('close', () => { const count = (ipConnections.get(ip) || 1) - 1; if (count) ipConnections.set(ip, count); else ipConnections.delete(ip); });
      const role = url.searchParams.get('role'); const code = url.searchParams.get('room') || ''; const token = url.searchParams.get('token') || '';
      const room = rooms.get(code);
      if (!room || room.closed || room.expiresAt <= now()) { send(ws, { type: 'error', message: 'Room not found or expired.' }); return ws.close(1008, 'Room unavailable'); }
      if (role === 'host') {
        if (!equalSecret(token, room.hostToken) || room.host) { send(ws, { type: 'error', message: 'Invalid host credentials or host already connected.' }); return ws.close(1008, 'Unauthorized'); }
        room.host = ws; ws.guestId = 'host'; ws.roomCode = code; ws.role = 'host'; send(ws, { type: 'host-ready', roomCode: code, guestCount: room.guests.size, maxGuests, iceServers: iceServers(code) });
      } else if (role === 'guest') {
        if (token !== room.guestToken || !room.guestToken) { send(ws, { type: 'error', message: 'This room requires a valid guest invitation.' }); return ws.close(1008, 'Unauthorized'); }
        if (room.guests.size >= maxGuests) { send(ws, { type: 'error', message: 'This room is full.' }); return ws.close(1008, 'Room full'); }
        const guestId = randomToken(9); ws.guestId = guestId; ws.roomCode = code; ws.role = 'guest'; room.guests.set(guestId, ws);
        send(ws, { type: 'guest-ready', guestId, iceServers: iceServers(code) }); send(room.host, { type: 'guest-joined', guestId });
      } else { send(ws, { type: 'error', message: 'Invalid room role.' }); return ws.close(1008, 'Invalid role'); }
      ws.on('message', raw => {
        if (raw.length > MAX_SIGNAL_BYTES) return ws.close(1009, 'Message too large');
        let msg; try { msg = JSON.parse(raw.toString()); } catch { return send(ws, { type: 'error', message: 'Invalid signaling message.' }); }
        if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return send(ws, { type: 'error', message: 'Invalid signaling message.' });
        const current = rooms.get(ws.roomCode); if (!current || current.closed) return ws.close(1008, 'Room closed');
        if (ws.role === 'host' && msg.type === 'invite-guests') {
          if (current.guestToken) return send(ws, { type: 'guest-invite', guestToken: current.guestToken, guestUrlPath: '/guest.html', roomCode: current.code });
          current.guestToken = randomToken(); send(ws, { type: 'guest-invite', guestToken: current.guestToken, guestUrlPath: '/guest.html', roomCode: current.code });
        } else if (ws.role === 'host' && ['offer', 'host-control'].includes(msg.type)) {
          const target = current.guests.get(msg.guestId); if (!target) return send(ws, { type: 'error', message: 'Guest is no longer connected.' });
          if (msg.type === 'offer' && typeof msg.sdp === 'string' && msg.sdp.length < MAX_SIGNAL_BYTES) send(target, { type: 'offer', sdp: msg.sdp });
          else if (msg.type === 'host-control' && ['mute-audio', 'enable-audio', 'disable-video', 'enable-video', 'kick'].includes(msg.action)) {
            send(target, { type: 'host-control', action: msg.action }); if (msg.action === 'kick') { current.guests.delete(msg.guestId); target.close(1000, 'Removed by host'); send(ws, { type: 'guest-left', guestId: msg.guestId }); }
          }
        } else if (ws.role === 'guest' && ['answer', 'guest-status'].includes(msg.type)) {
          if (msg.type === 'answer' && typeof msg.sdp === 'string' && msg.sdp.length < MAX_SIGNAL_BYTES) send(current.host, { type: 'answer', guestId: ws.guestId, sdp: msg.sdp });
          else if (msg.type === 'guest-status' && ['camera-on', 'camera-off', 'mic-on', 'mic-off'].includes(msg.status)) send(current.host, { type: 'guest-status', guestId: ws.guestId, status: msg.status });
        } else send(ws, { type: 'error', message: 'Signaling action is not allowed.' });
      });
      ws.on('close', () => {
        const current = rooms.get(ws.roomCode); if (!current) return;
        if (ws.role === 'host' && current.host === ws) closeRoom(ws.roomCode);
        else if (ws.role === 'guest' && current.guests.get(ws.guestId) === ws) { current.guests.delete(ws.guestId); send(current.host, { type: 'guest-left', guestId: ws.guestId }); }
      });
    });
  });
  const expiryTimer = setInterval(() => { for (const [code, room] of rooms) if (room.expiresAt <= now()) closeRoom(code); }, 60_000); expiryTimer.unref?.();
  return { server, wss, rooms, listen: () => new Promise(resolve => server.listen(port, host, () => resolve(server.address()))), close: () => new Promise(resolve => { clearInterval(expiryTimer); for (const code of [...rooms.keys()]) closeRoom(code); wss.close(); server.close(resolve); }) };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const config = { host: process.env.GUEST_SIGNAL_HOST || '127.0.0.1', port: Number(process.env.PORT || process.env.GUEST_SIGNAL_PORT || 18788), allowedOrigins: (process.env.GUEST_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean), turnUrls: (process.env.GUEST_TURN_URLS || '').split(',').map(v => v.trim()).filter(Boolean), turnSharedSecret: process.env.GUEST_TURN_SHARED_SECRET || '', turnCredentialTtlSeconds: Number(process.env.GUEST_TURN_CREDENTIAL_TTL || 3600) };
  const app = createGuestSignalServer(config);
  app.listen().then(address => process.stdout.write(`Guest signaling listening on ${address.address}:${address.port}\n`));
}

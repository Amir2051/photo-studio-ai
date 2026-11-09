import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createGuestSignalServer } from '../server/guest-signal.mjs';

const running: Array<Awaited<ReturnType<typeof createGuestSignalServer>>> = [];
async function start(options = {}) {
  const app = createGuestSignalServer({ host: '127.0.0.1', port: 0, ...options });
  const address = await app.listen();
  running.push(app);
  return { app, base: `http://127.0.0.1:${(address as { port: number }).port}`, ws: `ws://127.0.0.1:${(address as { port: number }).port}/ws` };
}
function nextMessages(socket: WebSocket, type: string, count = 1) {
  return new Promise<any>((resolve, reject) => {
    const messages: any[] = [];
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 2000);
    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString());
      if (message.type === type) { messages.push(message); if (messages.length === count) { clearTimeout(timeout); socket.off('message', onMessage); resolve(count === 1 ? messages[0] : messages); } }
    };
    socket.on('message', onMessage);
  });
}
const nextMessage = (socket: WebSocket, type: string) => nextMessages(socket, type);
afterEach(async () => { await Promise.all(running.splice(0).map(app => app.close())); });

describe('guest room signaling', () => {
  it('creates a private room and relays offers and answers for multiple guests', async () => {
    const { base, ws } = await start({ maxGuests: 2 });
    const response = await fetch(`${base}/api/guest-rooms`, { method: 'POST' });
    expect(response.status).toBe(201);
    const room = await response.json();
    const host = new WebSocket(`${ws}?room=${room.roomCode}&role=host&token=${room.hostToken}`);
    expect((await nextMessage(host, 'host-ready')).maxGuests).toBe(2);
    host.send(JSON.stringify({ type: 'invite-guests' }));
    const invite = await nextMessage(host, 'guest-invite');
    const joinedPromise = nextMessages(host, 'guest-joined', 2);
    const guests = [new WebSocket(`${ws}?room=${room.roomCode}&role=guest&token=${invite.guestToken}`), new WebSocket(`${ws}?room=${room.roomCode}&role=guest&token=${invite.guestToken}`)];
    const [first, second] = await Promise.all(guests.map(socket => nextMessage(socket, 'guest-ready')));
    const joined = await joinedPromise;
    expect(new Set(joined.map(item => item.guestId)).size).toBe(2);
    host.send(JSON.stringify({ type: 'offer', guestId: first.guestId, sdp: 'v=0\r\n' }));
    expect((await nextMessage(guests[0], 'offer')).sdp).toBe('v=0\r\n');
    guests[1].send(JSON.stringify({ type: 'answer', sdp: 'v=0\r\n' }));
    expect((await nextMessage(host, 'answer')).guestId).toBe(second.guestId);
    guests.forEach(socket => socket.close()); host.close();
  });

  it('rejects a fifth guest and issues short-lived TURN credentials when configured', async () => {
    const fixedNow = () => 1_700_000_000_000;
    const { base, ws } = await start({ maxGuests: 4, now: fixedNow, turnUrls: ['turn:relay.example:3478'], turnSharedSecret: 'unit-test-secret' });
    const room = await (await fetch(`${base}/api/guest-rooms`, { method: 'POST' })).json();
    const host = new WebSocket(`${ws}?room=${room.roomCode}&role=host&token=${room.hostToken}`);
    const hostReady = await nextMessage(host, 'host-ready');
    expect(hostReady.iceServers[1].username).toBe(`1700003600:${room.roomCode}`);
    expect(hostReady.iceServers[1].credential).toBeTruthy();
    host.send(JSON.stringify({ type: 'invite-guests' })); const invite = await nextMessage(host, 'guest-invite');
    const guests = Array.from({ length: 4 }, () => new WebSocket(`${ws}?room=${room.roomCode}&role=guest&token=${invite.guestToken}`));
    await Promise.all(guests.map(socket => nextMessage(socket, 'guest-ready')));
    const fifth = new WebSocket(`${ws}?room=${room.roomCode}&role=guest&token=${invite.guestToken}`);
    expect((await nextMessage(fifth, 'error')).message).toMatch(/full/i);
    guests.forEach(socket => socket.close()); host.close();
  });
});

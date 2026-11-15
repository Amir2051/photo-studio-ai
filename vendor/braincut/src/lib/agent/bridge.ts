// the tab's end of the claude code bridge: one websocket to the braincut-mcp
// server on this machine, calls in, results out. nothing here leaves the
// machine; the socket only ever points at the loopback address

import { preferences } from '#lib/stores/preferences.ts';
import { addToast } from '#lib/stores/app.ts';
import { version } from '#lib/version.ts';
import {
  PROTOCOL_VERSION,
  type CallMessage,
  type ServerMessage,
  type TabMessage,
} from './protocol';
import { claude } from './state';
import { runTool } from './tools';

let socket: WebSocket | null = null;
let wanted = false;
let port = 0;
let attempts = 0;
let retry: ReturnType<typeof setTimeout> | null = null;
// set when another tab took the connection, so this one stops trying
let replaced = false;
let announced = false;
const inFlight = new Set<string>();

function send(message: TabMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function emit(name: string, data: unknown): void {
  send({ type: 'event', name, data });
}

function summarize(tool: string, result: unknown): string {
  const summary =
    result && typeof result === 'object' && 'summary' in result
      ? (result as { summary?: unknown }).summary
      : null;
  return typeof summary === 'string' && summary
    ? `${tool.replace(/_/g, ' ')}: ${summary}`
    : tool.replace(/_/g, ' ');
}

function requestUserApproval(request: { tool: string; summary: string; warning?: string }): Promise<boolean> {
  // Do not let a background tab, unsupported browser, or blocked dialog approve work.
  if (typeof window === 'undefined' || typeof document === 'undefined' || document.visibilityState !== 'visible') {
    return Promise.resolve(false);
  }
  if (typeof window.confirm !== 'function') return Promise.resolve(false);
  const detail = [
    `The connected local agent wants to: ${request.summary}.`,
    request.warning ?? 'This operation may change the open project.',
    '',
    'Allow this one operation?'
  ].join('\n\n');
  try {
    return Promise.resolve(window.confirm(detail));
  } catch {
    return Promise.resolve(false);
  }
}

function isCallMessage(value: unknown): value is CallMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return message.type === 'call'
    && typeof message.id === 'string' && message.id.length > 0 && message.id.length <= 128
    && typeof message.tool === 'string' && message.tool.length > 0 && message.tool.length <= 128
    && !!message.args && typeof message.args === 'object' && !Array.isArray(message.args);
}

async function handleCall(call: CallMessage): Promise<void> {
  if (inFlight.has(call.id)) {
    send({ type: 'result', id: call.id, ok: false, error: 'Duplicate in-flight call id' });
    return;
  }
  inFlight.add(call.id);
  claude.update((c) => ({
    ...c,
    calls: c.calls + 1,
    lastAction: `${call.tool.replace(/_/g, ' ')}…`,
  }));
  try {
    const result = await runTool(call.tool, call.args ?? {}, { emit, approve: requestUserApproval });
    send({ type: 'result', id: call.id, ok: true, result });
    claude.update((c) => ({ ...c, lastAction: summarize(call.tool, result) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send({ type: 'result', id: call.id, ok: false, error: message });
    claude.update((c) => ({
      ...c,
      lastAction: `${call.tool.replace(/_/g, ' ')} failed: ${message}`,
    }));
  } finally {
    inFlight.delete(call.id);
  }
}

function onMessage(event: MessageEvent): void {
  const raw = typeof event.data === 'string' ? event.data : '';
  if (!raw || raw.length > 128 * 1024) return;
  let message: ServerMessage;
  try {
    message = JSON.parse(raw) as ServerMessage;
  } catch {
    return;
  }
  if (!message || typeof message !== 'object') return;
  switch (message.type) {
    case 'welcome':
      if (message.protocol !== PROTOCOL_VERSION) {
        addToast('Local agent protocol mismatch. Connection refused.', 'error', 6000);
        preferences.update((p) => ({ ...p, claudeBridge: false }));
        return;
      }
      attempts = 0;
      claude.update((c) => ({ ...c, state: 'connected', port }));
      if (!announced) addToast('Local agent connected. Project changes require approval.', 'success');
      announced = true;
      break;
    case 'call':
      if (!isCallMessage(message)) {
        const id = (message as { id?: unknown }).id;
        if (typeof id === 'string' && id.length > 0 && id.length <= 128) {
          send({ type: 'result', id, ok: false, error: 'Invalid agent call payload' });
        }
        break;
      }
      if (JSON.stringify(message).length > 64 * 1024) {
        send({ type: 'result', id: message.id, ok: false, error: 'Agent call payload exceeds the 64 KB limit' });
        break;
      }
      void handleCall(message);
      break;
    case 'replaced':
      replaced = true;
      addToast('Another tab took over the local agent connection', 'info', 5000);
      break;
  }
}

function scheduleRetry(): void {
  if (retry) clearTimeout(retry);
  const delay = Math.min(5000, 500 * 2 ** attempts);
  attempts += 1;
  retry = setTimeout(() => {
    retry = null;
    if (wanted && !replaced) connect();
  }, delay);
}

function connect(): void {
  if (retry) {
    clearTimeout(retry);
    retry = null;
  }
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  replaced = false;
  claude.update((c) => ({ ...c, state: 'connecting', port }));
  let ws: WebSocket;
  try {
    ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  } catch {
    scheduleRetry();
    return;
  }
  socket = ws;
  ws.onopen = () => {
    send({
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      app: 'braincut',
      version,
      url: location.origin + location.pathname,
    });
  };
  ws.onmessage = onMessage;
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    if (wanted && !replaced) {
      claude.update((c) => ({ ...c, state: 'connecting' }));
      scheduleRetry();
    } else {
      claude.update((c) => ({ ...c, state: 'off' }));
    }
  };
}

function disconnect(): void {
  if (retry) {
    clearTimeout(retry);
    retry = null;
  }
  const open = socket?.readyState === WebSocket.OPEN;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  attempts = 0;
  announced = false;
  claude.update((c) => ({ ...c, state: 'off', lastAction: null }));
  if (open) addToast('Claude Code disconnected', 'info');
}

// The bridge only follows an explicit user preference. URL parameters never
// enable a localhost connection or change its port.
export function installClaudeBridge(): () => void {
  const unsubscribe = preferences.subscribe((p) => {
    if (p.claudeBridge) {
      if (!wanted || p.claudePort !== port) {
        wanted = true;
        port = p.claudePort;
        connect();
      }
    } else if (wanted) {
      wanted = false;
      disconnect();
    }
  });
  return () => {
    unsubscribe();
    wanted = false;
    disconnect();
  };
}

export function connectClaude(): void {
  preferences.update((p) => ({ ...p, claudeBridge: true }));
}

export function disconnectClaude(): void {
  preferences.update((p) => ({ ...p, claudeBridge: false }));
}

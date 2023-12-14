import { parse } from 'url';
import { nanoid } from 'nanoid';
import { type Server, WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { type ServerToClientMessage, type ClientToServerMessage, ClientMesasgeType, ServerMessageType } from '../index';

export const GlobalThisWSS = Symbol.for('sveltekit.wss');

export interface ExtendedWebSocket extends WebSocket {
  socketId: string;
  username: string;
  // userId: string;
}

export type ExtendedWebSocketServer = Server<ExtendedWebSocket> & {
  raining: boolean;
  objects: number[];
};

export type ExtendedGlobal = typeof globalThis & {
  [GlobalThisWSS]: ExtendedWebSocketServer;
};

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
  const pathname = req.url ? parse(req.url).pathname : null;
  if (pathname !== '/websocket') return;

  const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];

  wss.handleUpgrade(req, sock, head, (ws) => {
    console.log('[handleUpgrade] creating new connecttion');
    wss.emit('connection', ws, req);
  });
};

export const createWSSGlobalInstance = () => {
  const wss = new WebSocketServer({ noServer: true }) as ExtendedWebSocketServer;
  wss.raining = false;
  wss.objects = [];

  (globalThis as ExtendedGlobal)[GlobalThisWSS] = wss;

  wss.on('connection', (ws) => {
    ws.socketId = nanoid();
    ws.username = 'Anonymous ' + Math.floor(Math.random() * 1000);

    console.log(`[wss:global] client connected (${ws.socketId})`);

    ws.on('close', () => {
      console.log(`[wss:global] client disconnected (${ws.socketId})`);
      sendAll({
        type: ServerMessageType.REMOVE_USER,
        data: { socketId: ws.socketId }
      });
    });

    // ws.send(`Hello from SvelteKit ${new Date().toLocaleString()} (${ws.username})`);
    ws.send(
      JSON.stringify({
        type: ServerMessageType.USER_DATA,
        data: {
          socketId: ws.socketId,
          username: ws.username,
          raining: wss.raining,
          objects: wss.objects
        }
      })
    );
    sendAllOthers(ws, {
      type: ServerMessageType.ADD_USER,
      data: { socketId: ws.socketId, username: ws.username }
    });
    for (const client of wss.clients) {
      if (client !== ws) {
        ws.send(
          JSON.stringify({
            type: ServerMessageType.ADD_USER,
            data: { socketId: client.socketId, username: client.username }
          })
        );
      }
    }

    ws.on('message', (message: string) => {
      let messageData;
      try {
        messageData = JSON.parse(message);
      } catch (e) {
        //
      }
      if (!messageData) return;

      const { type, data } = messageData;
      if (type && data && typeof data === 'object' && ClientMesasgeType[type]) {
        handleMessage(ws, messageData);
      }
    });
  });

  return wss;
};

function sendAll(message: ServerToClientMessage) {
  const messageString = JSON.stringify(message);
  (globalThis as ExtendedGlobal)[GlobalThisWSS].clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

function sendAllOthers(from: ExtendedWebSocket, message: ServerToClientMessage) {
  const messageString = JSON.stringify(message);
  (globalThis as ExtendedGlobal)[GlobalThisWSS].clients.forEach((client) => {
    if (client !== from && client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

function handleMessage(from: ExtendedWebSocket, clientMessage: ClientToServerMessage) {
  const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
  if (!wss) return;

  switch (clientMessage.type) {
    case ClientMesasgeType.CHAT_MESSAGE: {
      const { message } = clientMessage.data;
      sendAll({
        type: ServerMessageType.CHAT_MESSAGE,
        data: { message, username: from.username }
      });
      break;
    }
    case ClientMesasgeType.CURSOR_POSITION: {
      const { x, y } = clientMessage.data;
      sendAllOthers(from, {
        type: ServerMessageType.CURSOR_POSITION,
        data: { socketId: from.socketId, x, y }
      });
      break;
    }
    case ClientMesasgeType.HELLO: {
      sendAll({
        type: ServerMessageType.HELLO,
        data: { username: from.username }
      });
      break;
    }
    case ClientMesasgeType.ADD_FLOATING_OBJECT: {
      const { id } = clientMessage.data;
      console.log('adding floating object', id);
      wss.objects.push(id);

      sendAllOthers(from, {
        type: ServerMessageType.ADD_FLOATING_OBJECT,
        data: { id }
      });
      break;
    }
    case ClientMesasgeType.TOGGLE_RAIN: {
      const { raining } = clientMessage.data;
      wss.raining = raining;
      sendAllOthers(from, {
        type: ServerMessageType.TOGGLE_RAIN,
        data: { raining }
      });
      break;
    }
  }
}

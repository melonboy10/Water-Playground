import { ServerMessageType, type ClientToServerMessage, type ServerToClientMessage } from '$lib';
import { raining, settingRain, socketId, starterObjects, username, users } from './scene';

export let webSocketEstablished = false;
export let ws: WebSocket;

// const listeners = new Map<ServerMessageType, ((data: Extract<ServerToClientMessage, { type: ServerMessageType }>['data']) => void)[]>();
const listeners = new Map<ServerMessageType, ((data: unknown) => void)[]>();

export function establishWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/websocket`);

  ws.addEventListener('open', (event) => {
    webSocketEstablished = true;
    console.log('[websocket] connection open', event);
  });
  ws.addEventListener('close', (event) => {
    console.log('[websocket] connection closed', event);
    // users = [];
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as ServerToClientMessage;
    listeners.get(message.type)?.forEach((callback) => callback(message.data));

    switch (message.type) {
      case ServerMessageType.USER_DATA: {
        const { socketId: thisSocket, username: thisUsername, raining: isRaining, objects } = message.data;
        socketId.set(thisSocket);
        username.set(thisUsername);
        raining.set(isRaining);
        console.log(objects);
        starterObjects.set(objects);
        break;
      }
      case ServerMessageType.HELLO:
        break;
      case ServerMessageType.CURSOR_POSITION: {
        const { socketId, x, y } = message.data;
        users.update((users) => {
          const user = users.find((user) => user.socketId === socketId);
          if (user) {
            user.cursorX = x;
            user.cursorY = y;
          }
          return users;
        });
        break;
      }
      case ServerMessageType.ADD_USER: {
        const { socketId, username } = message.data;
        users.update((users) => [...users, { socketId, username, cursorX: Infinity, cursorY: Infinity }]);
        break;
      }
      case ServerMessageType.REMOVE_USER: {
        const { socketId } = message.data;
        users.update((users) => users.filter((user) => user.socketId !== socketId));
        break;
      }
      case ServerMessageType.ADD_FLOATING_OBJECT: {
        // const { id } = message.data;
        // menuObjects[id].then(addFloatingObject);
        break;
      }
      case ServerMessageType.TOGGLE_RAIN: {
        const { raining: isRaining } = message.data;
        settingRain.set(true);
        raining.set(isRaining);
        break;
      }
    }
  });
}

// export function listenFor<T extends ServerToClientMessage>(eventType: T['type'], callback: (data: Extract<ServerToClientMessage, { type: ServerMessageType }>['data']) => void) {
export function listenFor<T extends ServerToClientMessage>(eventType: T['type'], callback: (data: unknown) => void) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, []);
  }
  listeners.get(eventType)!.push(callback);
}

export function send(message: ClientToServerMessage) {
  if (!webSocketEstablished) return;
  ws.send(JSON.stringify(message));
}

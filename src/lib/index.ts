export enum ClientMesasgeType {
  CHAT_MESSAGE,
  CURSOR_POSITION,
  ADD_FLOATING_OBJECT,
  TOGGLE_RAIN,
  HELLO
}

interface ClientMessage {
  type: ClientMesasgeType;
  data: object;
}

interface ClientChatMessage extends ClientMessage {
  type: ClientMesasgeType.CHAT_MESSAGE;
  data: {
    message: string;
  };
}

interface ClientCursorPosition extends ClientMessage {
  type: ClientMesasgeType.CURSOR_POSITION;
  data: {
    x: number;
    y: number;
  };
}

interface ClientHello extends ClientMessage {
  type: ClientMesasgeType.HELLO;
  data: {
    socketId: string;
    username: string;
  };
}

interface ClientAddFloatingObject extends ClientMessage {
  type: ClientMesasgeType.ADD_FLOATING_OBJECT;
  data: {
    id: number;
  };
}

interface ClientToggleRain extends ClientMessage {
  type: ClientMesasgeType.TOGGLE_RAIN;
  data: {
    raining: boolean;
  };
}

export type ClientToServerMessage = ClientChatMessage | ClientCursorPosition | ClientHello | ClientAddFloatingObject | ClientToggleRain;

export enum ServerMessageType {
  CHAT_MESSAGE,
  USER_DATA,
  ADD_USER,
  REMOVE_USER,
  CURSOR_POSITION,
  ADD_FLOATING_OBJECT,
  TOGGLE_RAIN,
  HELLO
}

interface ServerMessage {
  type: ServerMessageType;
  data: object;
}

interface ServerChatMessage extends ServerMessage {
  type: ServerMessageType.CHAT_MESSAGE;
  data: {
    message: string;
    username: string;
  };
}

interface ServerUserData extends ServerMessage {
  type: ServerMessageType.USER_DATA;
  data: {
    socketId: string;
    username: string;
    raining: boolean;
    objects: number[];
  };
}

interface ServerAddUser extends ServerMessage {
  type: ServerMessageType.ADD_USER;
  data: {
    socketId: string;
    username: string;
  };
}

interface ServerRemoveUser extends ServerMessage {
  type: ServerMessageType.REMOVE_USER;
  data: {
    socketId: string;
  };
}

interface ServerCursorPosition extends ServerMessage {
  type: ServerMessageType.CURSOR_POSITION;
  data: {
    socketId: string;
    x: number;
    y: number;
  };
}

interface ServerHello extends ServerMessage {
  type: ServerMessageType.HELLO;
  data: {
    username: string;
  };
}

interface ServerAddFloatingObject extends ServerMessage {
  type: ServerMessageType.ADD_FLOATING_OBJECT;
  data: {
    id: number;
  };
}

interface ServerToggleRain extends ServerMessage {
  type: ServerMessageType.TOGGLE_RAIN;
  data: {
    raining: boolean;
  };
}

export type ServerToClientMessage = ServerChatMessage | ServerUserData | ServerAddUser | ServerRemoveUser | ServerCursorPosition | ServerHello | ServerAddFloatingObject | ServerToggleRain;

export type User = {
  socketId: string;
  username: string;
  cursorX: number;
  cursorY: number;
};

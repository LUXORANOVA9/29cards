// services/game-service/src/socket/events.ts

export enum SocketEvents {
  // Client -> Server
  JOIN_TABLE = 'JOIN_TABLE',
  LEAVE_TABLE = 'LEAVE_TABLE',
  GAME_ACTION = 'GAME_ACTION',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  START_GAME = 'START_GAME',

  // Server -> Client
  TABLE_STATE = 'TABLE_STATE',
  GAME_UPDATE = 'GAME_UPDATE',
  ACTION_RESULT = 'ACTION_RESULT',
  ERROR = 'ERROR',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
}

export interface GameActionPayload {
  tableId: string;
  action: 'blind' | 'chaal' | 'plus_chaal' | 'pack' | 'side_show' | 'show';
  amount?: number;
  targetSeat?: number; // For side show
}

export interface JoinTablePayload {
  tableId: string;
  authToken: string;
}

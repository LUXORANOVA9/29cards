"use strict";
// services/game-service/src/socket/events.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvents = void 0;
var SocketEvents;
(function (SocketEvents) {
    // Client -> Server
    SocketEvents["JOIN_TABLE"] = "JOIN_TABLE";
    SocketEvents["LEAVE_TABLE"] = "LEAVE_TABLE";
    SocketEvents["GAME_ACTION"] = "GAME_ACTION";
    SocketEvents["CHAT_MESSAGE"] = "CHAT_MESSAGE";
    SocketEvents["START_GAME"] = "START_GAME";
    // Server -> Client
    SocketEvents["TABLE_STATE"] = "TABLE_STATE";
    SocketEvents["GAME_UPDATE"] = "GAME_UPDATE";
    SocketEvents["ACTION_RESULT"] = "ACTION_RESULT";
    SocketEvents["ERROR"] = "ERROR";
    SocketEvents["PLAYER_JOINED"] = "PLAYER_JOINED";
    SocketEvents["PLAYER_LEFT"] = "PLAYER_LEFT";
})(SocketEvents || (exports.SocketEvents = SocketEvents = {}));

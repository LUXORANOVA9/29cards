// Flutter Game Architecture - Production Ready
// apps/mobile/lib/core/game/game_engine.dart

import 'dart:convert';
import 'dart:developer';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Game States
enum GamePhase {
  waiting,
  dealing,
  betting,
  showdown,
  settlement,
  festival,
}

enum PlayerAction {
  blind,
  chaal,
  plusChaal,
  pack,
  show,
  sideShow,
}

enum CardSuit {
  hearts,
  spades,
  diamonds,
  clubs,
}

enum CardRank {
  two, three, four, five, six, seven, eight, nine,
}

class GameCard {
  final CardRank rank;
  final CardSuit suit;
  final String code;
  final String? display;

  GameCard({
    required this.rank,
    required this.suit,
    required this.code,
    this.display,
  });

  factory GameCard.fromJson(Map<String, dynamic> json) {
    return GameCard(
      rank: CardRank.values.firstWhere((r) => r.name == json['rank']),
      suit: CardSuit.values.firstWhere((s) => s.name == json['suit']),
      code: json['code'] ?? '',
      display: json['display'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rank': rank.name,
      'suit': suit.name,
      'code': code,
      'display': display,
    };
  }

  @override
  String toString() => code;
}

// Game Models
class PlayerInfo {
  final String id;
  final String displayName;
  final String? avatarUrl;
  final int seatNumber;
  final double balance;
  final bool isActive;
  final bool isHost;
  final List<GameCard> cards;
  final bool hasSeenCards;
  final double currentBet;
  final double totalBet;
  final bool isFolded;

  const PlayerInfo({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    required this.seatNumber,
    required this.balance,
    required this.isActive,
    this.isHost = false,
    this.cards = const [],
    this.hasSeenCards = false,
    this.currentBet = 0.0,
    this.totalBet = 0.0,
    this.isFolded = false,
  });

  factory PlayerInfo.fromJson(Map<String, dynamic> json) {
    return PlayerInfo(
      id: json['id'],
      displayName: json['display_name'],
      avatarUrl: json['avatar_url'],
      seatNumber: json['seat_number'],
      balance: (json['balance'] ?? 0).toDouble(),
      isActive: json['is_active'],
      isHost: json['is_host'] ?? false,
      cards: (json['cards'] as List<dynamic>?)
              ?.map((c) => GameCard.fromJson(c))
              .toList() ?? [],
      hasSeenCards: json['has_seen_cards'] ?? false,
      currentBet: (json['current_bet'] ?? 0).toDouble(),
      totalBet: (json['total_bet'] ?? 0).toDouble(),
      isFolded: json['is_folded'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'seat_number': seatNumber,
      'balance': balance,
      'is_active': isActive,
      'is_host': isHost,
      'cards': cards.map((c) => c.toJson()).toList(),
      'has_seen_cards': hasSeenCards,
      'current_bet': currentBet,
      'total_bet': totalBet,
      'is_folded': isFolded,
    };
  }
}

class GameState {
  final String tableId;
  final GamePhase phase;
  final String roundId;
  final double pot;
  final double currentBet;
  final int currentTurn;
  final List<PlayerInfo> players;
  final int bettingRound;
  final FestivalState? festivalState;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const GameState({
    required this.tableId,
    required this.phase,
    required this.roundId,
    required this.pot,
    required this.currentBet,
    required this.currentTurn,
    required this.players,
    this.bettingRound = 1,
    this.festivalState,
    this.createdAt,
    this.updatedAt,
  });

  factory GameState.fromJson(Map<String, dynamic> json) {
    return GameState(
      tableId: json['table_id'],
      phase: GamePhase.values.firstWhere((p) => p.name == json['phase']),
      roundId: json['round_id'],
      pot: (json['pot'] ?? 0).toDouble(),
      currentBet: (json['current_bet'] ?? 0).toDouble(),
      currentTurn: json['current_turn'],
      players: (json['players'] as List<dynamic>?)
              ?.map((p) => PlayerInfo.fromJson(p))
              .toList() ?? [],
      bettingRound: json['betting_round'] ?? 1,
      festivalState: json['festival_state'] != null 
          ? FestivalState.fromJson(json['festival_state']) 
          : null,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'table_id': tableId,
      'phase': phase.name,
      'round_id': roundId,
      'pot': pot,
      'current_bet': currentBet,
      'current_turn': currentTurn,
      'players': players.map((p) => p.toJson()).toList(),
      'betting_round': bettingRound,
      'festival_state': festivalState?.toJson(),
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}

class FestivalState {
  final bool isActive;
  final String? triggerTrailRank;
  final int currentPhase;
  final int? jokerRank;
  final List<int> phasesRemaining;

  const FestivalState({
    required this.isActive,
    this.triggerTrailRank,
    required this.currentPhase,
    this.jokerRank,
    this.phasesRemaining = const [],
  });

  factory FestivalState.fromJson(Map<String, dynamic> json) {
    return FestivalState(
      isActive: json['is_active'],
      triggerTrailRank: json['trigger_trail_rank'],
      currentPhase: json['current_phase'] ?? 0,
      jokerRank: json['joker_rank'],
      phasesRemaining: (json['phases_remaining'] as List<dynamic>?)
              ?.map((p) => p as int)
              .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'is_active': isActive,
      'trigger_trail_rank': triggerTrailRank,
      'current_phase': currentPhase,
      'joker_rank': jokerRank,
      'phases_remaining': phasesRemaining,
    };
  }
}

// Game Engine Core Class
class GameEngineService {
  late SocketIO _socket;
  late final Function(GameState) _onStateUpdate;
  late final Function(ChatMessage) _onChatMessage;
  late final Function(Map<String, dynamic>) _onError;
  
  String? _tableId;
  String? _playerId;
  GameState? _currentState;
  PlayerInfo? _currentPlayer;

  GameEngineService({
    required SocketIO socket,
    required Function(GameState) onStateUpdate,
    required Function(ChatMessage) onChatMessage,
    required Function(Map<String, dynamic>) onError,
  }) : _socket = socket,
       _onStateUpdate = onStateUpdate,
       _onChatMessage = onChatMessage,
       _onError = onError;

  // Connection Management
  Future<void> connect(String gameServerUrl, String token) async {
    try {
      _socket = IO.io(gameServerUrl, {
        'transports': ['websocket'],
        'auth': {
          'token': token,
        },
        'autoConnect': true,
        'reconnection': true,
        'reconnectionAttempts': 5,
        'reconnectionDelay': 2000,
        'reconnectionDelayMax': 5000,
      });

      _socket.on('connect', (_) {
        developer.log('Connected to game server');
      });

      _socket.on('game-state', _handleGameState);
      _socket.on('player-update', _handlePlayerUpdate);
      _socket.on('round-complete', _handleRoundComplete);
      _socket.on('chat-message', _handleChatMessage);
      _socket.on('error', _handleError);

      _socket.on('disconnect', (_) {
        developer.log('Disconnected from game server');
      });
    } catch (e) {
      _onError({
        'type': 'connection_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
    }
  }

  // Table Management
  Future<bool> joinTable(String tableId, int seatNumber) async {
    try {
      _tableId = tableId;
      _socket.emit('join-table', {
        'tableId': tableId,
        'seatNumber': seatNumber,
      });

      return true;
    } catch (e) {
      _onError({
        'type': 'join_table_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }
  }

  Future<bool> leaveTable() async {
    try {
      _socket.emit('leave-table', {
        'tableId': _tableId,
      });

      _tableId = null;
      _playerId = null;
      _currentState = null;
      _currentPlayer = null;

      return true;
    } catch (e) {
      _onError({
        'type': 'leave_table_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }
  }

  // Game Actions
  Future<bool> performAction(PlayerAction action, {double amount = 0.0}) async {
    if (_currentState == null) {
      _onError({
        'type': 'no_active_game',
        'message': 'No active game to perform action on',
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }

    try {
      _socket.emit('game-action', {
        'action': _actionToString(action),
        'amount': amount,
      });

      return true;
    } catch (e) {
      _onError({
        'type': 'action_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }
  }

  Future<bool> startGame() async {
    try {
      _socket.emit('start-game', {
        'tableId': _tableId,
      });

      return true;
    } catch (e) {
      _onError({
        'type': 'start_game_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }
  }

  Future<bool> seeCards() async {
    if (_currentPlayer == null) {
      return false;
    }

    try {
      _socket.emit('see-cards', {
        'tableId': _tableId,
      });

      return true;
    } catch (e) {
      _onError({
        'type': 'see_cards_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }
  }

  // Chat Functionality
  Future<bool> sendChatMessage(String message) async {
    if (_tableId == null) {
      return false;
    }

    try {
      _socket.emit('chat-message', {
        'tableId': _tableId,
        'message': message,
      });

      return true;
    } catch (e) {
      _onError({
        'type': 'chat_error',
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      return false;
    }
  }

  // WebSocket Event Handlers
  void _handleGameState(dynamic data) {
    try {
      final gameState = GameState.fromJson(data);
      _currentState = gameState;
      
      // Update current player info
      if (_playerId != null) {
        final currentPlayer = gameState.players.firstWhere(
          (p) => p.id == _playerId,
          orElse: () => PlayerInfo(
            id: _playerId!,
            displayName: '',
            seatNumber: 0,
            balance: 0.0,
            isActive: false,
            cards: [],
            hasSeenCards: false,
            currentBet: 0.0,
            totalBet: 0.0,
            isFolded: false,
          ),
        );
        
        _currentPlayer = currentPlayer;
      }

      _onStateUpdate(gameState);
    } catch (e) {
      developer.log('Error handling game state: $e');
    }
  }

  void _handlePlayerUpdate(dynamic data) {
    try {
      final playerData = data as Map<String, dynamic>;
      final playerId = playerData['player_id'] as String;
      
      if (_playerId == _currentPlayer?.id) {
        final updatedPlayer = PlayerInfo.fromJson(playerData);
        _currentPlayer = updatedPlayer;
        _onStateUpdate(_currentState!);
      }
    } catch (e) {
      developer.log('Error handling player update: $e');
    }
  }

  void _handleRoundComplete(dynamic data) {
    try {
      developer.log('Round completed: $data');
      // Handle round completion animations
      // Update UI with winner information
    } catch (e) {
      developer.log('Error handling round complete: $e');
    }
  }

  void _handleChatMessage(dynamic data) {
    try {
      final chatData = data as Map<String, dynamic>;
      final message = ChatMessage.fromJson(chatData);
      _onChatMessage(message);
    } catch (e) {
      developer.log('Error handling chat message: $e');
    }
  }

  void _handleError(dynamic data) {
    try {
      final errorData = data as Map<String, dynamic>;
      _onError(errorData);
    } catch (e) {
      developer.log('Error handling error: $e');
    }
  }

  String _actionToString(PlayerAction action) {
    switch (action) {
      case PlayerAction.blind:
        return 'BLIND';
      case PlayerAction.chaal:
        return 'CHAAL';
      case PlayerAction.plusChaal:
        return 'PLUS_CHAAL';
      case PlayerAction.pack:
        return 'PACK';
      case PlayerAction.show:
        return 'SHOW';
      case PlayerAction.sideShow:
        return 'SIDE_SHOW';
      default:
        return 'UNKNOWN';
    }
  }

  // Connection State
  bool get isConnected => _socket.connected;
  bool get isGameActive => _currentState != null && _currentState!.phase != GamePhase.waiting;
  String? get currentTableId => _tableId;
  PlayerInfo? get currentPlayer => _currentPlayer;
  GameState? get currentState => _currentState;
}

// Chat Message Model
class ChatMessage {
  final String id;
  final String playerId;
  final String displayName;
  final String message;
  final DateTime timestamp;
  final String? avatarUrl;

  const ChatMessage({
    required this.id,
    required this.playerId,
    required this.displayName,
    required this.message,
    required this.timestamp,
    this.avatarUrl,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'],
      playerId: json['player_id'],
      displayName: json['display_name'],
      message: json['message'],
      timestamp: DateTime.parse(json['timestamp']),
      avatarUrl: json['avatar_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'player_id': playerId,
      'display_name': displayName,
      'message': message,
      'timestamp': timestamp.toIso8601String(),
      'avatar_url': avatarUrl,
    };
  }
}
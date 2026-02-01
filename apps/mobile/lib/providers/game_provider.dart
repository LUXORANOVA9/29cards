import 'package:flutter/material.dart';
import '../services/socket_service.dart';

class GameProvider with ChangeNotifier {
  final SocketService _socketService;
  
  bool _isConnected = false;
  Map<String, dynamic>? _gameState;

  bool get isConnected => _isConnected;
  Map<String, dynamic>? get gameState => _gameState;

  GameProvider(this._socketService);

  void connect() async {
    await _socketService.initSocket();
    
    _socketService.socket.onConnect((_) {
      _isConnected = true;
      notifyListeners();
    });

    _socketService.socket.onDisconnect((_) {
      _isConnected = false;
      notifyListeners();
    });

    _socketService.socket.on('GAME_UPDATE', (data) {
      _gameState = data;
      notifyListeners();
    });
  }

  void joinTable(String tableId) {
    _socketService.socket.emit('JOIN_TABLE', {'tableId': tableId});
  }
  
  void params(String action, int amount) {
    _socketService.socket.emit('PLAYER_MOVE', {
      'action': action,
      'amount': amount
    });
  }
}

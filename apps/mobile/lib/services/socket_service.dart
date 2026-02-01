import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SocketService {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
  static const String _url = 'http://10.0.2.2:8080';
  
  late IO.Socket _socket;
  final _storage = const FlutterSecureStorage();

  IO.Socket get socket => _socket;

  Future<void> initSocket() async {
    final token = await _storage.read(key: 'jwt_token');
    
    _socket = IO.io(_url, IO.OptionBuilder()
      .setTransports(['websocket'])
      .setExtraHeaders({'Authorization': 'Bearer $token'})
      .build()
    );

    _socket.onConnect((_) {
      print('Connected to Game Server');
    });

    _socket.onDisconnect((_) {
      print('Disconnected from Game Server');
    });
    
    _socket.connect();
  }

  void disconnect() {
    _socket.disconnect();
  }
}

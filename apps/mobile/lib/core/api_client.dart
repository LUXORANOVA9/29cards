import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import 'config.dart';

class ApiClient {
  late WebSocketChannel _channel;
  Function(dynamic) onMessage;
  Function(String) onStatus;

  ApiClient({required this.onMessage, required this.onStatus});

  void connect() {
    try {
      final uri = Uri.parse('wss://${Config.apiHost}');
      _channel = WebSocketChannel.connect(uri);
      _channel.stream.listen(
        (message) {
          onMessage(message);
        },
        onDone: () {
          onStatus('Disconnected');
        },
        onError: (error) {
          onStatus('Error: $error');
        },
      );
      onStatus('Connected');
    } catch (e) {
      onStatus('Error connecting: $e');
    }
  }

  void send(String message) {
    _channel.sink.add(message);
  }

  void disconnect() {
    _channel.sink.close(status.goingAway);
  }
}

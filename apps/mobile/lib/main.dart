import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'services/socket_service.dart';
import 'providers/auth_provider.dart';
import 'providers/game_provider.dart';

void main() {
  runApp(const SindhiPattaApp());
}

class SindhiPattaApp extends StatelessWidget {
  const SindhiPattaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final apiService = ApiService();
    final socketService = SocketService();

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(apiService)),
        ChangeNotifierProvider(create: (_) => GameProvider(socketService)),
      ],
      child: MaterialApp(
        title: 'Sindhi Patta (29 Cards)',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          useMaterial3: true,
        ),
        home: const Scaffold(
          body: Center(
            child: Text('Sindhi Patta Mobile - Ready'),
          ),
        ),
      ),
    );
  }
}

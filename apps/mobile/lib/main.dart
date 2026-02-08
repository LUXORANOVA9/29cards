import 'package:flutter/material.dart';
import 'core/api_client.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '29Cards Mobile',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  // ignore: library_private_types_in_public_api
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  late ApiClient _apiClient;
  String _status = 'Disconnected';
  final List<String> _messages = [];

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient(
      onMessage: (message) {
        setState(() {
          _messages.add(message);
        });
      },
      onStatus: (status) {
        setState(() {
          _status = status;
        });
      },
    );
    _apiClient.connect();
  }

  @override
  void dispose() {
    _apiClient.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('29Cards Mobile'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'Status: $_status',
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  return Text(_messages[index]);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _api;
  final _storage = const FlutterSecureStorage();
  
  bool _isAuthenticated = false;
  String? _userId;
  String? _token;

  bool get isAuthenticated => _isAuthenticated;
  String? get userId => _userId;

  AuthProvider(this._api);

  Future<void> login(String phone, String otp) async {
    try {
      final response = await _api.post('/auth/login', {
        'phone': phone,
        'otp': otp,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        _token = response.data['token'];
        _userId = response.data['user']['id'];
        _isAuthenticated = true;
        
        await _storage.write(key: 'jwt_token', value: _token);
        notifyListeners();
      }
    } catch (e) {
      print('Login Error: $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    _token = null;
    _userId = null;
    _isAuthenticated = false;
    await _storage.delete(key: 'jwt_token');
    notifyListeners();
  }
}

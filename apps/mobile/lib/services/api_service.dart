import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
  static const String baseUrl = 'http://10.0.2.2:8080/api/v1';
  
  final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
  ));
  
  final _storage = const FlutterSecureStorage();

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  Future<Response> post(String path, dynamic data) async {
    return await _dio.post(path, data: data);
  }

  Future<Response> get(String path) async {
    return await _dio.get(path);
  }
}

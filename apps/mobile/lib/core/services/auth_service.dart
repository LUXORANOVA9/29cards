// Services Architecture
// lib/core/services/auth_service.dart

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  final Dio _dio;
  final SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage;

  AuthService({
    required Dio dio,
    required SharedPreferences prefs,
    required FlutterSecureStorage secureStorage,
  }) : _dio = dio,
       _prefs = prefs,
       _secureStorage = secureStorage;

  // Authentication State
  User? _currentUser;
  String? _accessToken;
  String? _refreshToken;

  User? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null && _accessToken != null;

  // Initialize Service
  Future<void> initialize() async {
    await _loadTokens();
    if (_accessToken != null) {
      await _validateAndRefreshToken();
    }
  }

  // Load stored tokens
  Future<void> _loadTokens() async {
    _accessToken = await _secureStorage.read(key: 'access_token');
    _refreshToken = await _secureStorage.read(key: 'refresh_token');
    
    // Load user data
    final userJson = await _prefs.getString('current_user');
    if (userJson != null) {
      _currentUser = User.fromJson(userJson!);
    }
  }

  // Save tokens
  Future<void> _saveTokens({
    required String accessToken,
    required String refreshToken,
    User? user,
  }) async {
    await _secureStorage.write(key: 'access_token', value: accessToken);
    await _secureStorage.write(key: 'refresh_token', value: refreshToken);
    
    if (user != null) {
      await _prefs.setString('current_user', user.toJson());
      _currentUser = user;
    }
  }

  // Clear all tokens and user data
  Future<void> _clearAll() async {
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
    await _prefs.remove('current_user');
    _currentUser = null;
    _accessToken = null;
    _refreshToken = null;
  }

  // Login with Email
  Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data;
      
      if (response.statusCode == 200) {
        final tokens = data['tokens'];
        final user = User.fromJson(data['user']);
        
        await _saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          user: user,
        );
        
        // Configure Dio with token
        _dio.options.headers['Authorization'] = 'Bearer ${tokens['access_token']}';
        
        return AuthResult.success(user: user);
      } else {
        return AuthResult.error(
          message: data['error'] ?? 'Login failed',
          code: data['code'],
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }

  // Login with Phone
  Future<AuthResult> signInWithPhone({
    required String phone,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {
          'phone': phone,
          'password': password,
        },
      );

      final data = response.data;
      
      if (response.statusCode == 200) {
        final tokens = data['tokens'];
        final user = User.fromJson(data['user']);
        
        await _saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          user: user,
        );
        
        _dio.options.headers['Authorization'] = 'Bearer ${tokens['access_token']}';
        
        return AuthResult.success(user: user);
      } else {
        return AuthResult.error(
          message: data['error'] ?? 'Login failed',
          code: data['code'],
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }

  // Send OTP
  Future<AuthResult> sendOtp(String phone) async {
    try {
      final response = await _dio.post(
        '/auth/send-otp',
        data: {'phone': phone},
      );

      final data = response.data;
      
      if (response.statusCode == 200) {
        return AuthResult.success(
          message: 'OTP sent successfully',
        );
      } else {
        return AuthResult.error(
          message: data['error'] ?? 'Failed to send OTP',
          code: data['code'],
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }

  // Verify OTP
  Future<AuthResult> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/verify-otp',
        data: {
          'phone': phone,
          'otp': otp,
        },
      );

      final data = response.data;
      
      if (response.statusCode == 200) {
        final tokens = data['tokens'];
        final user = User.fromJson(data['user']);
        
        await _saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          user: user,
        );
        
        _dio.options.headers['Authorization'] = 'Bearer ${tokens['access_token']}';
        
        return AuthResult.success(user: user);
      } else {
        return AuthResult.error(
          message: data['error'] ?? 'OTP verification failed',
          code: data['code'],
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }

  // Register User
  Future<AuthResult> register({
    required String email,
    String? phone,
    required String password,
    String? panelId,
    String? brokerId,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/register',
        data: {
          'email': email,
          if (phone != null) 'phone': phone,
          'password': password,
          if (panelId != null) 'panelId': panelId,
          if (brokerId != null) 'brokerId': brokerId,
        },
      );

      final data = response.data;
      
      if (response.statusCode == 201) {
        final tokens = data['tokens'];
        final user = User.fromJson(data['user']);
        
        await _saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          user: user,
        );
        
        _dio.options.headers['Authorization'] = 'Bearer ${tokens['access_token']}';
        
        return AuthResult.success(user: user);
      } else {
        return AuthResult.error(
          message: data['error'] ?? 'Registration failed',
          code: data['code'],
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      if (_accessToken != null) {
        await _dio.post('/auth/logout');
      }
    } catch (e) {
      // Continue with local logout even if network fails
    } finally {
      await _clearAll();
      _dio.options.headers.remove('Authorization');
    }
  }

  // Refresh Access Token
  Future<AuthResult> _refreshAccessToken() async {
    if (_refreshToken == null) {
      return const AuthResult.error(
        message: 'No refresh token available',
        code: 'NO_REFRESH_TOKEN',
      );
    }

    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refresh_token': _refreshToken},
      );

      final data = response.data;
      
      if (response.statusCode == 200) {
        final tokens = data['tokens'];
        _accessToken = tokens['access_token'];
        _refreshToken = tokens['refresh_token'];
        
        await _secureStorage.write(key: 'access_token', value: _accessToken!);
        await _secureStorage.write(key: 'refresh_token', value: _refreshToken!);
        
        _dio.options.headers['Authorization'] = 'Bearer $_accessToken';
        
        return const AuthResult.success(
          message: 'Token refreshed successfully',
        );
      } else {
        return AuthResult.error(
          message: data['error'] ?? 'Token refresh failed',
          code: data['code'],
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }

  // Validate and refresh token if needed
  Future<void> _validateAndRefreshToken() async {
    // This would validate JWT expiration and refresh if needed
    // For now, just check if token exists
    if (_accessToken == null) {
      await logout();
    }
  }

  // Get Dio error message
  String _getDioErrorMessage(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout) {
      return 'Connection timeout';
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return 'Receive timeout';
    } else if (e.type == DioExceptionType.badResponse) {
      return 'Server error: ${e.response?.statusCode}';
    } else if (e.type == DioExceptionType.cancel) {
      return 'Request cancelled';
    } else if (e.type == DioExceptionType.unknown) {
      return 'Network error: ${e.message}';
    } else {
      return 'Unknown network error';
    }
  }

  // Update user profile
  Future<AuthResult> updateProfile({
    required String displayName,
    String? avatarUrl,
  }) async {
    try {
      final response = await _dio.put(
        '/users/profile',
        data: {
          'display_name': displayName,
          if (avatarUrl != null) 'avatar_url': avatarUrl,
        },
      );

      if (response.statusCode == 200) {
        // Update local user data
        if (_currentUser != null) {
          final updatedUser = _currentUser!.copyWith(
            displayName: displayName,
            avatarUrl: avatarUrl,
          );
          await _prefs.setString('current_user', updatedUser.toJson());
          _currentUser = updatedUser;
        }
        
        return const AuthResult.success(
          message: 'Profile updated successfully',
        );
      } else {
        return AuthResult.error(
          message: 'Failed to update profile',
          code: 'PROFILE_UPDATE_FAILED',
        );
      }
    } on DioException catch (e) {
      return AuthResult.error(
        message: _getDioErrorMessage(e),
        code: 'NETWORK_ERROR',
      );
    } catch (e) {
      return AuthResult.error(
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      );
    }
  }
}

// User Model
class User {
  final String id;
  final String email;
  final String? phone;
  final String role;
  final String displayName;
  final String? avatarUrl;
  final String? panelId;
  final String? brokerId;
  final DateTime? lastLoginAt;
  final bool emailVerified;
  final bool phoneVerified;
  final UserStatus status;

  const User({
    required this.id,
    required this.email,
    this.phone,
    required this.role,
    required this.displayName,
    this.avatarUrl,
    this.panelId,
    this.brokerId,
    this.lastLoginAt,
    required this.emailVerified,
    required this.phoneVerified,
    required this.status,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      phone: json['phone'],
      role: json['role'],
      displayName: json['display_name'],
      avatarUrl: json['avatar_url'],
      panelId: json['panel_id'],
      brokerId: json['broker_id'],
      lastLoginAt: json['last_login_at'] != null 
          ? DateTime.parse(json['last_login_at']) 
          : null,
      emailVerified: json['email_verified'] ?? false,
      phoneVerified: json['phone_verified'] ?? false,
      status: UserStatus.values.firstWhere(
        (e) => e.toString() == json['status'],
        orElse: () => UserStatus.active,
      ),
    );
  }

  User copyWith({
    String? displayName,
    String? avatarUrl,
  }) {
    return User(
      id: id,
      email: email,
      phone: phone,
      role: role,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      panelId: panelId,
      brokerId: brokerId,
      lastLoginAt: lastLoginAt,
      emailVerified: emailVerified,
      phoneVerified: phoneVerified,
      status: status,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'role': role,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'panel_id': panelId,
      'broker_id': brokerId,
      'last_login_at': lastLoginAt?.toIso8601String(),
      'email_verified': emailVerified,
      'phone_verified': phoneVerified,
      'status': status.toString(),
    };
  }
}

enum UserStatus {
  active,
  suspended,
  banned,
}

// Auth Result Model
class AuthResult {
  final bool success;
  final User? user;
  final String? message;
  final String? code;

  const AuthResult.success({
    this.user,
    this.message,
  }) : success = true;

  const AuthResult.error({
    required this.message,
    this.code,
  }) : success = false;

  @override
  String toString() {
    if (success) {
      return 'AuthResult.success(user: $user)';
    } else {
      return 'AuthResult.error(message: $message, code: $code)';
    }
  }
}
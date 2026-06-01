import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('auth_user'),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token is still valid
        authAPI.me().then(freshUser => {
          setUser(freshUser);
          AsyncStorage.setItem('auth_user', JSON.stringify(freshUser));
        }).catch(() => {
          // Token expired
          clearAuth();
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await authAPI.login(email, password);
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await clearAuth();
  }

  async function clearAuth() {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    setToken(null);
    setUser(null);
  }

  function isAdmin() {
    return user?.role === 'admin' || user?.role === 'superadmin';
  }

  function isSuperAdmin() {
    return user?.role === 'superadmin';
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

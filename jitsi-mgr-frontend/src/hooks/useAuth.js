// 认证 Hook
import { useState, useEffect, createContext, useContext } from 'react';
import { getToken, getUser, getRefreshToken } from '../utils/storage';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的用户信息
    const token = getToken();
    const storedUser = getUser();
    
    if (token && storedUser) {
      setUser(storedUser);
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const user = await authService.login(username, password);
    setUser(user);
    return user;
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    await authService.logout(refreshToken);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!user && !!getToken();
  };

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'superadmin');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

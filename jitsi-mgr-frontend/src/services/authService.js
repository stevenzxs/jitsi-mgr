// 认证服务
import api from '../utils/request';
import { setToken, setRefreshToken, setUser, clearStorage } from '../utils/storage';

// 用户登录
export const login = async (username, password, deviceType = 'web') => {
  const response = await api.post('/auth/login', {
    username,
    password,
    deviceType,
  });
  
  if (response.success && response.data) {
    const { token, refreshToken, user } = response.data;
    setToken(token);
    setRefreshToken(refreshToken);
    setUser(user);
    return user;
  }
  
  throw new Error('登录失败');
};

// 刷新 Token
export const refreshToken = async (refreshTokenValue) => {
  const response = await api.post('/auth/refresh', {
    refreshToken: refreshTokenValue,
  });
  
  if (response.success && response.data) {
    const { token } = response.data;
    setToken(token);
    return token;
  }
  
  throw new Error('Token 刷新失败');
};

// 退出登录
export const logout = async (refreshTokenValue) => {
  try {
    await api.post('/auth/logout', {
      refreshToken: refreshTokenValue,
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearStorage();
  }
};

// 获取 JWKS
export const getJwks = async () => {
  const response = await api.get('/auth/jwks');
  return response;
};

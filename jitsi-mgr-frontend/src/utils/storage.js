// LocalStorage 管理
const TOKEN_KEY = 'jitsi_mgr_token';
const REFRESH_TOKEN_KEY = 'jitsi_mgr_refresh_token';
const USER_KEY = 'jitsi_mgr_user';

// Token 管理
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Refresh Token 管理
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = () => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// 用户信息管理
export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

// 清除所有存储
export const clearStorage = () => {
  removeToken();
  removeRefreshToken();
  removeUser();
};

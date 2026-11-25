// API 请求工具
import axios from 'axios';
import { getToken, removeToken } from './storage';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/mgr/v1';

// 创建 Axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 Token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => {
    return response.data; // 直接返回 data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Token 过期或无效
      if (status === 401) {
        removeToken();
        window.location.href = '/login';
        return Promise.reject(new Error('认证已过期，请重新登录'));
      }
      
      // 权限不足
      if (status === 403) {
        return Promise.reject(new Error('权限不足'));
      }
      
      // 业务错误
      if (data && data.error) {
        return Promise.reject(new Error(data.error.message || '请求失败'));
      }
      
      return Promise.reject(new Error('请求失败'));
    } else if (error.request) {
      return Promise.reject(new Error('网络错误，请检查网络连接'));
    } else {
      return Promise.reject(error);
    }
  }
);

export default api;

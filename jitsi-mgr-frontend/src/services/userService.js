// 用户服务
import api from '../utils/request';

// 获取当前用户信息
export const getCurrentUser = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

// 更新用户信息
export const updateUser = async (data) => {
  const response = await api.put('/users/me', data);
  return response.data;
};

// 修改密码
export const changePassword = async (oldPassword, newPassword) => {
  const response = await api.post('/users/me/change-password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};

// 获取会话列表
export const getSessions = async () => {
  const response = await api.get('/users/me/sessions');
  return response.data;
};

// 删除会话
export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/users/me/sessions/${sessionId}`);
  return response.data;
};

// 管理员服务
import api from '../utils/request';

// 获取注册请求列表
export const getRegistrationRequests = async () => {
  const response = await api.get('/admin/registration-requests');
  return response.data;
};

// 批准注册
export const approveRegistration = async (id) => {
  const response = await api.post(`/admin/registration-requests/${id}/approve`);
  return response.data;
};

// 拒绝注册
export const rejectRegistration = async (id, reason) => {
  const response = await api.post(`/admin/registration-requests/${id}/reject`, {
    reason,
  });
  return response.data;
};

// 获取用户列表（分页）
export const getUsers = async (page = 0, size = 20, sort = 'id', direction = 'DESC') => {
  const response = await api.get('/admin/users', {
    params: { page, size, sort, direction },
  });
  return response.data;
};

// 获取用户详情
export const getUserDetails = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

// 禁用用户
export const disableUser = async (id) => {
  const response = await api.put(`/admin/users/${id}/disable`);
  return response.data;
};

// 启用用户
export const enableUser = async (id) => {
  const response = await api.put(`/admin/users/${id}/enable`);
  return response.data;
};

// 获取审计日志（分页）
export const getAuditLogs = async (page = 0, size = 50) => {
  const response = await api.get('/admin/audit-logs', {
    params: { page, size },
  });
  return response.data;
};

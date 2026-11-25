// 用户管理页面
import { useState, useEffect } from 'react';
import { getUsers, disableUser, enableUser } from '../services/adminService';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers(page, 20);
      setUsers(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      toast.error('加载用户列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const handleToggleStatus = async (user) => {
    const action = user.status === 'active' ? '禁用' : '启用';
    
    if (!window.confirm(`确定要${action}用户 ${user.username} 吗？`)) {
      return;
    }

    try {
      if (user.status === 'active') {
        await disableUser(user.id);
        toast.success('用户已禁用');
      } else {
        await enableUser(user.id);
        toast.success('用户已启用');
      }
      loadUsers();
    } catch (error) {
      toast.error(error.message || `${action}失败`);
    }
  };

  const getRoleName = (role) => {
    const roles = {
      'user': '普通用户',
      'admin': '管理员',
      'superadmin': '超级管理员',
    };
    return roles[role] || role;
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">正常</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">已禁用</span>;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            共 {users.length} 个用户
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.username}
                      </div>
                      {user.email && (
                        <div className="text-xs text-gray-400">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {getRoleName(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`${
                        user.status === 'active'
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      } font-medium`}
                    >
                      {user.status === 'active' ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn btn-secondary"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn btn-secondary ml-3"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  第 <span className="font-medium">{page + 1}</span> 页，共{' '}
                  <span className="font-medium">{totalPages}</span> 页
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="btn btn-secondary"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="btn btn-secondary ml-3"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

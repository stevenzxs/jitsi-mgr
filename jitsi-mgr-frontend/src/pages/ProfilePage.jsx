// 个人设置页面
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser, updateUser, changePassword, getSessions, deleteSession } from '../services/userService';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, sessionsData] = await Promise.all([
        getCurrentUser(),
        getSessions(),
      ]);
      setUser(userData);
      setProfileForm({
        displayName: userData.displayName || '',
        email: userData.email || '',
      });
      setSessions(sessionsData || []);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await updateUser(profileForm);
      toast.success('个人信息已更新');
      loadData();
    } catch (error) {
      toast.error(error.message || '更新失败');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('新密码至少需要8个字符');
      return;
    }
    
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      toast.success('密码已修改');
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error.message || '修改密码失败');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('确定要删除此会话吗？')) return;
    
    try {
      await deleteSession(sessionId);
      toast.success('会话已删除');
      loadData();
    } catch (error) {
      toast.error(error.message || '删除失败');
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>
        <p className="mt-1 text-sm text-gray-600">管理您的账户信息</p>
      </div>

      {/* 个人信息 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">个人信息</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="label">用户名</label>
            <input
              type="text"
              className="input bg-gray-50"
              value={user?.username || ''}
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">用户名不可修改</p>
          </div>

          <div>
            <label className="label">显示名称</label>
            <input
              type="text"
              className="input"
              value={profileForm.displayName}
              onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">邮箱</label>
            <input
              type="email"
              className="input"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>

          <div>
            <button type="submit" className="btn btn-primary">
              保存修改
            </button>
          </div>
        </form>
      </div>

      {/* 修改密码 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label">旧密码</label>
            <input
              type="password"
              className="input"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">新密码</label>
            <input
              type="password"
              className="input"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500">至少8个字符</p>
          </div>

          <div>
            <label className="label">确认新密码</label>
            <input
              type="password"
              className="input"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
          </div>

          <div>
            <button type="submit" className="btn btn-primary">
              修改密码
            </button>
          </div>
        </form>
      </div>

      {/* 会话管理 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">活动会话</h2>
        
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无活动会话</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {session.deviceType || '未知设备'}
                  </div>
                  <div className="text-sm text-gray-600">
                    IP: {session.ipAddress || '-'}
                  </div>
                  <div className="text-xs text-gray-400">
                    最后使用: {new Date(session.lastUsedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

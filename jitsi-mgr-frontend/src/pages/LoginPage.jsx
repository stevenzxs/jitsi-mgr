// 登录页面
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setLoading(true);
    
    try {
      await login(formData.username, formData.password);
      toast.success('登录成功');
      navigate('/');
    } catch (error) {
      toast.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600">CloudMeet</h1>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">
            用户管理后台
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            请登录以继续
          </p>
        </div>

        {/* 登录表单 */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="label">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    登录中...
                  </span>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 提示信息 */}
        <div className="text-center text-sm text-gray-600">
          <p>默认管理员账户：</p>
          <p className="mt-1">
            用户名: <span className="font-mono font-semibold">admin</span>
            {' / '}
            密码: <span className="font-mono font-semibold">Admin123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}

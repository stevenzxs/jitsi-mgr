// 布局组件
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('已退出登录');
      navigate('/login');
    } catch (error) {
      toast.error('退出失败');
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: '注册审核', href: '/registrations', icon: '📝', admin: true },
    { name: '用户管理', href: '/users', icon: '👥', admin: true },
    { name: '审计日志', href: '/audit-logs', icon: '📋', admin: true },
    { name: '个人设置', href: '/profile', icon: '⚙️' },
  ];

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">CloudMeet</h1>
              <span className="ml-3 text-sm text-gray-500">管理后台</span>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.displayName}</p>
                <p className="text-gray-500 text-xs">
                  {user?.role === 'admin' ? '管理员' : '用户'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
                // 如果是管理员菜单且用户不是管理员，则跳过
                if (item.admin && !isAdmin) {
                  return null;
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

// Dashboard 页面
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      name: '总用户数',
      value: '-',
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      name: '待审核',
      value: '-',
      icon: '📝',
      color: 'bg-yellow-500',
    },
    {
      name: '今日登录',
      value: '-',
      icon: '📊',
      color: 'bg-green-500',
    },
    {
      name: '活跃会话',
      value: '-',
      icon: '🔗',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900">
          欢迎回来，{user?.displayName}！
        </h1>
        <p className="mt-2 text-gray-600">
          这是 CloudMeet 用户管理后台
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3 text-white text-2xl`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          最近活动
        </h2>
        <div className="text-center py-12 text-gray-500">
          <p>暂无活动记录</p>
        </div>
      </div>

      {/* Quick Actions */}
      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            快捷操作
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/registrations"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium text-gray-900">审核注册</div>
              <div className="text-sm text-gray-600">查看待审核的注册请求</div>
            </a>
            <a
              href="/users"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-900">用户管理</div>
              <div className="text-sm text-gray-600">管理系统用户</div>
            </a>
            <a
              href="/audit-logs"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium text-gray-900">审计日志</div>
              <div className="text-sm text-gray-600">查看操作日志</div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

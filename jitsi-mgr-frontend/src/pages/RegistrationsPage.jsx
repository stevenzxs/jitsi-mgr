// 注册审核页面
import { useState, useEffect } from 'react';
import { getRegistrationRequests, approveRegistration, rejectRegistration } from '../services/adminService';
import toast from 'react-hot-toast';

export default function RegistrationsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getRegistrationRequests();
      setRequests(data || []);
    } catch (error) {
      toast.error('加载注册请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('确定批准此注册请求吗？')) return;
    
    try {
      await approveRegistration(id);
      toast.success('已批准注册');
      loadRequests();
    } catch (error) {
      toast.error(error.message || '批准失败');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error('请输入拒绝原因');
      return;
    }
    
    try {
      await rejectRegistration(id, rejectReason);
      toast.success('已拒绝注册');
      setRejectingId(null);
      setRejectReason('');
      loadRequests();
    } catch (error) {
      toast.error(error.message || '拒绝失败');
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
        <h1 className="text-2xl font-bold text-gray-900">注册审核</h1>
        <p className="mt-1 text-sm text-gray-600">
          {requests.length} 个待审核请求
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p>暂无待审核的注册请求</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {request.displayName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    用户名: {request.username}
                  </p>
                  {request.email && (
                    <p className="text-sm text-gray-600">
                      邮箱: {request.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    申请时间: {new Date(request.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="btn btn-primary"
                  >
                    批准
                  </button>
                  <button
                    onClick={() => setRejectingId(request.id)}
                    className="btn btn-danger"
                  >
                    拒绝
                  </button>
                </div>
              </div>

              {rejectingId === request.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="label">拒绝原因</label>
                  <textarea
                    className="input"
                    rows="3"
                    placeholder="请输入拒绝原因..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleReject(request.id)}
                      className="btn btn-danger"
                    >
                      确认拒绝
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                      className="btn btn-secondary"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

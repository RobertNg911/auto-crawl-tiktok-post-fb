import { useDashboard } from '../../hooks/useDashboard';

export default function DashboardPage() {
  const { overview, loading, error, refresh } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const stats = [
    { label: 'Chiến dịch', value: overview?.total_campaigns || 0, icon: '📁' },
    { label: 'Videos', value: overview?.total_videos || 0, icon: '🎬' },
    { label: 'Facebook Pages', value: overview?.total_pages || 0, icon: '📘' },
  ];

  const statusLabels: Record<string, { label: string; class: string }> = {
    pending: { label: 'Chờ xử lý', class: 'badge-warning' },
    downloading: { label: 'Đang tải', class: 'badge-info' },
    ready: { label: 'Sẵn sàng', class: 'badge-success' },
    posted: { label: 'Đã đăng', class: 'badge-success' },
    failed: { label: 'Thất bại', class: 'badge-error' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <button onClick={refresh} className="btn btn-secondary btn-sm">
          🔄 Làm mới
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Videos by status */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Videos theo trạng thái</h2>
        </div>

        {overview?.videos_by_status ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(overview.videos_by_status).map(([status, count]) => {
              const info = statusLabels[status] || { label: status, class: 'badge-info' };
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className={`badge ${info.class}`}>{info.label}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Chưa có dữ liệu</p>
        )}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useCampaigns } from '../../hooks/useCampaigns';

export default function CampaignsPage() {
  const { campaigns, loading, error, page, totalPages, setPage, deleteCampaign, syncCampaign } =
    useCampaigns();

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chiến dịch</h1>
        <Link to="/campaigns/new" className="btn btn-primary">
          + Tạo chiến dịch
        </Link>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      {campaigns.length === 0 ? (
        <div className="empty-state card">
          <p>Chưa có chiến dịch nào</p>
          <Link to="/campaigns/new" className="btn btn-primary mt-4">
            Tạo chiến dịch đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Nguồn</th>
                  <th>Trạng thái</th>
                  <th>Đồng bộ cuối</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      {campaign.topic && (
                        <p className="text-sm text-gray-500">{campaign.topic}</p>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {campaign.source_platform === 'tiktok' ? 'TikTok' : 'YouTube'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          campaign.status === 'active'
                            ? 'badge-success'
                            : campaign.status === 'paused'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {campaign.status === 'active'
                          ? 'Hoạt động'
                          : campaign.status === 'paused'
                          ? 'Tạm dừng'
                          : campaign.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {campaign.last_synced_at
                        ? new Date(campaign.last_synced_at).toLocaleString('vi-VN')
                        : 'Chưa đồng bộ'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => syncCampaign(campaign.id)}
                          className="btn btn-secondary btn-sm"
                          title="Đồng bộ"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="btn btn-danger btn-sm"
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Trước
              </button>
              <span className="px-4 py-2">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="btn btn-secondary btn-sm"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

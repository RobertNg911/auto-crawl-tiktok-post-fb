import { useVideos } from '../hooks/useVideos';

export default function VideosPage() {
  const { videos, loading, error, page, totalPages, setPage, deleteVideo, publishVideo } =
    useVideos();

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      {videos.length === 0 ? (
        <div className="empty-state card">
          <p>Chưa có video nào</p>
          <p className="text-sm text-gray-500 mt-2">
            Tạo chiến dịch và đồng bộ để lấy videos
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div key={video.id} className="card">
                {video.thumbnail_url && (
                  <img
                    src={video.thumbnail_url}
                    alt={video.original_caption || 'Video thumbnail'}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                )}

                <p className="font-medium text-gray-900 line-clamp-2 mb-2">
                  {video.original_caption || video.ai_caption || 'Không có tiêu đề'}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`badge ${
                      video.status === 'ready'
                        ? 'badge-success'
                        : video.status === 'failed'
                        ? 'badge-error'
                        : video.status === 'posted'
                        ? 'badge-success'
                        : 'badge-warning'
                    }`}
                  >
                    {video.status}
                  </span>
                  <span className="badge badge-info">
                    {video.source_platform}
                  </span>
                </div>

                <div className="flex gap-2">
                  {video.status === 'ready' && (
                    <button
                      onClick={() => publishVideo(video.id)}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      📤 Đăng bài
                    </button>
                  )}
                  <button
                    onClick={() => deleteVideo(video.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
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

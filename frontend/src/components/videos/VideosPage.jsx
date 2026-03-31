import { useState, useMemo } from 'react';
import { Filter, SortAsc, Trash2, RefreshCw, CheckSquare, Video, Sparkles, Clock, Eye, EyeOff } from 'lucide-react';
import { VideoCard } from './VideoCard';
import { VideoPreviewModal } from './VideoPreviewModal';
import { MOCK_VIDEOS } from '../../data/mockVideos';
import { VIDEO_STATUS_OPTIONS, SORT_OPTIONS } from '../../data/mockVideos';
import { MOCK_CAMPAIGNS } from '../../data/mockCampaigns';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function VideosPage() {
  const [videos, setVideos] = useState(MOCK_VIDEOS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [sortBy, setSortBy] = useState('views');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOldVideos, setShowOldVideos] = useState(false);

  const filteredVideos = useMemo(() => {
    const now = Date.now();
    let result = videos.filter((video) => {
      if (statusFilter !== 'all' && video.status !== statusFilter) return false;
      if (campaignFilter !== 'all' && video.campaign_id !== campaignFilter) return false;
      
      const videoAge = now - new Date(video.created_at).getTime();
      const isOld = videoAge > THIRTY_DAYS_MS;
      if (isOld && !showOldVideos) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          video.original_caption?.toLowerCase().includes(query) ||
          video.ai_caption?.toLowerCase().includes(query) ||
          video.campaign_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
          break;
        case 'views':
          aVal = a.views;
          bVal = b.views;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'publish_time':
          aVal = a.publish_time ? new Date(a.publish_time).getTime() : 0;
          bVal = b.publish_time ? new Date(b.publish_time).getTime() : 0;
          break;
        default:
          aVal = a.views;
          bVal = b.views;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [videos, statusFilter, campaignFilter, sortBy, sortOrder, searchQuery, showOldVideos]);

  const handleSelectVideo = (id, checked) => {
    setSelectedVideos((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id)
    );
  };

  const handleSelectAll = () => {
    if (selectedVideos.length === filteredVideos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(filteredVideos.map((v) => v.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedVideos.length === 0) return;
    if (confirm(`Bạn có chắc muốn xóa ${selectedVideos.length} video?`)) {
      setVideos((prev) => prev.filter((v) => !selectedVideos.includes(v.id)));
      setSelectedVideos([]);
    }
  };

  const handleRetryVideo = async (id) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: 'downloading', error_message: null, retry_count: 0 } : v
      )
    );
    await new Promise((r) => setTimeout(r, 1000));
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: 'ready' } : v
      )
    );
  };

  const handleSaveVideo = async (id, updates) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      )
    );
  };

  const handleDeleteVideo = (id) => {
    if (confirm('Bạn có chắc muốn xóa video này?')) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const handleRetrySelected = async () => {
    const failedSelected = videos.filter(
      (v) => selectedVideos.includes(v.id) && v.status === 'failed'
    );
    for (const video of failedSelected) {
      await handleRetryVideo(video.id);
    }
  };

  const handlePublishVideo = async (id) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: 'publishing' } : v
      )
    );
    
    await new Promise((r) => setTimeout(r, 2000));
    
    const mockPostId = '1234567890' + Math.floor(Math.random() * 1000000);
    
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: 'posted', fb_post_id: mockPostId } : v
      )
    );
  };

  const statusCounts = useMemo(() => {
    return {
      all: videos.length,
      pending: videos.filter((v) => v.status === 'pending').length,
      downloading: videos.filter((v) => v.status === 'downloading').length,
      ready: videos.filter((v) => v.status === 'ready').length,
      posted: videos.filter((v) => v.status === 'posted').length,
      failed: videos.filter((v) => v.status === 'failed').length,
    };
  }, [videos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Lịch đăng video</h1>
          <p className="mt-1 text-sm text-slate-400">
            Quản lý hàng đợi video và lịch đăng bài
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/10 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Tìm kiếm video..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field-input w-full rounded-xl py-2.5 pl-4 pr-4 text-sm"
          />
        </div>

        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="field-input rounded-xl py-2.5 pl-4 pr-10 text-sm"
        >
          <option value="all">Tất cả chiến dịch</option>
          {MOCK_CAMPAIGNS.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="field-input rounded-xl py-2.5 pl-4 pr-10 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
          className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
        >
          <SortAsc className={`h-4 w-4 transition ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIDEO_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === opt.value
                ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {opt.label}
            <span className="ml-1.5 rounded-full bg-black/30 px-1.5 py-0.5 text-xs">
              {statusCounts[opt.value] || 0}
            </span>
          </button>
        ))}
        
        <button
          onClick={() => setShowOldVideos(!showOldVideos)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
            showOldVideos
              ? 'border-amber-400/50 bg-amber-400/10 text-amber-100'
              : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
          }`}
        >
          {showOldVideos ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          Video cũ (&gt;30 ngày)
        </button>
      </div>

      {selectedVideos.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <span className="text-sm text-cyan-100">
            {selectedVideos.length} video được chọn
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleRetrySelected}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Thử lại ({selectedVideos.filter(id => videos.find(v => v.id === id && v.status === 'failed')).length})
            </button>
            <button
              onClick={handleDeleteSelected}
              className="text-sm text-rose-400 transition hover:text-rose-300"
            >
              Xóa đã chọn
            </button>
            <button
              onClick={() => setSelectedVideos([])}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPreview={setPreviewVideo}
            onRetry={handleRetryVideo}
            onDelete={handleDeleteVideo}
            onPublish={handlePublishVideo}
          />
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-12 text-center">
          <Video className="mx-auto h-12 w-12 text-slate-600" />
          <div className="mt-4 font-display text-lg font-semibold text-white">
            Không có video nào
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Thử thay đổi bộ lọc để xem thêm video
          </p>
        </div>
      )}

      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onSave={(updates) => handleSaveVideo(previewVideo.id, updates)}
          onRetry={handleRetryVideo}
          onRegenerateCaption={(id) => {
            setVideos((prev) =>
              prev.map((v) =>
                v.id === id
                  ? { ...v, ai_caption: 'Caption AI mới được tạo...' }
                  : v
              )
            );
          }}
          onPublish={handlePublishVideo}
        />
      )}
    </div>
  );
}

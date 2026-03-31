import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Video,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
  Calendar,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ExternalLink,
} from 'lucide-react';

const API_URL = '/api';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

function formatRelTime(isoString) {
  if (!isoString) return 'Chưa có';
  const date = new Date(isoString.endsWith('Z') ? isoString : `${isoString}Z`);
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMinutes <= 0) return 'Đến lượt ngay';
  if (diffMinutes < 60) return `${diffMinutes} phút nữa`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ nữa`;
  return `${Math.floor(diffHours / 24)} ngày nữa`;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'downloading', label: 'Đang tải' },
  { value: 'ready', label: 'Sẵn sàng' },
  { value: 'posted', label: 'Đã đăng' },
  { value: 'failed', label: 'Thất bại' },
];

const VIDEO_STATUS_META = {
  pending: { label: 'Đang chờ', tone: 'cyan' },
  downloading: { label: 'Đang tải', tone: 'cyan' },
  ready: { label: 'Sẵn sàng', tone: 'amber' },
  posted: { label: 'Đã đăng', tone: 'emerald' },
  failed: { label: 'Thất bại', tone: 'rose' },
};

const TONE_CLASSES = {
  cyan: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  rose: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  slate: 'border-white/10 bg-white/5 text-slate-200',
};

function StatusBadge({ status }) {
  const meta = VIDEO_STATUS_META[status] || VIDEO_STATUS_META.pending;
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', TONE_CLASSES[meta.tone])}>
      {meta.label}
    </span>
  );
}

function VideoQueueRow({ video, onRetry, onRegenerate, expanded, onToggle }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/5 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">#{video.original_id?.slice(-8) || '—'}</span>
            <StatusBadge status={video.status} />
          </div>
          <div className="mt-1 text-sm text-white truncate">
            {video.ai_caption || video.original_caption || 'Chưa có caption'}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span>{video.views?.toLocaleString()} views</span>
            {video.publish_time && (
              <>
                <span>•</span>
                <span>{formatRelTime(video.publish_time)}</span>
              </>
            )}
            {video.fb_post_id && (
              <>
                <span>•</span>
                <span className="text-emerald-400">Đã đăng</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {video.status === 'failed' && (
            <button
              onClick={() => onRetry?.(video.id)}
              className="flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-400/10 px-2.5 py-1.5 text-xs text-rose-100 hover:bg-rose-400/20"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
          {video.status === 'ready' && !video.ai_caption && (
            <button
              onClick={() => onRegenerate?.(video.id)}
              className="flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/20"
            >
              Generate AI
            </button>
          )}
          <button
            onClick={() => onToggle?.(video.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/6 px-3 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-black/20 px-3 py-2">
              <div className="text-slate-500">Source URL</div>
              <div className="mt-1 text-white truncate">{video.source_video_url || '—'}</div>
            </div>
            <div className="rounded-lg bg-black/20 px-3 py-2">
              <div className="text-slate-500">Created</div>
              <div className="mt-1 text-white">{video.created_at ? new Date(video.created_at).toLocaleString('vi-VN') : '—'}</div>
            </div>
          </div>
          {video.ai_caption && (
            <div className="rounded-lg bg-black/20 px-3 py-2">
              <div className="text-slate-500 text-xs">AI Caption</div>
              <div className="mt-1 text-sm text-white">{video.ai_caption}</div>
            </div>
          )}
          {video.last_error && (
            <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2">
              <div className="flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3 w-3" />
                Error
              </div>
              <div className="mt-1 text-xs text-rose-200">{video.last_error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CampaignDetailPage({ campaignId, onBack, token, showNotice }) {
  const [campaign, setCampaign] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoFilter, setVideoFilter] = useState('all');
  const [videoSearch, setVideoSearch] = useState('');
  const [expandedVideos, setExpandedVideos] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [activeTab, setActiveTab] = useState('videos');

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || 'Yêu cầu không thành công.');
    }
    return response.json();
  }, [token]);

  const fetchDetail = useCallback(async () => {
    if (!token || !campaignId) return;
    setLoading(true);
    try {
      const [detailData, timelineRes] = await Promise.all([
        authFetch(`${API_URL}/campaigns/${campaignId}`),
        authFetch(`${API_URL}/campaigns/${campaignId}/timeline`),
      ]);
      setCampaign(detailData.campaign);
      setVideos(detailData.videos || []);
      setTimelineData(timelineRes);
    } catch (error) {
      showNotice?.('error', error.message);
    } finally {
      setLoading(false);
    }
  }, [token, campaignId, authFetch, showNotice]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleToggleStatus = async () => {
    if (!campaign) return;
    const action = campaign.status === 'active' ? 'pause' : 'resume';
    try {
      await authFetch(`${API_URL}/campaigns/${campaignId}/${action}`, { method: 'POST' });
      showNotice?.('success', action === 'pause' ? 'Đã tạm dừng.' : 'Đã kích hoạt lại.');
      fetchDetail();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleSync = async () => {
    setActionLoading(true);
    try {
      await authFetch(`${API_URL}/campaigns/${campaignId}/sync`, { method: 'POST' });
      showNotice?.('success', 'Đã xếp lịch đồng bộ.');
      fetchDetail();
    } catch (error) {
      showNotice?.('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa chiến dịch này? Tất cả video liên quan sẽ bị xóa.')) return;
    try {
      await authFetch(`${API_URL}/campaigns/${campaignId}`, { method: 'DELETE' });
      showNotice?.('success', 'Đã xóa chiến dịch.');
      onBack?.();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleRetryVideo = async (videoId) => {
    try {
      await authFetch(`${API_URL}/campaigns/videos/${videoId}/retry`, { method: 'POST' });
      showNotice?.('success', 'Đã xếp lịch retry.');
      fetchDetail();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleRegenerateCaption = async (videoId) => {
    try {
      await authFetch(`${API_URL}/campaigns/videos/${videoId}/generate-caption`, { method: 'POST' });
      showNotice?.('success', 'Đã tạo lại caption.');
      fetchDetail();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const toggleExpanded = (videoId) => {
    setExpandedVideos((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (videoFilter !== 'all' && v.status !== videoFilter) return false;
      if (videoSearch) {
        const q = videoSearch.toLowerCase();
        return (
          v.ai_caption?.toLowerCase().includes(q) ||
          v.original_caption?.toLowerCase().includes(q) ||
          v.original_id?.includes(q)
        );
      }
      return true;
    });
  }, [videos, videoFilter, videoSearch]);

  const stats = campaign?.video_counts || {};

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-slate-600" />
        <div className="mt-3 font-display text-lg font-semibold text-white">Không tìm thấy chiến dịch</div>
        <button onClick={onBack} className="btn-primary mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-white">{campaign.name}</h1>
              <span className={cx(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium',
                campaign.status === 'active'
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                  : 'border-amber-400/25 bg-amber-400/10 text-amber-100'
              )}>
                {campaign.status === 'active' ? 'Đang chạy' : 'Tạm dừng'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              {campaign.topic && <span className="capitalize">{campaign.topic}</span>}
              {campaign.target_page_name && (
                <>
                  <span>•</span>
                  <span>{campaign.target_page_name}</span>
                </>
              )}
              {campaign.view_threshold > 0 && (
                <>
                  <span>•</span>
                  <span>View threshold: {campaign.view_threshold.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggleStatus}
            className={cx(
              'btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
              campaign.status === 'active' ? 'text-amber-100' : 'text-emerald-100'
            )}
          >
            {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {campaign.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
          </button>
          <button
            onClick={handleSync}
            disabled={actionLoading}
            className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw className={cx('h-4 w-4', actionLoading && 'animate-spin')} />
            Đồng bộ
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-400/20"
          >
            <Trash2 className="h-4 w-4" />
            Xóa
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Tổng', value: stats.total || 0, icon: Video, tone: 'slate' },
          { label: 'Đang chờ', value: stats.pending || 0, icon: Clock, tone: 'cyan' },
          { label: 'Sẵn sàng', value: stats.ready || 0, icon: CheckCircle, tone: 'amber' },
          { label: 'Đã đăng', value: stats.posted || 0, icon: ExternalLink, tone: 'emerald' },
          { label: 'Thất bại', value: stats.failed || 0, icon: AlertCircle, tone: 'rose' },
        ].map((stat) => (
          <div key={stat.label} className={cx('rounded-xl border p-3', TONE_CLASSES[stat.tone])}>
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">{stat.label}</span>
            </div>
            <div className="mt-1 text-2xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-black/10 p-1">
        {[
          { id: 'videos', label: 'Video Queue', icon: Video },
          { id: 'timeline', label: 'Schedule Timeline', icon: Calendar },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Video Queue Tab */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/10 p-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm video..."
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                className="field-input w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value)}
                className="field-input rounded-xl py-2.5 pl-4 pr-10 text-sm"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredVideos.map((video) => (
              <VideoQueueRow
                key={video.id}
                video={video}
                onRetry={handleRetryVideo}
                onRegenerate={handleRegenerateCaption}
                expanded={!!expandedVideos[video.id]}
                onToggle={toggleExpanded}
              />
            ))}
            {filteredVideos.length === 0 && (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center">
                <Video className="mx-auto h-8 w-8 text-slate-600" />
                <div className="mt-2 text-sm text-slate-400">Không có video nào</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && timelineData && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              Video đã lên lịch ({timelineData.scheduled_videos?.length || 0})
            </div>
            <div className="space-y-2">
              {timelineData.scheduled_videos?.slice(0, 20).map((video, idx) => (
                <div key={video.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/5 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-xs font-bold text-amber-100">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {video.ai_caption?.slice(0, 50) || video.original_caption?.slice(0, 50) || 'Video'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {video.publish_time ? new Date(video.publish_time).toLocaleString('vi-VN') : '—'}
                    </div>
                  </div>
                  <StatusBadge status={video.status} />
                </div>
              ))}
              {(!timelineData.scheduled_videos || timelineData.scheduled_videos.length === 0) && (
                <div className="py-6 text-center text-sm text-slate-500">Chưa có video nào được lên lịch</div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              Video chờ xếp lịch ({timelineData.unscheduled_videos?.length || 0})
            </div>
            <div className="space-y-2">
              {timelineData.unscheduled_videos?.slice(0, 20).map((video) => (
                <div key={video.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/5 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-bold text-cyan-100">
                    <Download className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {video.ai_caption?.slice(0, 50) || video.original_caption?.slice(0, 50) || 'Video'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {video.views?.toLocaleString()} views • Priority: {video.priority || 0}
                    </div>
                  </div>
                  <StatusBadge status={video.status} />
                </div>
              ))}
              {(!timelineData.unscheduled_videos || timelineData.unscheduled_videos.length === 0) && (
                <div className="py-6 text-center text-sm text-slate-500">Tất cả video đã có lịch</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
            <h3 className="text-sm font-semibold text-white">Thông tin chiến dịch</h3>
            <div className="mt-4 space-y-3">
              <InfoRow label="Tên" value={campaign.name} />
              <InfoRow label="Chủ đề" value={campaign.topic || '—'} />
              <InfoRow label="Trang đích" value={campaign.target_page_name || '—'} />
              <InfoRow label="Nguồn" value={campaign.source_url || '—'} />
              <InfoRow label="Nền tảng" value={campaign.source_platform || '—'} />
              <InfoRow label="Ngưỡng view" value={campaign.view_threshold?.toLocaleString() || '0'} />
              <InfoRow label="Khoảng cách đăng" value={formatScheduleInterval(campaign.schedule_interval)} />
              <InfoRow label="Trạng thái" value={campaign.status === 'active' ? 'Đang chạy' : 'Tạm dừng'} />
              <InfoRow label="Đồng bộ cuối" value={campaign.last_synced_at ? new Date(campaign.last_synced_at).toLocaleString('vi-VN') : 'Chưa'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/6 bg-black/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

function formatScheduleInterval(seconds) {
  if (!seconds || seconds === 0) return 'Chưa cấu hình';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}p`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}

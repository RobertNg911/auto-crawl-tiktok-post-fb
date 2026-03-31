import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Share2, RefreshCw, Calendar } from 'lucide-react';
import { CampaignCard } from './CampaignCard';
import { CampaignWizard } from './CampaignWizard';
import { ScheduleTimeline, ManualScheduleModal } from './ScheduleTimeline';
import { CAMPAIGN_STATUS_OPTIONS } from '../../data/mockCampaigns';

const API_URL = '/api';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export function CampaignsPage({ token, onNavigateDetail, showNotice }) {
  const [campaigns, setCampaigns] = useState([]);
  const [videos, setVideos] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [scheduleModalVideo, setScheduleModalVideo] = useState(null);
  const [fetching, setFetching] = useState(false);

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

  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    setFetching(true);
    try {
      const [campaignsData, statsData] = await Promise.all([
        authFetch(`${API_URL}/campaigns/`),
        authFetch(`${API_URL}/campaigns/stats`),
      ]);
      const mapped = campaignsData.map((c) => ({
        id: c.id,
        name: c.name,
        target_page: { id: c.target_page_id, page_name: c.target_page_name || '—' },
        channel_count: 0,
        topic: c.topic,
        status: c.status,
        stats: {
          total_videos: c.video_counts?.total || 0,
          pending: c.video_counts?.pending || 0,
          downloading: c.video_counts?.downloading || 0,
          ready: c.video_counts?.ready || 0,
          posted: c.video_counts?.posted || 0,
          failed: c.video_counts?.failed || 0,
        },
        view_threshold: c.view_threshold,
        schedule_interval: c.schedule_interval,
        created_at: c.created_at,
        source_url: c.source_url,
        source_platform: c.source_platform,
      }));
      setCampaigns(mapped);
      if (statsData?.by_source) {
        setVideos(statsData);
      }
    } catch (error) {
      showNotice?.('error', error.message);
    } finally {
      setFetching(false);
    }
  }, [token, authFetch, showNotice]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          campaign.name.toLowerCase().includes(query) ||
          campaign.topic?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [campaigns, statusFilter, searchQuery]);

  const handleCreateCampaign = async (formData) => {
    try {
      await authFetch(`${API_URL}/campaigns/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          source_url: formData.source_url || 'https://www.tiktok.com/@target',
          topic: formData.topic,
          view_threshold: formData.view_threshold,
          auto_post: false,
          target_page_id: formData.target_page_id,
          schedule_interval: formData.schedule_interval,
        }),
      });
      showNotice?.('success', 'Đã tạo chiến dịch mới.');
      setShowWizard(false);
      fetchCampaigns();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chiến dịch này?')) return;
    try {
      await authFetch(`${API_URL}/campaigns/${id}`, { method: 'DELETE' });
      showNotice?.('success', 'Đã xóa chiến dịch.');
      fetchCampaigns();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleToggleStatus = async (id) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;
    const action = campaign.status === 'active' ? 'pause' : 'resume';
    try {
      await authFetch(`${API_URL}/campaigns/${id}/${action}`, { method: 'POST' });
      showNotice?.('success', action === 'pause' ? 'Đã tạm dừng chiến dịch.' : 'Đã kích hoạt lại.');
      fetchCampaigns();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleSync = async (id) => {
    setIsLoading(true);
    try {
      await authFetch(`${API_URL}/campaigns/${id}/sync`, { method: 'POST' });
      showNotice?.('success', 'Đã xếp lịch đồng bộ.');
      fetchCampaigns();
    } catch (error) {
      showNotice?.('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTimeline = (campaign) => {
    setSelectedCampaign(campaign);
    setShowTimeline(true);
  };

  const handleScheduleIntervalChange = async (campaignId, interval) => {
    try {
      await authFetch(`${API_URL}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_interval: interval }),
      });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, schedule_interval: interval } : c
        )
      );
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  const handleManualSchedule = (video) => {
    setScheduleModalVideo(video);
  };

  const handleScheduleVideo = async (videoId, publishTime) => {
    try {
      await authFetch(`${API_URL}/campaigns/videos/${videoId}/priority`, { method: 'POST' });
      showNotice?.('success', 'Đã đặt lịch đăng.');
      setScheduleModalVideo(null);
      fetchCampaigns();
    } catch (error) {
      showNotice?.('error', error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Chiến dịch</h1>
          <p className="mt-1 text-sm text-slate-400">
            Quản lý chiến dịch và lịch đăng bài
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={cx(
              'btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
              showTimeline && 'bg-cyan-400/20 border-cyan-400/50'
            )}
          >
            <Calendar className="h-4 w-4" />
            {showTimeline ? 'Ẩn timeline' : 'Timeline'}
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Tạo chiến dịch
          </button>
        </div>
      </div>

      {showTimeline && selectedCampaign && (
        <ScheduleTimeline
          campaign={selectedCampaign}
          videos={videos.filter?.(v => v.campaign_id === selectedCampaign.id) || []}
          onScheduleIntervalChange={(interval) => handleScheduleIntervalChange(selectedCampaign.id, interval)}
          onManualSchedule={handleManualSchedule}
          isLoading={isLoading}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/10 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Tìm kiếm chiến dịch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field-input w-full rounded-xl py-2.5 pl-4 pr-4 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field-input rounded-xl py-2.5 pl-4 pr-10 text-sm"
        >
          {CAMPAIGN_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={fetchCampaigns}
          className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
        >
          <RefreshCw className={cx('h-4 w-4', fetching && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      {fetching ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-[22px] border border-white/8 bg-black/10" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={(c) => {
                setEditingCampaign(c);
                setShowWizard(true);
              }}
              onDelete={handleDeleteCampaign}
              onToggleStatus={handleToggleStatus}
              onSync={handleSync}
              onViewTimeline={handleViewTimeline}
              onViewDetail={() => onNavigateDetail?.(campaign.id)}
            />
          ))}
        </div>
      )}

      {filteredCampaigns.length === 0 && !fetching && (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-12 text-center">
          <Share2 className="mx-auto h-12 w-12 text-slate-600" />
          <div className="mt-4 font-display text-lg font-semibold text-white">
            Chưa có chiến dịch nào
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Tạo chiến dịch đầu tiên để bắt đầu
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Tạo chiến dịch đầu tiên
          </button>
        </div>
      )}

      {showWizard && (
        <CampaignWizard
          onSubmit={handleCreateCampaign}
          onClose={() => {
            setShowWizard(false);
            setEditingCampaign(null);
          }}
          initialData={editingCampaign}
        />
      )}

      <ManualScheduleModal
        video={scheduleModalVideo}
        isOpen={!!scheduleModalVideo}
        onClose={() => setScheduleModalVideo(null)}
        onSchedule={handleScheduleVideo}
      />
    </div>
  );
}

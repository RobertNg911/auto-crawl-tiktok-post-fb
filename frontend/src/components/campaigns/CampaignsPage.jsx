import { useState, useMemo } from 'react';
import { Plus, Share2, RefreshCw, AlertCircle } from 'lucide-react';
import { CampaignCard } from './CampaignCard';
import { CampaignWizard } from './CampaignWizard';
import { MOCK_CAMPAIGNS } from '../../data/mockCampaigns';
import { CAMPAIGN_STATUS_OPTIONS } from '../../data/mockCampaigns';

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    const newCampaign = {
      id: `camp_${Date.now()}`,
      name: formData.name,
      target_page: { id: formData.target_page_id, page_name: 'Facebook Page' },
      channel_ids: formData.channel_ids,
      channel_count: formData.channel_ids.length,
      topic: formData.topic,
      status: 'active',
      stats: {
        total_videos: 0,
        pending: 0,
        downloading: 0,
        ready: 0,
        posted: 0,
        failed: 0,
      },
      view_threshold: formData.view_threshold,
      schedule_interval: formData.schedule_interval,
      created_at: new Date().toISOString(),
    };
    setCampaigns((prev) => [...prev, newCampaign]);
    setShowWizard(false);
  };

  const handleDeleteCampaign = (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa chiến dịch này?')) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleToggleStatus = (id) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c
      )
    );
  };

  const handleSync = async (id) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    alert('Đồng bộ thành công! Video mới sẽ được thêm vào queue.');
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
        <button
          onClick={() => setShowWizard(true)}
          className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Tạo chiến dịch
        </button>
      </div>

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

        <button className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Đồng bộ tất cả
        </button>
      </div>

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
          />
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
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
    </div>
  );
}

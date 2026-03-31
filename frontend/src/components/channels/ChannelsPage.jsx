import { useState, useMemo } from 'react';
import { Plus, Users, RefreshCw } from 'lucide-react';
import { ChannelCard } from './ChannelCard';
import { ChannelFilters } from './ChannelFilters';
import { ChannelForm } from './ChannelForm';
import { MOCK_CHANNELS } from '../../data/mockChannels';

export function ChannelsPage() {
  const [channels, setChannels] = useState(MOCK_CHANNELS);
  const [filters, setFilters] = useState({ status: 'all', topic: 'all', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      if (filters.status !== 'all' && channel.status !== filters.status) return false;
      if (filters.topic !== 'all' && channel.topic !== filters.topic) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchUsername = channel.username.toLowerCase().includes(searchLower);
        const matchDisplayName = channel.display_name?.toLowerCase().includes(searchLower);
        if (!matchUsername && !matchDisplayName) return false;
      }
      return true;
    });
  }, [channels, filters]);

  const handleSelectChannel = (id, checked) => {
    setSelectedChannels((prev) =>
      checked ? [...prev, id] : prev.filter((c) => c !== id)
    );
  };

  const handleSelectAll = () => {
    if (selectedChannels.length === filteredChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(filteredChannels.map((c) => c.id));
    }
  };

  const handleAddChannel = async (formData) => {
    const newChannel = {
      id: String(Date.now()),
      channel_id: `ch_${Date.now()}`,
      username: formData.username,
      display_name: formData.display_name,
      topic: formData.topic,
      status: 'active',
      latest_metrics: null,
      created_at: new Date().toISOString(),
    };
    setChannels((prev) => [...prev, newChannel]);
  };

  const handleEditChannel = async (formData) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === editingChannel.id
          ? { ...c, display_name: formData.display_name, topic: formData.topic }
          : c
      )
    );
    setEditingChannel(null);
  };

  const handleDeleteChannel = (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa kênh này?')) {
      setChannels((prev) => prev.filter((c) => c.id !== id));
      setSelectedChannels((prev) => prev.filter((c) => c !== id));
    }
  };

  const handleToggleStatus = (id) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
      )
    );
  };

  const handleBulkDelete = () => {
    if (selectedChannels.length === 0) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedChannels.length} kênh đã chọn?`)) {
      setChannels((prev) => prev.filter((c) => !selectedChannels.includes(c.id)));
      setSelectedChannels([]);
    }
  };

  const handleSubmit = async (formData) => {
    if (editingChannel) {
      await handleEditChannel(formData);
    } else {
      await handleAddChannel(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Quản lý kênh</h1>
          <p className="mt-1 text-sm text-slate-400">
            Quản lý danh sách kênh TikTok mục tiêu
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium">
            <RefreshCw className="h-4 w-4" />
            Đồng bộ
          </button>
          <button
            onClick={() => {
              setEditingChannel(null);
              setShowForm(true);
            }}
            className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Thêm kênh
          </button>
        </div>
      </div>

      <ChannelFilters filters={filters} onFilterChange={setFilters} onSearch={() => {}} />

      {selectedChannels.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <span className="text-sm text-cyan-100">
            {selectedChannels.length} kênh được chọn
          </span>
          <button
            onClick={handleBulkDelete}
            className="ml-auto text-sm text-rose-400 transition hover:text-rose-300"
          >
            Xóa đã chọn
          </button>
          <button
            onClick={() => setSelectedChannels([])}
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredChannels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            isSelected={selectedChannels.includes(channel.id)}
            onSelect={handleSelectChannel}
            onEdit={() => {
              setEditingChannel(channel);
              setShowForm(true);
            }}
            onDelete={() => handleDeleteChannel(channel.id)}
            onToggleStatus={() => handleToggleStatus(channel.id)}
          />
        ))}
      </div>

      {filteredChannels.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-600" />
          <div className="mt-4 font-display text-lg font-semibold text-white">
            Chưa có kênh nào
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Thêm kênh TikTok để bắt đầu theo dõi nội dung
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Thêm kênh đầu tiên
          </button>
        </div>
      )}

      {showForm && (
        <ChannelForm
          channel={editingChannel}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingChannel(null);
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Plus, Users, RefreshCw, Loader2 } from 'lucide-react';
import { ChannelCard } from './ChannelCard';
import { ChannelFilters } from './ChannelFilters';
import { ChannelForm } from './ChannelForm';
import { ChannelDetailPage } from './ChannelDetailPage';

const API_URL = '/api';

export function ChannelsPage({ token }) {
  const [channels, setChannels] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'all', topic: 'all', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingChannel, setViewingChannel] = useState(null);
  const [error, setError] = useState(null);

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || payload?.message || 'Request failed');
    }
    return response.json();
  }, [token]);

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.topic !== 'all') params.set('topic', filters.topic);
      if (filters.search) params.set('search', filters.search);

      const data = await authFetch(`${API_URL}/channels?${params.toString()}`);
      setChannels(data.items || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, page, filters]);

  useEffect(() => {
    if (token) fetchChannels();
  }, [fetchChannels, token]);

  const handleAddChannel = async (formData) => {
    const payload = await authFetch(`${API_URL}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setChannels((prev) => [payload, ...prev]);
  };

  const handleEditChannel = async (formData) => {
    const payload = await authFetch(`${API_URL}/channels/${editingChannel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: formData.display_name,
        topic: formData.topic,
      }),
    });
    setChannels((prev) =>
      prev.map((c) => (c.id === editingChannel.id ? payload : c))
    );
    setEditingChannel(null);
  };

  const handleDeleteChannel = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kênh này?')) return;
    try {
      await authFetch(`${API_URL}/channels/${id}`, { method: 'DELETE' });
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (id) => {
    const channel = channels.find((c) => c.id === id);
    if (!channel) return;
    const newStatus = channel.status === 'active' ? 'inactive' : 'active';
    try {
      const payload = await authFetch(`${API_URL}/channels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setChannels((prev) => prev.map((c) => (c.id === id ? payload : c)));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    if (editingChannel) {
      await handleEditChannel(formData);
    } else {
      await handleAddChannel(formData);
    }
  };

  const handleViewChannel = (channel) => {
    setViewingChannel(channel);
  };

  if (viewingChannel) {
    return (
      <ChannelDetailPage
        channel={viewingChannel}
        onBack={() => setViewingChannel(null)}
        token={token}
      />
    );
  }

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
          <button
            onClick={fetchChannels}
            className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
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

      <ChannelFilters filters={filters} onFilterChange={setFilters} onSearch={fetchChannels} />

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {isLoading && channels.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onClick={handleViewChannel}
                onEdit={() => {
                  setEditingChannel(channel);
                  setShowForm(true);
                }}
                onDelete={() => handleDeleteChannel(channel.id)}
                onToggleStatus={() => handleToggleStatus(channel.id)}
              />
            ))}
          </div>

          {channels.length === 0 && (
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-sm text-slate-400">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </>
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

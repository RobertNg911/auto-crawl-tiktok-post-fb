import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Users, Video, Eye, TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_URL = '/api';

export function ChannelDetailPage({ channel, onBack, token }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoPage, setVideoPage] = useState(1);
  const [videoTotalPages, setVideoTotalPages] = useState(1);
  const [videoTotal, setVideoTotal] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const [sortBy, setSortBy] = useState('views');
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

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

  const fetchMetricsHistory = useCallback(async () => {
    if (!channel?.id) return;
    setIsLoadingMetrics(true);
    try {
      const days = timeRange === '7d' ? 7 : 30;
      const data = await authFetch(`${API_URL}/channels/${channel.id}/metrics-history?days=${days}`);
      setMetricsHistory(Array.isArray(data) ? data : []);
    } catch {
      setMetricsHistory([]);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [authFetch, channel?.id, timeRange]);

  const fetchVideos = useCallback(async (pg = 1) => {
    if (!channel?.id) return;
    setIsLoadingVideos(true);
    try {
      const data = await authFetch(
        `${API_URL}/channels/${channel.id}/videos?page=${pg}&page_size=20&sort_by=${sortBy}&sort_order=desc`
      );
      setVideos(data.items || []);
      setVideoTotalPages(data.total_pages || 1);
      setVideoTotal(data.total || 0);
    } catch {
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [authFetch, channel?.id, sortBy]);

  useEffect(() => {
    fetchMetricsHistory();
  }, [fetchMetricsHistory]);

  useEffect(() => {
    fetchVideos(videoPage);
  }, [fetchVideos, videoPage]);

  const metrics = channel?.latest_metrics || {};
  const history = metricsHistory;

  const today = history.length > 0 ? history[history.length - 1] : {};
  const yesterday = history.length > 1 ? history[history.length - 2] : {};

  const followerDiff = (today.followers || 0) - (yesterday.followers || 0);
  const videoDiff = (today.video_count || 0) - (yesterday.video_count || 0);
  const viewsDiff = (today.total_views || 0) - (yesterday.total_views || 0);

  const lastSyncTime = metrics?.snapshot_date || null;
  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    : 'Chưa từng sync';

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await authFetch(`${API_URL}/channels/${channel.id}/metrics-history`);
      fetchMetricsHistory();
    } catch {
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const chartData = history.map(item => ({
    date: item.date ? item.date.split('-').slice(1).join('/') : '',
    followers: item.followers || 0,
    video_count: item.video_count || 0,
    views: Math.round((item.total_views || 0) / 1000),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách kênh
        </button>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
            isSyncing
              ? 'bg-cyan-400/20 text-cyan-300 cursor-wait'
              : 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Đang sync...' : 'Sync metrics'}
        </button>
      </div>

      <div className="rounded-[22px] border border-white/8 bg-black/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white">
              @{channel.username}
            </h1>
            {channel.display_name && (
              <p className="mt-1 text-slate-400">{channel.display_name}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                channel.status === 'active'
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}>
                {channel.status === 'active' ? 'Hoạt động' : 'Dừng'}
              </span>
              {channel.topic && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400 capitalize">
                  {channel.topic}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Last sync: {formattedLastSync}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-4 w-4" />
              <span>Followers</span>
            </div>
            {followerDiff !== 0 && (
              <div className={`flex items-center gap-0.5 text-xs ${followerDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {followerDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(followerDiff).toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="mt-2 font-display text-xl font-semibold text-white">
            {(today.followers || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">vs yesterday</div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Video className="h-4 w-4" />
              <span>Video count</span>
            </div>
            {videoDiff !== 0 && (
              <div className={`flex items-center gap-0.5 text-xs ${videoDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {videoDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(videoDiff)}</span>
              </div>
            )}
          </div>
          <div className="mt-2 font-display text-xl font-semibold text-white">
            {today.video_count || 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">vs yesterday</div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Eye className="h-4 w-4" />
              <span>Total views</span>
            </div>
            {viewsDiff !== 0 && (
              <div className={`flex items-center gap-0.5 text-xs ${viewsDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {viewsDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(Math.round(viewsDiff / 1000))}k</span>
              </div>
            )}
          </div>
          <div className="mt-2 font-display text-xl font-semibold text-white">
            {(today.total_views || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">vs yesterday</div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/8 bg-black/10 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Metrics History</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                timeRange === '7d' ? 'bg-cyan-400/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                timeRange === '30d' ? 'bg-cyan-400/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 days
            </button>
          </div>
        </div>

        {isLoadingMetrics ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : chartData.length > 0 ? (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #ffffff10',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="followers"
                    name="Followers"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#22d3ee' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="video_count"
                    name="Videos"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#a78bfa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 h-[200px]">
              <h3 className="mb-3 font-display text-sm font-semibold text-white">Views Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #ffffff10',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value) => [`${value.toLocaleString()}k`, 'Views']}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#34d399' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có dữ liệu metrics
          </div>
        )}
      </div>

      <div className="rounded-[22px] border border-white/8 bg-black/10 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">
            Videos ({videoTotal})
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setVideoPage(1); }}
              className="field-input rounded-xl py-2 pl-3 pr-8 text-xs"
            >
              <option value="views">Sort by Views</option>
              <option value="likes">Sort by Likes</option>
              <option value="comments_count">Sort by Comments</option>
              <option value="created_at">Sort by Date</option>
            </select>
          </div>
        </div>

        {isLoadingVideos ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : videos.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6 text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Video ID</th>
                    <th className="pb-3 pr-4 text-right">Views</th>
                    <th className="pb-3 pr-4 text-right">Likes</th>
                    <th className="pb-3 pr-4 text-right">Comments</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video, idx) => {
                    const statusClasses = {
                      ready: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
                      pending: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
                      downloading: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
                      posted: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
                      failed: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
                    };
                    return (
                      <tr key={video.id} className="border-b border-white/4 hover:bg-white/3">
                        <td className="py-3 pr-4 text-slate-500">{(videoPage - 1) * 20 + idx + 1}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-300 truncate max-w-[200px]">
                          {video.original_id || video.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-right text-white">{video.views.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{video.likes.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{video.comments_count.toLocaleString()}</td>
                        <td className="py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClasses[video.status] || 'border-white/10 bg-white/5 text-slate-300'}`}>
                            {video.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {videoTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setVideoPage((p) => Math.max(1, p - 1))}
                  disabled={videoPage === 1}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="text-xs text-slate-400">
                  Trang {videoPage} / {videoTotalPages}
                </span>
                <button
                  onClick={() => setVideoPage((p) => Math.min(videoTotalPages, p + 1))}
                  disabled={videoPage === videoTotalPages}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có video nào từ kênh này
          </div>
        )}
      </div>
    </div>
  );
}

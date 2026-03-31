import { useState } from 'react';
import { ArrowLeft, RefreshCw, Users, Video, Eye, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MOCK_METRICS_HISTORY = [
  { date: '2026-03-24', followers: 118000, video_count: 82, total_views: 2200000 },
  { date: '2026-03-25', followers: 119500, video_count: 83, total_views: 2280000 },
  { date: '2026-03-26', followers: 121000, video_count: 85, total_views: 2350000 },
  { date: '2026-03-27', followers: 122500, video_count: 86, total_views: 2420000 },
  { date: '2026-03-28', followers: 124000, video_count: 87, total_views: 2480000 },
  { date: '2026-03-29', followers: 124500, video_count: 88, total_views: 2490000 },
  { date: '2026-03-30', followers: 125000, video_count: 89, total_views: 2500000 },
];

export function ChannelDetailPage({ channel, onBack }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  const metrics = channel?.latest_metrics || {};
  const history = MOCK_METRICS_HISTORY;
  
  const today = history[history.length - 1] || {};
  const yesterday = history[history.length - 2] || {};
  
  const followerDiff = today.followers - yesterday.followers;
  const videoDiff = today.video_count - yesterday.video_count;
  const viewsDiff = today.total_views - yesterday.total_views;

  const lastSyncTime = channel?.latest_metrics?.snapshot_date || null;
  const formattedLastSync = lastSyncTime 
    ? new Date(lastSyncTime).toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      })
    : 'Chưa từng sync';

  const handleSync = async () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const chartData = history.map(item => ({
    date: item.date.split('-').slice(1).join('/'),
    followers: item.followers,
    video_count: item.video_count,
    views: Math.round(item.total_views / 1000),
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
            {today.followers?.toLocaleString() || 0}
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
            {today.total_views?.toLocaleString() || 0}
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
      </div>

      <div className="rounded-[22px] border border-white/8 bg-black/10 p-6">
        <h2 className="font-display text-lg font-semibold text-white mb-4">Views Trend</h2>
        <div className="h-[200px]">
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
                fill="#34d399"
                fillOpacity={0.1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
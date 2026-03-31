import { Play, Pause, RefreshCw, Trash2, MoreVertical, Users, Video, Clock } from 'lucide-react';
import { useState } from 'react';

export function CampaignCard({ campaign, onEdit, onDelete, onToggleStatus, onSync }) {
  const [showActions, setShowActions] = useState(false);
  const isActive = campaign.status === 'active';
  
  const getStatusBadge = () => {
    if (campaign.status === 'active') {
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-100">
          Đang chạy
        </span>
      );
    }
    if (campaign.status === 'paused') {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium text-amber-100">
          Tạm dừng
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-300">
        Hoàn thành
      </span>
    );
  };

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-white/8 bg-black/10 p-4 transition hover:border-white/16 hover:bg-black/15">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-white truncate">
              {campaign.name}
            </h3>
            {getStatusBadge()}
          </div>
          
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            <span>{campaign.channel_count} kênh</span>
            <span className="text-white/20">•</span>
            <Video className="h-3.5 w-3.5" />
            <span>{campaign.stats.total_videos} video</span>
          </div>
          
          {campaign.topic && (
            <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 capitalize">
              {campaign.topic}
            </span>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 opacity-0 transition hover:border-white/18 hover:bg-white/10 hover:text-white group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-white/12 bg-[var(--panel-bg)] py-1 shadow-xl">
              <button
                onClick={() => {
                  onEdit && onEdit(campaign);
                  setShowActions(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Sửa chiến dịch
              </button>
              <button
                onClick={() => {
                  onSync && onSync(campaign.id);
                  setShowActions(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Đồng bộ ngay
              </button>
              <button
                onClick={() => {
                  onToggleStatus && onToggleStatus(campaign.id);
                  setShowActions(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isActive ? 'Tạm dừng' : 'Kích hoạt'}
              </button>
              <hr className="my-1 border-white/10" />
              <button
                onClick={() => {
                  onDelete && onDelete(campaign.id);
                  setShowActions(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-white/5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/6 pt-3">
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Sẵn sàng</div>
          <div className="text-lg font-semibold text-amber-100">{campaign.stats.ready}</div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Đã đăng</div>
          <div className="text-lg font-semibold text-emerald-100">{campaign.stats.posted}</div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Đang chờ</div>
          <div className="text-lg font-semibold text-cyan-100">{campaign.stats.pending}</div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Thất bại</div>
          <div className="text-lg font-semibold text-rose-100">{campaign.stats.failed}</div>
        </div>
      </div>
      
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span>Tạo ngày {new Date(campaign.created_at).toLocaleDateString('vi-VN')}</span>
      </div>
    </div>
  );
}

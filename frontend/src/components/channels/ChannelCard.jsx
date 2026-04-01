import { MoreVertical, Edit2, Trash2, Power, Users, Video, Eye } from 'lucide-react';
import { useState } from 'react';

export function ChannelCard({ channel, onEdit, onDelete, onToggleStatus, onClick }) {
  const [showMenu, setShowMenu] = useState(false);
  const isActive = channel.status === 'active';
  const metrics = channel.latest_metrics;

  const handleCardClick = (e) => {
    if (onClick && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('[data-menu]')) {
      onClick(channel);
    }
  };

  return (
    <div
      className="group relative overflow-hidden rounded-[22px] border border-white/8 bg-black/10 p-4 transition hover:border-white/16 hover:bg-black/15 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-semibold text-white truncate">
              @{channel.username}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                isActive
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {isActive ? 'Hoạt động' : 'Dừng'}
            </span>
          </div>
          {channel.display_name && (
            <p className="mt-1 text-sm text-slate-300 truncate">{channel.display_name}</p>
          )}
          {channel.topic && (
            <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 capitalize">
              {channel.topic}
            </span>
          )}
        </div>

        <div className="relative" data-menu>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 opacity-0 transition hover:border-white/18 hover:bg-white/10 hover:text-white group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-white/10 bg-[var(--panel-bg)] shadow-xl">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStatus?.(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                <Power className="h-3.5 w-3.5" />
                {isActive ? 'Chuyển inactive' : 'Chuyển active'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Sửa kênh
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-white/5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa kênh
              </button>
            </div>
          )}
        </div>
      </div>

      {metrics && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-white/6 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            <span>{metrics.followers?.toLocaleString() ?? '--'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Video className="h-3.5 w-3.5" />
            <span>{metrics.video_count ?? '--'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Eye className="h-3.5 w-3.5" />
            <span>{metrics.total_views?.toLocaleString() ?? '--'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

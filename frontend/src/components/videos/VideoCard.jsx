import { Eye, Heart, MessageCircle, Clock, GripVertical, Play, MoreVertical, RefreshCw, Trash2, Edit, Send } from 'lucide-react';
import { useState } from 'react';

export function VideoCard({ video, onPreview, onRetry, onDelete, onEditPriority, onPublish }) {
  const [showMenu, setShowMenu] = useState(false);
  
  const getStatusBadge = () => {
    const statusMap = {
      pending: { label: 'Đang chờ', tone: 'sky', class: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' },
      downloading: { label: 'Đang tải', tone: 'sky', class: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' },
      ready: { label: 'Sẵn sàng', tone: 'amber', class: 'border-amber-400/25 bg-amber-400/10 text-amber-100' },
      posted: { label: 'Đã đăng', tone: 'emerald', class: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' },
      failed: { label: 'Thất bại', tone: 'rose', class: 'border-rose-400/25 bg-rose-400/10 text-rose-100' },
      publishing: { label: 'Đang đăng...', tone: 'amber', class: 'border-amber-400/25 bg-amber-400/10 text-amber-100 animate-pulse' },
    };
    const status = statusMap[video.status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.class}`}>
        {status.label}
      </span>
    );
  };

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-white/8 bg-black/10 transition hover:border-white/16 hover:bg-black/15">
      <div className="flex">
        <div className="flex cursor-grab items-center justify-center bg-white/5 px-2 py-4 text-slate-600 hover:text-slate-400">
          <GripVertical className="h-5 w-5" />
        </div>
        
        <div className="relative min-w-[140px] w-[140px] shrink-0">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="Thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/20">
              <Play className="h-8 w-8 text-slate-600" />
            </div>
          )}
          <div className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white">
            #{video.priority}
          </div>
        </div>
        
        <div className="flex flex-1 flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {getStatusBadge()}
              <p className="mt-2 line-clamp-2 text-sm font-medium text-white">
                {video.ai_caption || video.original_caption || 'Không có caption'}
              </p>
              <p className="mt-1 text-xs text-slate-500 truncate">
                {video.campaign_name}
              </p>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 opacity-0 transition hover:border-white/18 hover:bg-white/10 hover:text-white group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-white/12 bg-[var(--panel-bg)] py-1 shadow-xl">
                  <button
                    onClick={() => { onPreview && onPreview(video); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Xem chi tiết
                  </button>
                  {video.status === 'ready' && (
                    <button
                      onClick={() => { onPublish && onPublish(video.id); setShowMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-white/5 hover:text-emerald-300"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Đăng video
                    </button>
                  )}
                  {video.status === 'failed' && (
                    <button
                      onClick={() => { onRetry && onRetry(video.id); setShowMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Thử lại
                    </button>
                  )}
                  <button
                    onClick={() => { onDelete && onDelete(video.id); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-white/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Eye className="h-3.5 w-3.5" />
              <span>{video.views?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Heart className="h-3.5 w-3.5" />
              <span>{video.likes?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{video.comments_count?.toLocaleString()}</span>
            </div>
            {video.publish_time && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(video.publish_time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
              </div>
            )}
            {video.status === 'posted' && video.fb_post_id && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <span>Post ID: {video.fb_post_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {video.status === 'failed' && video.error_message && (
        <div className="border-t border-white/6 px-4 py-2">
          <p className="text-xs text-rose-400">Lỗi: {video.error_message}</p>
        </div>
      )}
    </div>
  );
}

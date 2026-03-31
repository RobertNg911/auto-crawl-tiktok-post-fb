import { useState, useEffect } from 'react';
import { X, Play, Pause, Clock, Calendar, Edit3, RefreshCw, Send, ExternalLink, Loader2, CheckCircle, AlertCircle, TrendingUp, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';

export function VideoPreviewModal({ video, onClose, onSave, onRetry, onRegenerateCaption, onPublish }) {
  const [caption, setCaption] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishError, setPublishError] = useState(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState(null);

  useEffect(() => {
    if (video) {
      setCaption(video.ai_caption || video.original_caption || '');
      setPublishTime(video.publish_time ? video.publish_time.slice(0, 16) : '');
      setPublishError(null);
      setPublishSuccess(false);
      setPublishedPostId(null);
    }
  }, [video]);

  if (!video) return null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishProgress(0);
    setPublishError(null);
    
    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 200));
        setPublishProgress(i);
      }
      
      if (onPublish) {
        const postId = await onPublish(video.id);
        setPublishedPostId(postId);
      }
      
      setPublishSuccess(true);
    } catch (err) {
      setPublishError(err.message || 'Đăng video thất bại');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave && onSave({ ai_caption: caption, publish_time: publishTime });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    const statusMap = {
      pending: { label: 'Đang chờ', class: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' },
      downloading: { label: 'Đang tải', class: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' },
      ready: { label: 'Sẵn sàng', class: 'border-amber-400/25 bg-amber-400/10 text-amber-100' },
      posted: { label: 'Đã đăng', class: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' },
      failed: { label: 'Thất bại', class: 'border-rose-400/25 bg-rose-400/10 text-rose-100' },
      publishing: { label: 'Đang đăng...', class: 'border-amber-400/25 bg-amber-400/10 text-amber-100 animate-pulse' },
    };
    const status = statusMap[video.status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${status.class}`}>
        {status.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[24px] border border-white/12 bg-[var(--panel-bg)] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/8 p-4">
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <span className="text-sm text-slate-400">#{video.priority}</span>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/18 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/2">
            {video.thumbnail_url ? (
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-bl-[24px]">
                <img src={video.thumbnail_url} alt="Video thumbnail" className="h-full w-full object-cover" />
                <button className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Play className="ml-1 h-8 w-8 text-white" />
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex aspect-[9/16] w-full items-center justify-center bg-black/20 rounded-bl-[24px]">
                <Play className="h-16 w-16 text-slate-600" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="mb-4">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-cyan-400">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div className="mt-1 font-semibold text-white">{video.views?.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Lượt xem</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-rose-400">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div className="mt-1 font-semibold text-white">{video.likes?.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Lượt thích</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-400">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="mt-1 font-semibold text-white">{video.comments_count?.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Bình luận</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-400">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div className="mt-1 font-semibold text-white">{video.shares?.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Chia sẻ</div>
                </div>
              </div>
            </div>

            {video.metrics_history && video.metrics_history.length > 0 && (
              <div className="mb-4 rounded-xl border border-white/8 bg-black/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <TrendingUp className="h-4 w-4" />
                  Lịch sử metrics
                </div>
                <div className="space-y-2">
                  {video.metrics_history.map((snapshot, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{new Date(snapshot.date).toLocaleDateString('vi-VN')}</span>
                      <div className="flex gap-4 text-slate-400">
                        <span><Eye className="mr-1 inline h-3 w-3" />{snapshot.views?.toLocaleString()}</span>
                        <span><Heart className="mr-1 inline h-3 w-3" />{snapshot.likes?.toLocaleString()}</span>
                        <span><MessageCircle className="mr-1 inline h-3 w-3" />{snapshot.comments}</span>
                        <span><Share2 className="mr-1 inline h-3 w-3" />{snapshot.shares}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs uppercase tracking-[0.28em] text-slate-400">Caption AI</label>
                <button
                  onClick={() => onRegenerateCaption && onRegenerateCaption(video.id)}
                  className="flex items-center gap-1 text-xs text-cyan-400 transition hover:text-cyan-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tạo lại
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => { setCaption(e.target.value); setIsEditing(true); }}
                rows={6}
                className="field-input w-full resize-none rounded-xl px-4 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">{caption.length}/2200 ký tự</p>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                Lên lịch đăng
              </label>
              <input
                type="datetime-local"
                value={publishTime}
                onChange={(e) => { setPublishTime(e.target.value); setIsEditing(true); }}
                className="field-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              {video.status === 'failed' && (
                <button
                  onClick={() => onRetry && onRetry(video.id)}
                  className="btn-secondary flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Thử lại tải
                </button>
              )}
              
              {(video.status === 'ready' || video.status === 'publishing') && !publishSuccess && (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="btn-primary flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang đăng... {Math.round(publishProgress)}%
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Đăng ngay
                    </>
                  )}
                </button>
              )}

              {isPublishing && (
                <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white/5 p-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${publishProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{Math.round(publishProgress)}%</span>
                </div>
              )}

              {publishSuccess && (
                <div className="flex w-full flex-col gap-2 rounded-2xl bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <CheckCircle className="h-4 w-4" />
                    Đăng thành công!
                  </div>
                  {(publishedPostId || video.fb_post_id) && (
                    <div className="text-xs text-slate-400">
                      Post ID: <span className="font-mono text-emerald-300">{publishedPostId || video.fb_post_id}</span>
                    </div>
                  )}
                </div>
              )}

              {publishError && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  {publishError}
                </div>
              )}

              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              )}

              {video.fb_post_id && (
                <a
                  href={`https://www.facebook.com/watch/?v=${video.fb_post_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Xem trên Facebook
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

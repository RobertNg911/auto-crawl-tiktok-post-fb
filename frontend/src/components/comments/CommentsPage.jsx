import { useState, useEffect } from 'react';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STATUS_META = {
  replied: { label: 'Đã trả lời', tone: 'emerald', icon: CheckCircle },
  ignored: { label: 'Bỏ qua', tone: 'slate', icon: XCircle },
  failed: { label: 'Thất bại', tone: 'rose', icon: AlertTriangle },
  pending: { label: 'Đang chờ', tone: 'amber', icon: Clock },
};

const TONE_CLASSES = {
  emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  slate: 'border-white/10 bg-white/5 text-slate-200',
  rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  sky: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
};

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

function formatDateTime(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString.endsWith('Z') ? isoString : `${isoString}Z`);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeText(value, maxLength = 120) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '--';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

export function CommentsPage({ token, fbPages }) {
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState({ total: 0, replied: 0, ignored: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    pageId: 'all',
    hasReply: 'all',
    postId: '',
  });
  const [expandedComment, setExpandedComment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const authToken = token || localStorage.getItem('token');

  const fetchComments = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (filters.pageId !== 'all') params.set('page_id', filters.pageId);
      if (filters.hasReply !== 'all') params.set('has_reply', filters.hasReply);
      if (filters.postId) params.set('post_id', filters.postId);

      const [commentsRes, statsRes] = await Promise.all([
        fetch(`/api/comments?${params.toString()}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(
          `/api/comments/stats${filters.pageId !== 'all' ? `?page_id=${filters.pageId}` : ''}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        ),
      ]);

      if (commentsRes.ok) {
        const data = await commentsRes.json();
        setComments(data.items);
        setTotalPages(data.total_pages);
        setTotalItems(data.total);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleExpanded = (id) => {
    setExpandedComment((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Nhật ký bình luận</h1>
          <p className="mt-1 text-sm text-gray-400">
            Theo dõi và quản lý phản hồi AI cho bình luận Facebook
          </p>
        </div>
        <button
          onClick={fetchComments}
          disabled={loading}
          className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { key: 'total', label: 'Tổng', tone: 'sky' },
          { key: 'replied', label: 'Đã trả lời', tone: 'emerald' },
          { key: 'pending', label: 'Đang chờ', tone: 'amber' },
          { key: 'ignored', label: 'Bỏ qua', tone: 'slate' },
          { key: 'failed', label: 'Thất bại', tone: 'rose' },
        ].map((item) => (
          <div
            key={item.key}
            className={cx(
              'rounded-xl border p-4',
              TONE_CLASSES[item.tone],
            )}
          >
            <div className="text-[11px] uppercase tracking-wider opacity-80">{item.label}</div>
            <div className="mt-1 text-2xl font-bold">{stats[item.key] || 0}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
        >
          <Filter className="h-4 w-4" />
          Bộ lọc
        </button>
        <span className="text-sm text-gray-400">
          {totalItems} bình luận
        </span>
      </div>

      {showFilters && (
        <div className="panel-surface rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fanpage</label>
              <select
                value={filters.pageId}
                onChange={(e) => handleFilterChange('pageId', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="all">Tất cả</option>
                {fbPages?.map((p) => (
                  <option key={p.page_id} value={p.page_id}>
                    {p.page_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Trạng thái</label>
              <select
                value={filters.hasReply}
                onChange={(e) => handleFilterChange('hasReply', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="all">Tất cả</option>
                <option value="true">Đã trả lời</option>
                <option value="false">Chưa trả lời</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Post ID</label>
              <input
                type="text"
                value={filters.postId}
                onChange={(e) => handleFilterChange('postId', e.target.value)}
                placeholder="Lọc theo post..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && comments.length === 0 ? (
          <div className="panel-surface rounded-xl p-8 text-center text-gray-400">
            Đang tải...
          </div>
        ) : comments.length === 0 ? (
          <div className="panel-surface rounded-xl p-8 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-gray-500" />
            <p className="mt-2 text-sm text-gray-400">Chưa có bình luận nào</p>
          </div>
        ) : (
          comments.map((comment) => {
            const statusMeta = STATUS_META[comment.status] || STATUS_META.pending;
            const StatusIcon = statusMeta.icon;
            const isExpanded = expandedComment === comment.id;

            return (
              <div
                key={comment.id}
                className="panel-surface rounded-xl border border-white/5 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(comment.id)}
                  className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500 truncate">
                          {comment.sender_id?.slice(0, 12)}...
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">
                          {comment.page_name || comment.page_id}
                        </span>
                      </div>
                      <p className="text-sm text-white truncate">
                        {summarizeText(comment.message, 100)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cx(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          TONE_CLASSES[statusMeta.tone],
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusMeta.label}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/5 px-4 py-3 space-y-3 bg-black/20">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                        Bình luận
                      </div>
                      <p className="text-sm text-white">{comment.message || '--'}</p>
                    </div>

                    {comment.reply_message && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                          Phản hồi AI
                        </div>
                        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
                          <p className="text-sm text-cyan-100">{comment.reply_message}</p>
                        </div>
                      </div>
                    )}

                    {!comment.reply_message && comment.status === 'ignored' && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                          Lý do bỏ qua
                        </div>
                        <p className="text-xs text-gray-400">{comment.reply_message || '--'}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                      <div>
                        <span className="text-gray-400">Comment ID:</span>{' '}
                        <span className="font-mono">{comment.comment_id}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Post ID:</span>{' '}
                        <span className="font-mono">{comment.post_id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-ghost inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-ghost inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

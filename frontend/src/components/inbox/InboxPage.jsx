import { useEffect, useState } from 'react';
import {
  ExternalLink,
  AlertTriangle,
  CircleCheck,
  RefreshCw,
  MessagesSquare,
  Send,
  User,
  Clock,
  Bot,
  FileText,
  Target,
  Lightbulb,
  Search,
  Filter,
} from 'lucide-react';

const API_URL = '/api';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

const CONVERSATION_STATUS_META = {
  ai_active: { label: 'AI đang xử lý', tone: 'sky' },
  operator_active: { label: 'Cần operator', tone: 'rose' },
  resolved: { label: 'Đã xử lý', tone: 'emerald' },
  open: { label: 'Mở', tone: 'sky' },
  need_operator: { label: 'Cần operator', tone: 'rose' },
};

const TONE_CLASSES = {
  slate: 'border-white/10 bg-white/5 text-slate-200',
  sky: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
  emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
};

const FIELD_CLASS = 'field-input w-full rounded-2xl px-4 py-3 text-sm text-white';
const BUTTON_DISABLED = 'disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_PRIMARY = `btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${BUTTON_DISABLED}`;
const BUTTON_SECONDARY = `btn-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${BUTTON_DISABLED}`;
const BUTTON_GHOST = `btn-ghost inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${BUTTON_DISABLED}`;

function StatusPill({ tone = 'slate', icon: Icon, children, className = '' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium',
        TONE_CLASSES[tone] || TONE_CLASSES.slate,
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{children}</span>
    </span>
  );
}

function formatDateTime(isoString) {
  if (!isoString) return 'Chưa có';
  const date = new Date(`${isoString}${isoString.endsWith('Z') ? '' : 'Z'}`);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelTime(isoString) {
  if (!isoString) return 'Chưa có';
  const date = new Date(`${isoString}${isoString.endsWith('Z') ? '' : 'Z'}`);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.floor(diffHours / 24)} ngày trước`;
}

function formatIntentLabel(intent) {
  const normalized = (intent || '').trim();
  if (!normalized) return 'Chưa xác định';
  return normalized.replace(/_/g, ' ');
}

function getConversationStatusMeta(status) {
  return CONVERSATION_STATUS_META[status] || { label: status || 'Chưa rõ', tone: 'slate' };
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center sm:rounded-[22px] sm:px-5 sm:py-7">
      <div className="font-display text-base font-semibold text-white sm:text-lg">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[var(--text-soft)]">{description}</p>
    </div>
  );
}

function InfoRow({ label, value, emphasis = false }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/6 bg-black/10 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
      <span className={cx('text-left text-[13px] sm:text-right', emphasis ? 'font-semibold text-white' : 'text-[var(--text-soft)]')}>{value}</span>
    </div>
  );
}

function MessageBubble({ message, isCustomer, isOperator, isAI }) {
  const bubbleClass = isCustomer
    ? 'ml-auto bg-cyan-400/15 border-cyan-400/20 text-cyan-50'
    : isOperator
      ? 'mr-auto bg-emerald-400/15 border-emerald-400/20 text-emerald-50'
      : 'mr-auto bg-white/5 border-white/10 text-slate-200';

  const senderLabel = isCustomer ? 'Khách hàng' : isOperator ? 'Operator' : 'AI';

  return (
    <div className={cx('flex flex-col', isCustomer ? 'items-end' : 'items-start')}>
      <div className="mb-1 flex items-center gap-2 px-1">
        <span className="text-[11px] text-[var(--text-muted)]">{senderLabel}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{formatRelTime(message.time)}</span>
      </div>
      <div className={cx('max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed', bubbleClass)}>
        {message.text}
      </div>
    </div>
  );
}

function ConversationItem({ conversation, isSelected, onClick, pageName }) {
  const statusMeta = getConversationStatusMeta(conversation.status);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-full rounded-xl border p-3 text-left transition',
        isSelected
          ? 'border-cyan-400/30 bg-cyan-400/15'
          : 'border-white/8 bg-black/10 hover:border-white/15 hover:bg-black/15'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-100">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{conversation.sender_name || conversation.sender_id}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{pageName || conversation.page_id}</div>
            </div>
          </div>
          <div className="mt-2 truncate text-xs text-[var(--text-soft)]">
            {conversation.latest_preview || conversation.conversation_summary || 'Chưa có nội dung.'}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[10px] text-[var(--text-muted)]">{formatRelTime(conversation.latest_activity_at || conversation.updated_at)}</span>
          <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
          {conversation.current_intent && (
            <StatusPill tone="amber">{formatIntentLabel(conversation.current_intent)}</StatusPill>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><MessagesSquare className="h-3 w-3" /> {conversation.message_count ?? 0}</span>
        {conversation.assigned_user && (
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {conversation.assigned_user.display_name}</span>
        )}
      </div>
    </button>
  );
}

export function InboxPage({ token, currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [logs, setLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState('all');
  const [pages, setPages] = useState([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [actionState, setActionState] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAIContext, setShowAIContext] = useState(true);

  const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  };

  const requestJson = async (url, options = {}) => {
    const response = await authFetch(url, options);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'Yêu cầu không thành công.');
    return payload;
  };

  const setBusy = (key, value) => setActionState((current) => ({ ...current, [key]: value }));

  const fetchPages = async () => {
    try {
      const data = await requestJson(`${API_URL}/facebook/config`);
      setPages(data);
    } catch {
      setPages([]);
    }
  };

  const fetchConversations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '80' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await requestJson(`${API_URL}/webhooks/conversations?${params.toString()}`);
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetail = async (conversationId) => {
    if (!conversationId) {
      setSelectedConversation(null);
      setLogs([]);
      return;
    }
    try {
      const data = await requestJson(`${API_URL}/webhooks/conversations/${conversationId}`);
      setSelectedConversation(data.conversation || null);
      setLogs(data.logs || []);
    } catch {
      setSelectedConversation(null);
      setLogs([]);
    }
  };

  const handleConversationUpdate = async (conversationId, payload) => {
    setBusy(`update-${conversationId}`, true);
    try {
      const result = await requestJson(`${API_URL}/webhooks/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result?.conversation) {
        setConversations((current) =>
          current.map((c) => (c.id === conversationId ? { ...c, ...result.conversation } : c))
        );
        if (selectedId === conversationId) {
          setSelectedConversation((current) => ({ ...(current || {}), ...result.conversation }));
        }
      }
      return result;
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setBusy(`update-${conversationId}`, false);
    }
  };

  const handleStatusChange = async (conversationId, status, handoffReason = '') => {
    await handleConversationUpdate(conversationId, { status, handoff_reason: handoffReason });
  };

  const handleReply = async (markResolved = false) => {
    if (!selectedId) return;
    const message = replyDraft.trim();
    if (message.length < 2) return;

    setBusy(`reply-${selectedId}`, true);
    try {
      const result = await requestJson(`${API_URL}/webhooks/conversations/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mark_resolved: markResolved }),
      });
      if (result) {
        setReplyDraft('');
        await loadConversationDetail(selectedId);
        await fetchConversations();
      }
    } catch (error) {
      console.error('Reply failed:', error);
    } finally {
      setBusy(`reply-${selectedId}`, false);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchConversations();
  }, [token, statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    loadConversationDetail(selectedId);
    const interval = setInterval(() => loadConversationDetail(selectedId), 10000);
    return () => clearInterval(interval);
  }, [selectedId, token]);

  const filteredConversations = conversations.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (c.sender_name || '').toLowerCase().includes(q) ||
        (c.sender_id || '').toLowerCase().includes(q) ||
        (c.latest_preview || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (pageFilter !== 'all' && c.page_id !== pageFilter) return false;
    return true;
  });

  const selectedStatusMeta = getConversationStatusMeta(selectedConversation?.status);
  const selectedPageName = pages.find((p) => p.page_id === selectedConversation?.page_id)?.page_name;

  const buildTimeline = () => {
    const events = [];
    logs.forEach((log) => {
      const customerText = (log.user_message || '').trim();
      if (customerText) {
        events.push({
          id: `${log.id}-customer`,
          type: 'customer',
          text: customerText,
          time: log.created_at,
        });
      }
      const replyText = (log.ai_reply || '').trim();
      if (replyText && (log.status === 'replied' || log.facebook_reply_message_id || log.reply_source)) {
        const isOperator = log.reply_source === 'operator';
        events.push({
          id: `${log.id}-reply`,
          type: isOperator ? 'operator' : 'ai',
          text: replyText,
          time: log.updated_at || log.created_at,
        });
      }
    });
    return events.sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
  };

  const timeline = buildTimeline();

  const getFactsEntries = () => {
    const facts = selectedConversation?.customer_facts;
    if (!facts || typeof facts !== 'object') return [];
    return Object.entries(facts).filter(([k, v]) => k && v);
  };

  return (
    <div className="h-[calc(100vh-5rem)]">
      <div className="flex h-full gap-4">
        {/* Left Panel - Conversation List */}
        <div className="flex w-80 shrink-0 flex-col rounded-[22px] border border-white/8 bg-black/20">
          {/* Header */}
          <div className="border-b border-white/8 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Inbox</h2>
              <button
                type="button"
                className={BUTTON_GHOST}
                onClick={fetchConversations}
                disabled={loading}
              >
                <RefreshCw className={cx('h-4 w-4', loading ? 'animate-spin' : '')} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                className={cx(FIELD_CLASS, 'pl-9')}
                placeholder="Tìm theo tên hoặc nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Page Filter */}
            <div className="mt-2 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <select
                className={cx(FIELD_CLASS, 'py-2 text-xs')}
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
              >
                <option value="all" style={{ color: '#06101a' }}>Tất cả fanpage</option>
                {pages.map((p) => (
                  <option key={p.page_id} value={p.page_id} style={{ color: '#06101a' }}>{p.page_name}</option>
                ))}
              </select>
            </div>

            {/* Status Tabs */}
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'operator_active', label: 'Cần operator' },
                { value: 'ai_active', label: 'AI active' },
                { value: 'resolved', label: 'Đã xử lý' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={cx(
                    'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                    statusFilter === tab.value
                      ? 'bg-cyan-400/20 text-cyan-100'
                      : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyState title="Không có conversation" description="Không tìm thấy conversation phù hợp với bộ lọc." />
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedId === conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  pageName={pages.find((p) => p.page_id === conv.page_id)?.page_name}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Conversation Detail */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selectedConversation ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="Chọn một cuộc trò chuyện"
                description="Chọn conversation từ danh sách bên trái để xem chi tiết và phản hồi."
              />
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-100">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-display text-lg font-semibold text-white">
                          {selectedConversation.sender_name || selectedConversation.sender_id}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {selectedPageName || selectedConversation.page_id}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill tone={selectedStatusMeta.tone}>{selectedStatusMeta.label}</StatusPill>
                      {selectedConversation.current_intent && (
                        <StatusPill tone="amber">{formatIntentLabel(selectedConversation.current_intent)}</StatusPill>
                      )}
                      {selectedConversation.assigned_user && (
                        <StatusPill tone="slate">
                          <User className="h-3 w-3" /> {selectedConversation.assigned_user.display_name}
                        </StatusPill>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.facebook_thread_url && (
                      <a
                        href={selectedConversation.facebook_thread_url}
                        target="_blank"
                        rel="noreferrer"
                        className={BUTTON_GHOST}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Mở trên Facebook
                      </a>
                    )}

                    {selectedConversation.status === 'operator_active' ? (
                      <>
                        <button
                          type="button"
                          className={BUTTON_SECONDARY}
                          onClick={() => handleStatusChange(selectedConversation.id, 'resolved')}
                          disabled={actionState[`update-${selectedConversation.id}`]}
                        >
                          <CircleCheck className="h-4 w-4" />
                          Đánh dấu đã xử lý
                        </button>
                        <button
                          type="button"
                          className={BUTTON_GHOST}
                          onClick={() => handleStatusChange(selectedConversation.id, 'ai_active')}
                          disabled={actionState[`update-${selectedConversation.id}`]}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Bật lại AI
                        </button>
                      </>
                    ) : selectedConversation.status === 'resolved' ? (
                      <>
                        <button
                          type="button"
                          className={cx(BUTTON_GHOST, 'border-rose-400/20 bg-rose-400/10 text-rose-100')}
                          onClick={() => handleStatusChange(selectedConversation.id, 'operator_active', 'Đã mở lại để operator hỗ trợ tiếp.')}
                          disabled={actionState[`update-${selectedConversation.id}`]}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Mở lại cho operator
                        </button>
                        <button
                          type="button"
                          className={BUTTON_GHOST}
                          onClick={() => handleStatusChange(selectedConversation.id, 'ai_active')}
                          disabled={actionState[`update-${selectedConversation.id}`]}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Bật lại AI
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={cx(BUTTON_GHOST, 'border-rose-400/20 bg-rose-400/10 text-rose-100')}
                        onClick={() => handleStatusChange(selectedConversation.id, 'operator_active', 'Đã chuyển cho nhân viên tư vấn hỗ trợ tiếp.')}
                        disabled={actionState[`update-${selectedConversation.id}`]}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Chuyển operator
                      </button>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <InfoRow label="Tin khách cuối" value={formatRelTime(selectedConversation.last_customer_message_at)} />
                  <InfoRow label="AI phản hồi cuối" value={formatRelTime(selectedConversation.last_ai_reply_at)} />
                  <InfoRow label="Operator phản hồi cuối" value={formatRelTime(selectedConversation.last_operator_reply_at)} />
                  <InfoRow label="Đóng case lúc" value={formatDateTime(selectedConversation.resolved_at)} />
                </div>
              </div>

              {/* AI Context + Timeline */}
              <div className="mt-4 flex flex-1 gap-4 min-h-0">
                {/* AI Context Panel (Collapsible) */}
                {showAIContext && (
                  <div className="w-72 shrink-0 space-y-3 overflow-y-auto">
                    {/* Summary */}
                    <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Tóm tắt</span>
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-white">
                        {selectedConversation.conversation_summary || 'Chưa có tóm tắt hội thoại.'}
                      </div>
                      {selectedConversation.handoff_reason && (
                        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                          {selectedConversation.handoff_reason}
                        </div>
                      )}
                    </div>

                    {/* Intent */}
                    <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Intent</span>
                      </div>
                      <div className="mt-2">
                        <StatusPill tone="amber">
                          {formatIntentLabel(selectedConversation.current_intent)}
                        </StatusPill>
                      </div>
                    </div>

                    {/* Facts */}
                    <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Customer Facts</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getFactsEntries().length > 0 ? (
                          getFactsEntries().map(([key, value]) => (
                            <StatusPill key={key} tone="slate">
                              {formatIntentLabel(key)}: {value}
                            </StatusPill>
                          ))
                        ) : (
                          <StatusPill tone="slate">Chưa có facts</StatusPill>
                        )}
                      </div>
                    </div>

                    {/* Internal Note */}
                    {selectedConversation.internal_note && (
                      <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/10 p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-300" />
                          <span className="text-xs uppercase tracking-[0.24em] text-amber-200">Ghi chú nội bộ</span>
                        </div>
                        <div className="mt-2 text-sm leading-relaxed text-amber-100">
                          {selectedConversation.internal_note}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Timeline + Reply Form */}
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* Toggle AI Context */}
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      className={cx(BUTTON_GHOST, 'min-h-8 px-3 py-1 text-xs')}
                      onClick={() => setShowAIContext(!showAIContext)}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      {showAIContext ? 'Ẩn AI Context' : 'Hiện AI Context'}
                    </button>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 space-y-4 overflow-y-auto rounded-[20px] border border-white/8 bg-black/20 p-4">
                    {timeline.length === 0 ? (
                      <EmptyState title="Chưa có tin nhắn" description="Timeline sẽ hiển thị khi có tin nhắn." />
                    ) : (
                      timeline.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isCustomer={msg.type === 'customer'}
                          isOperator={msg.type === 'operator'}
                          isAI={msg.type === 'ai'}
                        />
                      ))
                    )}
                  </div>

                  {/* Reply Form */}
                  <div className="mt-3 rounded-[20px] border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Phản hồi</span>
                      {selectedConversation.status === 'operator_active' && (
                        <StatusPill tone="rose" icon={AlertTriangle}>Đang cần người thật</StatusPill>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <textarea
                        className={cx(FIELD_CLASS, 'flex-1 min-h-[80px] resize-none')}
                        placeholder="Nhập phản hồi..."
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleReply(false);
                          }
                        }}
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className={cx(BUTTON_PRIMARY, 'min-h-[40px] px-4')}
                          onClick={() => handleReply(false)}
                          disabled={actionState[`reply-${selectedId}`] || replyDraft.trim().length < 2}
                        >
                          <Send className="h-4 w-4" />
                          Gửi
                        </button>
                        <button
                          type="button"
                          className={cx(BUTTON_SECONDARY, 'min-h-[40px] px-4')}
                          onClick={() => handleReply(true)}
                          disabled={actionState[`reply-${selectedId}`] || replyDraft.trim().length < 2}
                        >
                          <CircleCheck className="h-4 w-4" />
                          Gửi & Đóng
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                      Ctrl+Enter để gửi nhanh
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

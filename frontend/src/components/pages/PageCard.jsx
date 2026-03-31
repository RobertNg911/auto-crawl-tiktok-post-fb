import {
  Settings,
  RefreshCw,
  MessageCircle,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const STATUS_TOKENS = {
  page_access_token: { label: 'Token hợp lệ', tone: 'emerald', Icon: CheckCircle },
  user_access_token: { label: 'User token', tone: 'rose', Icon: XCircle },
  invalid_token: { label: 'Token không hợp lệ', tone: 'rose', Icon: XCircle },
  missing: { label: 'Chưa có token', tone: 'slate', Icon: XCircle },
};

export function PageCard({ page, onSettings, onRefreshToken }) {
  const tokenStatus = STATUS_TOKENS[page.token_kind || 'missing'];
  const TokenIcon = tokenStatus?.Icon || XCircle;

  const isCommentAutoEnabled = page.comment_auto_reply_enabled !== false;
  const isInboxAutoEnabled = page.message_auto_reply_enabled === true;

  return (
    <div className="panel-surface rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {page.page_name}
          </h3>
          <p className="mt-1 text-xs text-gray-400 font-mono">
            {page.page_id}
          </p>
        </div>
        <button
          onClick={onSettings}
          className="ml-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium border-${tokenStatus.tone}-400/25 bg-${tokenStatus.tone}-400/10 text-${tokenStatus.tone}-100`}
        >
          <TokenIcon className="h-3.5 w-3.5" />
          {tokenStatus?.label || 'Chưa rõ'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Send className={`h-4 w-4 ${isCommentAutoEnabled ? 'text-emerald-400' : 'text-gray-600'}`} />
          </div>
          <p className="mt-1 text-xs text-gray-400">Auto Post</p>
          <p className={`text-sm font-semibold ${isCommentAutoEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
            {isCommentAutoEnabled ? 'On' : 'Off'}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <MessageCircle className={`h-4 w-4 ${isCommentAutoEnabled ? 'text-cyan-400' : 'text-gray-600'}`} />
          </div>
          <p className="mt-1 text-xs text-gray-400">Comments</p>
          <p className={`text-sm font-semibold ${isCommentAutoEnabled ? 'text-cyan-400' : 'text-gray-500'}`}>
            {isCommentAutoEnabled ? 'On' : 'Off'}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <MessageSquare className={`h-4 w-4 ${isInboxAutoEnabled ? 'text-purple-400' : 'text-gray-600'}`} />
          </div>
          <p className="mt-1 text-xs text-gray-400">Inbox</p>
          <p className={`text-sm font-semibold ${isInboxAutoEnabled ? 'text-purple-400' : 'text-gray-500'}`}>
            {isInboxAutoEnabled ? 'On' : 'Off'}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
        <button
          onClick={() => onRefreshToken(page.page_id)}
          className="flex-1 btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Token
        </button>
        <button
          onClick={onSettings}
          className="flex-1 btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
        >
          <Settings className="h-3.5 w-3.5" />
          Cấu hình AI
        </button>
      </div>
    </div>
  );
}

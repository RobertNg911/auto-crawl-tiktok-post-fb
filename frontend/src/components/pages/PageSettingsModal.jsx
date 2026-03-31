import { useState, useEffect } from 'react';
import { X, Save, Loader2, Send, MessageCircle, MessageSquare, FileText } from 'lucide-react';

const DEFAULT_PAGE_SETTINGS = {
  auto_post: true,
  auto_comment: false,
  auto_inbox: false,
  comment_ai_prompt: '',
  message_ai_prompt: '',
};

export function PageSettingsModal({ page, onClose, onSave, token }) {
  const [formData, setFormData] = useState(DEFAULT_PAGE_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('automation'); // automation | prompts

  const authToken = token || localStorage.getItem('token');

  useEffect(() => {
    if (page) {
      setFormData({
        auto_post: page.comment_auto_reply_enabled !== false ? true : false,
        auto_comment: page.comment_auto_reply_enabled !== false,
        auto_inbox: page.message_auto_reply_enabled === true,
        comment_ai_prompt: page.comment_ai_prompt || '',
        message_ai_prompt: page.message_ai_prompt || '',
      });
    }
  }, [page]);

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/facebook/config/${page.page_id}/automation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          comment_auto_reply_enabled: formData.auto_comment,
          comment_ai_prompt: formData.comment_ai_prompt,
          message_auto_reply_enabled: formData.auto_inbox,
          message_ai_prompt: formData.message_ai_prompt,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || 'Cập nhật thất bại');
      }

      onSave(payload.page || payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl panel-surface rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>

        <h2 className="text-xl font-semibold text-white">Cấu hình AI: {page.page_name}</h2>
        <p className="mt-1 text-sm text-gray-400">
          Thiết lập automation và prompt AI cho fanpage này
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-1 p-1 rounded-xl bg-white/5">
          <button
            onClick={() => setActiveTab('automation')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'automation'
                ? 'bg-cyan-400/20 text-cyan-100'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Automation
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'prompts'
                ? 'bg-cyan-400/20 text-cyan-100'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            AI Prompts
          </button>
        </div>

        {activeTab === 'automation' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10">
                  <Send className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Auto Post</p>
                  <p className="text-xs text-gray-400">Tự động đăng video khi ready</p>
                </div>
              </div>
              <button
                onClick={() => handleChange('auto_post', !formData.auto_post)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.auto_post ? 'bg-emerald-400' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.auto_post ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10">
                  <MessageCircle className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Auto Comment</p>
                  <p className="text-xs text-gray-400">Tự động trả lời bình luận bằng AI</p>
                </div>
              </div>
              <button
                onClick={() => handleChange('auto_comment', !formData.auto_comment)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.auto_comment ? 'bg-cyan-400' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.auto_comment ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-400/10">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Auto Inbox</p>
                  <p className="text-xs text-gray-400">Tự động trả lời tin nhắn Messenger</p>
                </div>
              </div>
              <button
                onClick={() => handleChange('auto_inbox', !formData.auto_inbox)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.auto_inbox ? 'bg-purple-400' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.auto_inbox ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <MessageCircle className="h-4 w-4 text-cyan-400" />
                Comment Reply Prompt
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Prompt để AI trả lời bình luận trên Facebook
              </p>
              <textarea
                value={formData.comment_ai_prompt}
                onChange={(e) => handleChange('comment_ai_prompt', e.target.value)}
                placeholder="Trả lời bình luận một cách thân thiện, ngắn gọn, có hỗ trợ khách hàng..."
                className="w-full h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-cyan-400/50 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                Inbox Reply Prompt
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Prompt để AI trả lời tin nhắn Messenger
              </p>
              <textarea
                value={formData.message_ai_prompt}
                onChange={(e) => handleChange('message_ai_prompt', e.target.value)}
                placeholder="Trả lời tin nhắn khách hàng một cách chuyên nghiệp, đưa ra hỗ trợ phù hợp..."
                className="w-full h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-cyan-400/50 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Lưu cấu hình
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

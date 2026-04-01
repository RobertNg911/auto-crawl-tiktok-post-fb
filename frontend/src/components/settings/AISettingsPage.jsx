import { useState, useCallback } from 'react';
import {
  Bot,
  MessageCircle,
  MessageSquare,
  Send,
  Loader2,
  Check,
  AlertTriangle,
  TestTube,
  FileText,
  RefreshCw,
} from 'lucide-react';

const API_URL = '/api';

const DEFAULT_PROMPTS = {
  caption:
    'Bạn là Trùm Copywriter chuyên viral content Facebook Reels. Mệnh lệnh bắt buộc:\n' +
    '1. Viết lại caption sao cho kịch tính, thú vị, xài emoji hợp lý, độ dài 50-150 từ.\n' +
    '2. Loại bỏ toàn bộ hashtag cũ trong caption gốc.\n' +
    '3. Tự bổ sung 5-6 hashtag trending phù hợp cho Facebook Reels.\n' +
    '4. Thêm CTA (call-to-action) cuối caption như: "Theo dõi để xem thêm nhé!", "Comment ý kiến của bạn!", v.v.\n' +
    '5. Caption KHÔNG được vượt quá 2200 ký tự.\n' +
    'Kết quả chỉ trả về đoạn caption thuần túy, không có giải thích.',
  comment:
    'Bạn là chăm sóc khách hàng cho fanpage Facebook. ' +
    'Hãy trả lời bình luận thật thân thiện, ngắn gọn, tự nhiên và phù hợp ngữ cảnh. ' +
    'Chỉ trả về nội dung câu trả lời, không giải thích thêm.',
  inbox:
    'Bạn là trợ lý tư vấn cho fanpage Facebook. ' +
    'Hãy trả lời tin nhắn inbox theo phong cách lịch sự, rõ ràng, hữu ích và chủ động gợi mở bước tiếp theo khi phù hợp. ' +
    'Chỉ trả về nội dung tin nhắn gửi cho khách.',
};

const PROMPT_VARIABLES = {
  caption: ['{original_caption}'],
  comment: ['{user_message}'],
  inbox: ['{user_message}', '{conversation_summary}', '{customer_facts}'],
};

const MAX_CHARS = {
  caption: 2200,
  comment: 200,
  inbox: 500,
};

export function AISettingsPage({ fbPages, token, onNotice }) {
  const [selectedPageId, setSelectedPageId] = useState(fbPages?.[0]?.page_id || '');
  const [automation, setAutomation] = useState({
    auto_post: true,
    auto_comment: false,
    auto_inbox: false,
  });
  const [prompts, setPrompts] = useState({
    caption_prompt: '',
    comment_prompt: '',
    inbox_prompt: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activePromptTab, setActivePromptTab] = useState('caption');
  const [testPromptType, setTestPromptType] = useState('caption');
  const [testSampleInput, setTestSampleInput] = useState('');
  const [testOutput, setTestOutput] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const selectedPage = fbPages?.find((p) => p.page_id === selectedPageId);

  const loadPageSettings = useCallback(async () => {
    if (!selectedPageId || !token) return;
    try {
      const response = await fetch(`${API_URL}/pages/${selectedPageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setAutomation({
        auto_post: data.auto_post ?? true,
        auto_comment: data.auto_comment ?? false,
        auto_inbox: data.auto_inbox ?? false,
      });
      setPrompts({
        caption_prompt: data.caption_prompt || '',
        comment_prompt: data.comment_prompt || '',
        inbox_prompt: data.inbox_prompt || '',
      });
      setHasChanges(false);
    } catch {
      if (onNotice) onNotice('error', 'Không thể tải cấu hình page.');
    }
  }, [selectedPageId, token, onNotice]);

  useState(() => {
    loadPageSettings();
  });

  const handleAutomationChange = (key, value) => {
    setAutomation((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handlePromptChange = (key, value) => {
    setPrompts((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleResetPrompt = (key) => {
    const promptKey = key.replace('_prompt', '');
    const defaultKey = promptKey === 'comment' ? 'comment' : promptKey === 'inbox' ? 'inbox' : 'caption';
    setPrompts((prev) => ({ ...prev, [key]: DEFAULT_PROMPTS[defaultKey] || '' }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedPageId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/pages/${selectedPageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          auto_post: automation.auto_post,
          auto_comment: automation.auto_comment,
          auto_inbox: automation.auto_inbox,
          caption_prompt: prompts.caption_prompt,
          comment_prompt: prompts.comment_prompt,
          inbox_prompt: prompts.inbox_prompt,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Lưu thất bại');
      }
      setHasChanges(false);
      if (onNotice) onNotice('success', 'Đã lưu cấu hình AI thành công.');
    } catch (err) {
      if (onNotice) onNotice('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrompt = async () => {
    if (!selectedPageId || !testSampleInput.trim()) return;
    setIsTesting(true);
    setTestError('');
    setTestOutput(null);
    try {
      const response = await fetch(`${API_URL}/pages/${selectedPageId}/test-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt_type: testPromptType,
          sample_input: testSampleInput.trim(),
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Test thất bại');
      }
      const data = await response.json();
      setTestOutput(data);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const activePromptKey =
    activePromptTab === 'caption'
      ? 'caption_prompt'
      : activePromptTab === 'comment'
        ? 'comment_prompt'
        : 'inbox_prompt';

  const activePromptValue = prompts[activePromptKey];
  const currentMaxChars = MAX_CHARS[activePromptTab] || 2200;
  const variables = PROMPT_VARIABLES[activePromptTab] || [];

  if (!fbPages || fbPages.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center sm:rounded-[22px] sm:px-5 sm:py-7">
        <div className="font-display text-base font-semibold text-white sm:text-lg">Chưa có fanpage</div>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[var(--text-soft)]">
          Thêm fanpage trước khi cấu hình AI settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Selector */}
      <div className="panel-surface rounded-[22px] p-3.5 sm:rounded-[24px] sm:p-4 lg:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.34em] text-[var(--text-muted)]">Chọn fanpage</div>
            <h2 className="mt-1.5 font-display text-[1.05rem] font-semibold text-white sm:text-[1.25rem]">
              Cấu hình AI & Automation
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
              Thiết lập automation và prompt AI cho từng fanpage
            </p>
          </div>
          <select
            className="field-input w-full rounded-2xl px-4 py-3 text-sm text-white min-w-[240px]"
            value={selectedPageId}
            onChange={(e) => {
              setSelectedPageId(e.target.value);
              loadPageSettings();
            }}
          >
            {fbPages.map((page) => (
              <option key={page.page_id} value={page.page_id} style={{ color: '#06101a' }}>
                {page.page_name}
              </option>
            ))}
          </select>
        </div>

        {/* Automation Toggles */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bot className="h-4 w-4 text-cyan-400" />
            Automation Settings
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Auto Post */}
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
                onClick={() => handleAutomationChange('auto_post', !automation.auto_post)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  automation.auto_post ? 'bg-emerald-400' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    automation.auto_post ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Auto Comment */}
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
                onClick={() => handleAutomationChange('auto_comment', !automation.auto_comment)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  automation.auto_comment ? 'bg-cyan-400' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    automation.auto_comment ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Auto Inbox */}
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
                onClick={() => handleAutomationChange('auto_inbox', !automation.auto_inbox)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  automation.auto_inbox ? 'bg-purple-400' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    automation.auto_inbox ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Editors */}
      <div className="panel-surface rounded-[22px] p-3.5 sm:rounded-[24px] sm:p-4 lg:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.34em] text-[var(--text-muted)]">AI Prompts</div>
            <h2 className="mt-1.5 font-display text-[1.05rem] font-semibold text-white sm:text-[1.25rem]">
              Soạn prompt AI cho từng tính năng
            </h2>
          </div>
        </div>

        {/* Prompt Tabs */}
        <div className="mt-4 flex gap-1 p-1 rounded-xl bg-white/5 w-fit">
          {[
            { id: 'caption', label: 'Caption', icon: FileText },
            { id: 'comment', label: 'Comment Reply', icon: MessageCircle },
            { id: 'inbox', label: 'Inbox Reply', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePromptTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activePromptTab === tab.id
                    ? 'bg-cyan-400/20 text-cyan-100'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Prompt Editor */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Prompt {activePromptTab === 'caption' ? 'Caption' : activePromptTab === 'comment' ? 'Comment Reply' : 'Inbox Reply'}
            </div>
            <button
              onClick={() => handleResetPrompt(activePromptKey)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-[var(--text-soft)] transition hover:border-white/18 hover:bg-white/8 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Khôi phục mặc định
            </button>
          </div>

          <textarea
            className="field-input w-full rounded-2xl px-4 py-3 text-sm text-white min-h-[200px] resize-y"
            value={activePromptValue}
            onChange={(e) => handlePromptChange(activePromptKey, e.target.value)}
            placeholder={`Nhập prompt cho ${activePromptTab}...`}
          />

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span>Biến hỗ trợ:</span>
              {variables.map((v) => (
                <code key={v} className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-cyan-100">
                  {v}
                </code>
              ))}
            </div>
            <span className={activePromptValue.length > currentMaxChars ? 'text-rose-300' : ''}>
              {activePromptValue.length} ký tự
            </span>
          </div>
        </div>
      </div>

      {/* Prompt Tester */}
      <div className="panel-surface rounded-[22px] p-3.5 sm:rounded-[24px] sm:p-4 lg:p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.34em] text-[var(--text-muted)]">Test Prompt</div>
            <h2 className="mt-1.5 font-display text-[1.05rem] font-semibold text-white sm:text-[1.25rem]">
              Kiểm tra prompt với sample input
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
              Nhập sample input để preview AI output trước khi save
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)] mb-2 block">
                Loại prompt
              </label>
              <select
                className="field-input w-full rounded-2xl px-4 py-3 text-sm text-white"
                value={testPromptType}
                onChange={(e) => {
                  setTestPromptType(e.target.value);
                  setTestOutput(null);
                  setTestError('');
                }}
              >
                <option value="caption" style={{ color: '#06101a' }}>Caption</option>
                <option value="comment" style={{ color: '#06101a' }}>Comment Reply</option>
                <option value="inbox" style={{ color: '#06101a' }}>Inbox Reply</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)] mb-2 block">
                Sample Input
              </label>
              <textarea
                className="field-input w-full rounded-2xl px-4 py-3 text-sm text-white min-h-[140px] resize-y"
                value={testSampleInput}
                onChange={(e) => setTestSampleInput(e.target.value)}
                placeholder={
                  testPromptType === 'caption'
                    ? 'Nhập caption gốc của video để test...'
                    : testPromptType === 'comment'
                      ? 'Nhập bình luận mẫu để test reply...'
                      : 'Nhập tin nhắn inbox mẫu để test reply...'
                }
              />
            </div>

            <button
              onClick={handleTestPrompt}
              disabled={isTesting || !testSampleInput.trim()}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang test...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4" />
                  Test Prompt
                </>
              )}
            </button>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)] mb-2">
              AI Output Preview
            </div>

            {testError && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {testError}
              </div>
            )}

            {testOutput ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="whitespace-pre-wrap text-sm text-white leading-7">
                    {testOutput.output}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    {testOutput.chars_used} / {testOutput.max_chars} ký tự
                  </span>
                  <span>Prompt: {selectedPage?.page_name}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center">
                <TestTube className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
                <div className="text-sm text-[var(--text-soft)]">
                  Nhập sample input và nhấn Test Prompt để xem kết quả
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={loadPageSettings}
          className="btn-ghost inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Khôi phục
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Lưu cấu hình
            </>
          )}
        </button>
      </div>
    </div>
  );
}

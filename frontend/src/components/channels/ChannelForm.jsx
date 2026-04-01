import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const API_URL = '/api';

export function ChannelForm({ channel, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    topic: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (channel) {
      setFormData({
        username: channel.username || '',
        display_name: channel.display_name || '',
        topic: channel.topic || '',
      });
    }
  }, [channel]);

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Username là bắt buộc';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username không hợp lệ';
    }
    if (formData.display_name && formData.display_name.length > 255) {
      newErrors.display_name = 'Tên hiển thị tối đa 255 ký tự';
    }
    if (formData.topic && formData.topic.length > 100) {
      newErrors.topic = 'Chủ đề tối đa 100 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-white/12 bg-[var(--panel-bg)] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">
            {channel ? 'Sửa kênh' : 'Thêm kênh mới'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/18 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
              Username TikTok <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="nguyenthanh2512"
              disabled={!!channel}
              className="field-input w-full rounded-xl px-4 py-3 text-sm"
            />
            {errors.username && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.username}
              </p>
            )}
            <p className="mt-1.5 text-[10px] text-slate-500">
              Nhập username TikTok (không cần @)
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="Nguyễn Thanh"
              className="field-input w-full rounded-xl px-4 py-3 text-sm"
            />
            {errors.display_name && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.display_name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
              Chủ đề
            </label>
            <select
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="field-input w-full rounded-xl px-4 py-3 text-sm"
            >
              <option value="">Chọn chủ đề</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="beauty">Beauty</option>
              <option value="education">Education</option>
              <option value="gaming">Gaming</option>
              <option value="music">Music</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
            </select>
            {errors.topic && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.topic}
              </p>
            )}
          </div>

          {errors.submit && (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errors.submit}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              {isSubmitting ? 'Đang lưu...' : channel ? 'Lưu thay đổi' : 'Thêm kênh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

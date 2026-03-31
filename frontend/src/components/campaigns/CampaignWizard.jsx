import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, AlertCircle, Users, Clock, Globe2 } from 'lucide-react';
import { MOCK_CHANNELS } from '../../data/mockChannels';

const STEPS = [
  { id: 1, title: 'Thông tin cơ bản', description: 'Tên, trang đích, chủ đề' },
  { id: 2, title: 'Chọn kênh', description: 'Kênh TikTok mục tiêu' },
  { id: 3, title: 'Lên lịch', description: 'Ngưỡng view, tần suất' },
];

export function CampaignWizard({ onSubmit, onClose, initialData }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    target_page_id: '',
    topic: '',
    channel_ids: [],
    view_threshold: 10000,
    schedule_interval: 7200,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  const updateFormData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Tên chiến dịch là bắt buộc';
      }
      if (!formData.target_page_id) {
        newErrors.target_page_id = 'Vui lòng chọn trang đích';
      }
    }
    
    if (step === 2) {
      if (formData.channel_ids.length === 0) {
        newErrors.channel_ids = 'Vui lòng chọn ít nhất một kênh';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep()) {
      onSubmit(formData);
    }
  };

  const toggleChannel = (channelId) => {
    const ids = formData.channel_ids.includes(channelId)
      ? formData.channel_ids.filter((id) => id !== channelId)
      : [...formData.channel_ids, channelId];
    updateFormData({ channel_ids: ids });
  };

  const formatInterval = (seconds) => {
    if (seconds < 3600) return `${seconds / 60} phút`;
    if (seconds === 3600) return '1 giờ';
    if (seconds < 86400) return `${seconds / 3600} giờ`;
    return `${seconds / 86400} ngày`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[24px] border border-white/12 bg-[var(--panel-bg)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">Tạo chiến dịch mới</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/18 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 flex items-center justify-between">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium ${
                step >= s.id 
                  ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' 
                  : 'border-white/10 bg-white/5 text-slate-500'
              }`}>
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 w-12 ${step > s.id ? 'bg-cyan-400/50' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-white/8 bg-black/10 p-4">
          <div className="text-sm font-medium text-white">{STEPS[step - 1].title}</div>
          <div className="text-xs text-slate-400">{STEPS[step - 1].description}</div>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                  Tên chiến dịch <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Ví dụ: Lifestyle Vietnam"
                  className="field-input w-full rounded-xl px-4 py-3 text-sm"
                />
                {errors.name && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" /> {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                  Trang đích <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.target_page_id}
                  onChange={(e) => updateFormData({ target_page_id: e.target.value })}
                  className="field-input w-full rounded-xl px-4 py-3 text-sm"
                >
                  <option value="">Chọn Facebook Page</option>
                  <option value="page_001">Lifestyle Fanpage</option>
                  <option value="page_002">Beauty Vietnam</option>
                  <option value="page_003">Entertainment Hub</option>
                </select>
                {errors.target_page_id && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" /> {errors.target_page_id}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                  Chủ đề
                </label>
                <select
                  value={formData.topic}
                  onChange={(e) => updateFormData({ topic: e.target.value })}
                  className="field-input w-full rounded-xl px-4 py-3 text-sm"
                >
                  <option value="">Chọn chủ đề</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="beauty">Beauty</option>
                  <option value="education">Education</option>
                  <option value="gaming">Gaming</option>
                  <option value="music">Music</option>
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                Chọn kênh TikTok <span className="text-rose-400">*</span>
              </label>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {MOCK_CHANNELS.filter(c => c.status === 'active').map((channel) => (
                  <label
                    key={channel.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                      formData.channel_ids.includes(channel.id)
                        ? 'border-cyan-400/50 bg-cyan-400/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.channel_ids.includes(channel.id)}
                      onChange={() => toggleChannel(channel.id)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">@{channel.username}</div>
                      {channel.display_name && (
                        <div className="text-xs text-slate-400">{channel.display_name}</div>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{channel.latest_metrics?.followers?.toLocaleString()} followers</div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.channel_ids && (
                <p className="mt-2 flex items-center gap-1 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.channel_ids}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                  Ngưỡng view tối thiểu
                </label>
                <input
                  type="number"
                  value={formData.view_threshold}
                  onChange={(e) => updateFormData({ view_threshold: parseInt(e.target.value) || 0 })}
                  placeholder="10000"
                  className="field-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Chỉ lấy video có lượt xem {'>='} ngưỡng này
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-400">
                  Khoảng cách đăng bài
                </label>
                <select
                  value={formData.schedule_interval}
                  onChange={(e) => updateFormData({ schedule_interval: parseInt(e.target.value) })}
                  className="field-input w-full rounded-xl px-4 py-3 text-sm"
                >
                  <option value="1800">30 phút</option>
                  <option value="3600">1 giờ</option>
                  <option value="7200">2 giờ</option>
                  <option value="10800">3 giờ</option>
                  <option value="21600">6 giờ</option>
                  <option value="43200">12 giờ</option>
                  <option value="86400">24 giờ</option>
                </select>
              </div>

              <div className="mt-6 rounded-xl border border-white/8 bg-black/10 p-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 mb-3">Tóm tắt</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tên chiến dịch:</span>
                    <span className="text-white">{formData.name || '(Chưa có)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số kênh:</span>
                    <span className="text-white">{formData.channel_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngưỡng view:</span>
                    <span className="text-white">{formData.view_threshold.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tần suất:</span>
                    <span className="text-white">{formatInterval(formData.schedule_interval)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="btn-ghost flex-1 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Quay lại
            </button>
          ) : (
            <button
              onClick={onClose}
              className="btn-ghost flex-1 rounded-2xl px-4 py-3 text-sm font-medium"
            >
              Hủy
            </button>
          )}
          
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="btn-primary flex-1 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Tiếp theo
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Tạo chiến dịch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

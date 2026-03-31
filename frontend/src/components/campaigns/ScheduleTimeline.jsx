import { Clock, Play, Pause, Calendar, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';

const SCHEDULE_INTERVAL_OPTIONS = [
  { value: 1800, label: '30 phút' },
  { value: 3600, label: '1 giờ' },
  { value: 5400, label: '1.5 giờ' },
  { value: 7200, label: '2 giờ' },
  { value: 10800, label: '3 giờ' },
  { value: 14400, label: '4 giờ' },
  { value: 21600, label: '6 giờ' },
  { value: 43200, label: '12 giờ' },
  { value: 86400, label: '24 giờ' },
];

function formatScheduleInterval(seconds) {
  if (!seconds) return 'Chưa cấu hình';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}p`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}

function formatHourMinute(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function ScheduleTimeline({ 
  campaign, 
  videos = [], 
  onScheduleIntervalChange, 
  onManualSchedule,
  isLoading = false 
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');

  const readyVideos = useMemo(() => {
    return videos
      .filter(v => v.status === 'ready' || v.status === 'pending')
      .sort((a, b) => {
        if (a.publish_time && b.publish_time) {
          return new Date(a.publish_time) - new Date(b.publish_time);
        }
        return b.priority - a.priority;
      });
  }, [videos]);

  const scheduledVideos = useMemo(() => {
    return readyVideos.filter(v => v.publish_time);
  }, [readyVideos]);

  const unscheduledVideos = useMemo(() => {
    return readyVideos.filter(v => !v.publish_time);
  }, [readyVideos]);

  const timelineHours = useMemo(() => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  }, []);

  const getVideosForHour = (hour) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return scheduledVideos.filter(v => {
      if (!v.publish_time) return false;
      const publishDate = new Date(v.publish_time);
      const publishDateStr = publishDate.toISOString().split('T')[0];
      return publishDateStr === dateStr && publishDate.getHours() === hour;
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-white/18 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="font-display text-base font-semibold text-white">
              {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
            </div>
            {isToday && (
              <span className="text-xs text-cyan-400">Hôm nay</span>
            )}
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-white/18 hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          >
            Hôm nay
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-300">Khoảng cách đăng:</span>
            <select
              value={campaign?.schedule_interval || 7200}
              onChange={(e) => onScheduleIntervalChange?.(parseInt(e.target.value, 10))}
              className="rounded-lg bg-black/30 px-2 py-1 text-sm text-white border border-white/10"
            >
              {SCHEDULE_INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Lịch đăng trong ngày
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Đã lên lịch
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                Đang chờ
              </span>
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1">
                <div></div>
                {timelineHours.filter((_, i) => i % 2 === 0).map(hour => (
                  <div key={hour} className="text-center text-[10px] text-slate-500">
                    {formatHourMinute(hour * 3600)}
                  </div>
                ))}
              </div>
              
              <div className="mt-2 space-y-1">
                {timelineHours.map(hour => {
                  const hourVideos = getVideosForHour(hour);
                  return (
                    <div key={hour} className="grid grid-cols-[60px_repeat(24,1fr)] gap-1">
                      <div className="text-[10px] text-slate-500 text-right pr-2">
                        {hour}:00
                      </div>
                      <div 
                        className={`col-span-24 relative rounded-lg border transition ${
                          hourVideos.length > 0 
                            ? 'border-amber-400/30 bg-amber-400/5' 
                            : 'border-white/5 bg-white/5'
                        }`}
                      >
                        {hourVideos.map(video => (
                          <div 
                            key={video.id}
                            className="absolute left-1 right-1 top-1 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1.5"
                          >
                            {video.thumbnail_url ? (
                              <img 
                                src={video.thumbnail_url} 
                                alt="" 
                                className="h-6 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-6 w-8 rounded bg-black/20"></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-white">
                                {video.ai_caption || video.original_caption || 'Video'}
                              </div>
                              <div className="text-[10px] text-amber-300">
                                {new Date(video.publish_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              <Calendar className="h-3.5 w-3.5" />
              Sắp tới
            </div>
            <div className="mt-3 space-y-2">
              {scheduledVideos.slice(0, 5).map((video, idx) => (
                <div 
                  key={video.id}
                  className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/5 p-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-xs font-bold text-amber-100">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {video.ai_caption?.slice(0, 30) || video.original_caption?.slice(0, 30) || 'Video'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(video.publish_time).toLocaleString('vi-VN', { 
                        day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {scheduledVideos.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                  Chưa có video nào được lên lịch
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              <AlertCircle className="h-3.5 w-3.5" />
              Chưa lên lịch
            </div>
            <div className="mt-3 space-y-2">
              {unscheduledVideos.slice(0, 5).map(video => (
                <button
                  key={video.id}
                  onClick={() => onManualSchedule?.(video)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/6 bg-white/5 p-2 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                >
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt="" 
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-black/20"></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {video.ai_caption?.slice(0, 25) || video.original_caption?.slice(0, 25) || 'Video'}
                    </div>
                    <div className="text-xs text-cyan-400">
                      Bấm để đặt lịch
                    </div>
                  </div>
                </button>
              ))}
              {unscheduledVideos.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                  Tất cả video đã có lịch
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-black/10 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-2xl font-semibold text-white">{scheduledVideos.length}</div>
                <div className="text-xs text-slate-500">Đã lên lịch</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-2xl font-semibold text-white">{unscheduledVideos.length}</div>
                <div className="text-xs text-slate-500">Chờ xếp lịch</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScheduleIntervalControl({ value, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange?.(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {SCHEDULE_INTERVAL_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function ManualScheduleModal({ video, isOpen, onClose, onSchedule }) {
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !video) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const publishTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      await onSchedule?.(video.id, publishTime);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-white/12 bg-[var(--panel-bg)] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-white">Đặt lịch đăng</h3>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/6 bg-white/5 p-3">
            <div className="text-xs text-slate-500">Video</div>
            <div className="mt-1 text-sm font-medium text-white truncate">
              {video.ai_caption || video.original_caption || 'Video'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Ngày</span>
              <input 
                type="date" 
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Giờ</span>
              <input 
                type="time" 
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Hủy
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 btn-primary"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu lịch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

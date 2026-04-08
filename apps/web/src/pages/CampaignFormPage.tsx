import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, facebookApi } from '../../lib/api';

export default function CampaignFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fbPages, setFbPages] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    source_url: '',
    topic: '',
    source_platform: 'tiktok',
    view_threshold: 0,
    schedule_interval: 0,
    upload_delay: 0,
    auto_post: false,
    ai_caption_enabled: false,
    ai_hashtag_enabled: true,
    target_page_id: '',
  });

  useEffect(() => {
    facebookApi.list().then(setFbPages).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await campaignsApi.create(formData);
      navigate('/campaigns');
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tạo chiến dịch mới</h1>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tên chiến dịch *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Chiến dịch TikTok hay"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nền tảng nguồn *</label>
            <select
              className="form-input"
              value={formData.source_platform}
              onChange={(e) => setFormData({ ...formData, source_platform: e.target.value })}
            >
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">URL nguồn *</label>
            <input
              type="url"
              className="form-input"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              placeholder="https://www.tiktok.com/@username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Chủ đề</label>
            <input
              type="text"
              className="form-input"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="Ví dụ: phim, nhạc, thời trang"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ngưỡng view tối thiểu</label>
            <input
              type="number"
              className="form-input"
              value={formData.view_threshold}
              onChange={(e) => setFormData({ ...formData, view_threshold: Number(e.target.value) })}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tần suất kiểm tra video mới (phút)</label>
            <select
              className="form-input"
              value={formData.schedule_interval}
              onChange={(e) => setFormData({ ...formData, schedule_interval: Number(e.target.value) })}
            >
              <option value={0}>Mỗi khi có video mới</option>
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>1 giờ</option>
              <option value={120}>2 giờ</option>
              <option value={360}>6 giờ</option>
              <option value={720}>12 giờ</option>
              <option value={1440}>24 giờ</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Khoảng thời gian giữa các lần kiểm tra video mới từ TikTok</p>
          </div>

          <div className="form-group">
            <label className="form-label">Tần suất upload lên Facebook (phút)</label>
            <select
              className="form-input"
              value={formData.upload_delay}
              onChange={(e) => setFormData({ ...formData, upload_delay: Number(e.target.value) })}
            >
              <option value={0}>Ngay lập tức</option>
              <option value={5}>5 phút</option>
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>1 giờ</option>
              <option value={120}>2 giờ</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Tránh đăng quá nhiều video cùng lúc</p>
          </div>

          <div className="form-group">
            <label className="form-label">Page đích (Facebook)</label>
            {fbPages.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có Facebook Page nào. <a href="/pages" className="text-blue-600 underline">Thêm page</a></p>
            ) : (
              <select
                className="form-input"
                value={formData.target_page_id}
                onChange={(e) => setFormData({ ...formData, target_page_id: e.target.value })}
              >
                <option value="">-- Chọn Page --</option>
                {fbPages.map((page) => (
                  <option key={page.id} value={page.page_id}>
                    {page.page_name} ({page.page_id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_post}
                onChange={(e) => setFormData({ ...formData, auto_post: e.target.checked })}
              />
              <span className="text-sm">Tự động đăng bài lên Facebook</span>
            </label>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ai_caption_enabled}
                onChange={(e) => setFormData({ ...formData, ai_caption_enabled: e.target.checked })}
              />
              <span className="text-sm">AI tạo caption mới (dùng Gemini)</span>
            </label>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ai_hashtag_enabled}
                onChange={(e) => setFormData({ ...formData, ai_hashtag_enabled: e.target.checked })}
              />
              <span className="text-sm">Thêm hashtag tự động</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo chiến dịch'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/campaigns')}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

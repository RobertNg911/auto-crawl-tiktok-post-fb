import { useState } from 'react';
import { useFacebookPages } from '../../hooks/useFacebookPages';

export default function FacebookPagesPage() {
  const { pages, loading, error, createPage, updatePage, deletePage } = useFacebookPages();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    page_id: '',
    page_name: '',
    access_token: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPage(formData);
      setFormData({ page_id: '', page_name: '', access_token: '' });
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facebook Pages</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? '✕ Đóng' : '+ Thêm Page'}
        </button>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      {/* Add page form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title mb-4">Thêm Facebook Page</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Page ID</label>
              <input
                type="text"
                className="form-input"
                value={formData.page_id}
                onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                placeholder="123456789"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tên Page</label>
              <input
                type="text"
                className="form-input"
                value={formData.page_name}
                onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                placeholder="Tên fanpage của bạn"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Access Token</label>
              <textarea
                className="form-input"
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder="Page Access Token từ Meta Developer"
                rows={3}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Thêm Page
            </button>
          </form>
        </div>
      )}

      {/* Pages list */}
      {pages.length === 0 ? (
        <div className="empty-state card">
          <p>Chưa có Facebook Page nào</p>
          <p className="text-sm text-gray-500 mt-2">
            Thêm page để bắt đầu đăng bài
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((page) => (
            <div key={page.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{page.page_name}</h3>
                  <p className="text-sm text-gray-500">ID: {page.page_id}</p>
                </div>
                <button
                  onClick={() => deletePage(page.id)}
                  className="btn btn-secondary btn-sm"
                >
                  🗑️
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={page.auto_post}
                    onChange={(e) =>
                      updatePage(page.id, { auto_post: e.target.checked })
                    }
                  />
                  <span className="text-sm">Auto đăng</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={page.auto_comment}
                    onChange={(e) =>
                      updatePage(page.id, { auto_comment: e.target.checked })
                    }
                  />
                  <span className="text-sm">AI Comment</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={page.auto_inbox}
                    onChange={(e) =>
                      updatePage(page.id, { auto_inbox: e.target.checked })
                    }
                  />
                  <span className="text-sm">AI Inbox</span>
                </label>
              </div>

              <p className="text-xs text-gray-400">
                Thêm: {new Date(page.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

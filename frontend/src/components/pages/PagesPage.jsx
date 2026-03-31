import { useState } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { PageCard } from './PageCard';
import { ImportPagesModal } from './ImportPagesModal';
import { PageSettingsModal } from './PageSettingsModal';
import { EmptyState } from './EmptyState';

export function PagesPage({ 
  fbPages: propFbPages, 
  setFbPages: propSetFbPages,
  onRefreshDashboard,
  token 
}) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);

  const fbPages = propFbPages || [];
  const setFbPages = propSetFbPages || (() => {});

  const showNotice = (type, message) => setNotice({ type, message });

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    if (onRefreshDashboard) {
      onRefreshDashboard();
    } else {
      window.location.reload();
    }
    showNotice('success', 'Import thành công!');
  };

  const handleRefreshToken = async (pageId) => {
    showNotice('error', 'Vui lòng import lại token người dùng để làm mới.');
  };

  const handleSettingsSave = (updatedPage) => {
    setFbPages((current) =>
      current.map((p) => (p.page_id === updatedPage.page_id ? updatedPage : p))
    );
    setSettingsPage(null);
    showNotice('success', 'Cập nhật thành công!');
  };

  const handleRefreshPages = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/facebook/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (response.ok) {
        setFbPages(payload || []);
      }
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (fbPages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Quản lý Fanpage</h1>
            <p className="mt-1 text-sm text-gray-400">
              Quản lý các fanpage và cấu hình AI tự động
            </p>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            Import Pages
          </button>
        </div>

        <EmptyState
          title="Chưa có fanpage nào"
          description="Import fanpage từ User Access Token để bắt đầu quản lý."
        />

        <ImportPagesModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleImportSuccess}
          token={token}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Quản lý Fanpage</h1>
          <p className="mt-1 text-sm text-gray-400">
            Quản lý {fbPages.length} fanpage và cấu hình AI tự động
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshPages}
            disabled={isRefreshing}
            className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            Import Pages
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fbPages.map((page) => (
          <PageCard
            key={page.page_id}
            page={page}
            onSettings={() => setSettingsPage(page)}
            onRefreshToken={handleRefreshToken}
          />
        ))}
      </div>

      <ImportPagesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        token={token}
      />

      {settingsPage && (
        <PageSettingsModal
          page={settingsPage}
          onClose={() => setSettingsPage(null)}
          onSave={handleSettingsSave}
          token={token}
        />
      )}
    </div>
  );
}

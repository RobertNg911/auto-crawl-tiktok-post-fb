import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

export function ImportPagesModal({ isOpen, onClose, onSuccess, token: authTokenFromProps }) {
  const [discoveredPages, setDiscoveredPages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // input | select | importing

  const authToken = authTokenFromProps || localStorage.getItem('token');
  const [tokenInput, setTokenInput] = useState('');

  const handleDiscover = async () => {
    if (!tokenInput.trim()) {
      setError('Vui lòng nhập User Access Token');
      return;
    }

    setIsDiscovering(true);
    setError('');

    try {
      const response = await fetch('/api/facebook/config/discover-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ user_access_token: tokenInput.trim() }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || 'Không thể tải danh sách fanpage');
      }

      const pages = payload.pages || [];
      setDiscoveredPages(pages);
      setSelectedIds(pages.map((p) => p.page_id));
      setStep('select');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleTogglePage = (pageId) => {
    setSelectedIds((current) =>
      current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId]
    );
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      setError('Hãy chọn ít nhất một fanpage');
      return;
    }

    setIsImporting(true);
    setStep('importing');
    setError('');

    try {
      const response = await fetch('/api/facebook/config/import-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          user_access_token: tokenInput.trim(),
          page_ids: selectedIds,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || 'Import thất bại');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
      setStep('select');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setTokenInput('');
    setDiscoveredPages([]);
    setSelectedIds([]);
    setError('');
    setStep('input');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full max-w-lg panel-surface rounded-2xl p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>

        <h2 className="text-xl font-semibold text-white">Import Fanpage</h2>
        <p className="mt-1 text-sm text-gray-400">
          Nhập User Access Token để import fanpage từ tài khoản Facebook của bạn
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {step === 'input' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                User Access Token
              </label>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your Facebook User Access Token here..."
                className="w-full h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-cyan-400/50 focus:outline-none resize-none font-mono"
              />
            </div>

            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="w-full btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tìm...
                </>
              ) : (
                'Tìm Fanpage'
              )}
            </button>
          </div>
        )}

        {step === 'select' && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-400">
              Tìm thấy {discoveredPages.length} fanpage. Chọn các trang bạn muốn import:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {discoveredPages.map((page) => (
                <label
                  key={page.page_id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(page.page_id)}
                    onChange={() => handleTogglePage(page.page_id)}
                    className="w-4 h-4 rounded border-gray-600 bg-transparent text-cyan-400 focus:ring-cyan-400/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {page.page_name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {page.page_id}
                    </p>
                  </div>
                  {page.already_configured && (
                    <span className="text-xs text-amber-400">Đã có</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
              >
                Quay lại
              </button>
              <button
                onClick={handleImport}
                disabled={selectedIds.length === 0}
                className="flex-1 btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
              >
                <Check className="h-4 w-4" />
                Import ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="mt-6 flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
            <p className="text-sm text-gray-400">Đang import fanpage...</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { facebookApi } from '../lib/api';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  auto_post: boolean;
  auto_comment: boolean;
  auto_inbox: boolean;
  caption_prompt?: string;
  comment_ai_prompt?: string;
  message_ai_prompt?: string;
  created_at: string;
}

export function useFacebookPages() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await facebookApi.list();
      setPages(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Facebook pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const createPage = async (data: Partial<FacebookPage>) => {
    const page = await facebookApi.create(data);
    setPages((prev) => [page, ...prev]);
    return page;
  };

  const updatePage = async (id: string, data: Partial<FacebookPage>) => {
    const page = await facebookApi.update(id, data);
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...page } : p)));
    return page;
  };

  const deletePage = async (id: string) => {
    await facebookApi.delete(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    pages,
    loading,
    error,
    createPage,
    updatePage,
    deletePage,
    refresh: fetchPages,
  };
}

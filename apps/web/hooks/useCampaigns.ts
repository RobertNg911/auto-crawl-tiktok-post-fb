import { useState, useEffect } from 'react';
import { campaignsApi } from '../lib/api';

interface Campaign {
  id: string;
  name: string;
  source_url: string;
  source_platform: string;
  status: string;
  topic?: string;
  last_synced_at?: string;
  last_sync_status?: string;
  created_at: string;
}

export function useCampaigns(initialStatus?: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchCampaigns = async (pageNum = 1, status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await campaignsApi.list({
        page: pageNum,
        limit,
        ...(status ? { status } : {}),
      });

      setCampaigns(response.campaigns || []);
      setTotal(response.total || 0);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(1, initialStatus);
  }, [initialStatus]);

  const createCampaign = async (data: Partial<Campaign>) => {
    const campaign = await campaignsApi.create(data);
    setCampaigns((prev) => [campaign, ...prev]);
    return campaign;
  };

  const updateCampaign = async (id: string, data: Partial<Campaign>) => {
    const campaign = await campaignsApi.update(id, data);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...campaign } : c))
    );
    return campaign;
  };

  const deleteCampaign = async (id: string) => {
    await campaignsApi.delete(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const syncCampaign = async (id: string) => {
    try {
      const result = await campaignsApi.sync(id);
      await fetchCampaigns(page);
      return result;
    } catch (err) {
      console.error('Sync error:', err);
      throw err;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return {
    campaigns,
    loading,
    error,
    page,
    totalPages,
    setPage: (p: number) => fetchCampaigns(p, initialStatus),
    createCampaign,
    updateCampaign,
    deleteCampaign,
    syncCampaign,
    refresh: () => fetchCampaigns(page, initialStatus),
  };
}

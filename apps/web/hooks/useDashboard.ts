import { useState, useEffect } from 'react';
import { dashboardApi } from '../lib/api';

interface DashboardOverview {
  total_campaigns: number;
  total_videos: number;
  total_pages: number;
  videos_by_status: Record<string, number>;
}

export function useDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.overview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return {
    overview,
    loading,
    error,
    refresh: fetchOverview,
  };
}

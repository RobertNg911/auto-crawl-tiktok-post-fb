import { useState, useEffect } from 'react';
import { videosApi, storage } from '../lib/api';

interface Video {
  id: string;
  campaign_id: string;
  original_id: string;
  source_platform: string;
  source_kind: string;
  source_video_url: string;
  file_path?: string;
  original_caption?: string;
  ai_caption?: string;
  thumbnail_url?: string;
  status: string;
  views?: number;
  likes?: number;
  comments_count?: number;
  priority: number;
  publish_time?: string;
  fb_post_id?: string;
  created_at: string;
}

export function useVideos(campaignId?: string, initialStatus?: string) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchVideos = async (pageNum = 1, campaign?: string, status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await videosApi.list({
        campaign_id: campaign,
        status,
        page: pageNum,
      });

      const enrichedVideos = (response.videos || []).map((video: Video) => ({
        ...video,
        thumbnailUrl: video.thumbnail_url || storage.getThumbnailUrl(`${video.id}/thumb.jpg`),
        videoUrl: video.file_path || video.source_video_url,
      }));

      setVideos(enrichedVideos);
      setTotal(response.total || 0);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(1, campaignId, initialStatus);
  }, [campaignId, initialStatus]);

  const updateVideo = async (id: string, data: Partial<Video>) => {
    const video = await videosApi.update(id, data);
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...video } : v)));
    return video;
  };

  const deleteVideo = async (id: string) => {
    await videosApi.delete(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const publishVideo = async (id: string) => {
    await videosApi.publish(id);
  };

  const generateCaption = async (id: string) => {
    await videosApi.generateCaption(id);
  };

  const retryVideo = async (id: string) => {
    await videosApi.retry(id);
  };

  const totalPages = Math.ceil(total / limit);

  return {
    videos,
    loading,
    error,
    page,
    totalPages,
    setPage: (p: number) => fetchVideos(p, campaignId, initialStatus),
    updateVideo,
    deleteVideo,
    publishVideo,
    generateCaption,
    retryVideo,
    refresh: () => fetchVideos(page, campaignId, initialStatus),
  };
}

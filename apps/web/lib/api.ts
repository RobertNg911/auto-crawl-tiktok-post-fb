import { supabase } from './supabase';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api') + '/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null as T;
  return response.json();
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ user: any; session: any }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  me: () => apiFetch<any>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/auth/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    }),
};

// Campaigns API
export const campaignsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return apiFetch<any>(`/campaigns${query ? `?${query}` : ''}`);
  },

  get: (id: string) => apiFetch<any>(`/campaigns/${id}`),

  create: (data: any) =>
    apiFetch<any>('/campaigns', { method: 'POST', body: data }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/campaigns/${id}`, { method: 'PATCH', body: data }),

  delete: (id: string) =>
    apiFetch<any>(`/campaigns/${id}`, { method: 'DELETE' }),

  sync: (id: string) =>
    apiFetch<any>(`/campaigns/${id}?action=sync`, { method: 'POST' }),

  pause: (id: string) =>
    apiFetch<any>(`/campaigns/${id}?action=pause`, { method: 'POST' }),

  resume: (id: string) =>
    apiFetch<any>(`/campaigns/${id}?action=resume`, { method: 'POST' }),
};

// Videos API
export const videosApi = {
  list: (params?: { campaign_id?: string; status?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.campaign_id) searchParams.set('campaign_id', params.campaign_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    const query = searchParams.toString();
    return apiFetch<any>(`/videos${query ? `?${query}` : ''}`);
  },

  get: (id: string) => apiFetch<any>(`/videos/${id}`),

  update: (id: string, data: any) =>
    apiFetch<any>(`/videos/${id}`, { method: 'PATCH', body: data }),

  delete: (id: string) =>
    apiFetch<any>(`/videos/${id}`, { method: 'DELETE' }),

  publish: (id: string) =>
    apiFetch<any>(`/videos/${id}?action=publish`, { method: 'POST' }),

  generateCaption: (id: string) =>
    apiFetch<any>(`/videos/${id}?action=generate-caption`, { method: 'POST' }),

  retry: (id: string) =>
    apiFetch<any>(`/videos/${id}?action=retry`, { method: 'POST' }),
};

// Facebook Pages API
export const facebookApi = {
  list: () => apiFetch<any[]>('/facebook'),

  create: (data: any) =>
    apiFetch<any>('/facebook', { method: 'POST', body: data }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/facebook/${id}`, { method: 'PATCH', body: data }),

  delete: (id: string) =>
    apiFetch<any>(`/facebook/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboardApi = {
  overview: () => apiFetch<any>('/dashboard/'),
};

// System API
export const systemApi = {
  health: () => apiFetch<any>('/system/health'),
  tasks: () => apiFetch<any>('/system/tasks'),
};

// Supabase Storage helpers
export const storage = {
  getVideoUrl: (path: string) => {
    const { data } = supabase.storage.from('videos').getPublicUrl(path);
    return data.publicUrl;
  },

  getThumbnailUrl: (path: string) => {
    const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
    return data.publicUrl;
  },
};

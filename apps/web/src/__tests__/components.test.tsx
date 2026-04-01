/**
 * Frontend Component Tests
 * 
 * Tests for React components and hooks
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('API Client', () => {
  it('should export all required API functions', async () => {
    const api = await import('../lib/api');
    
    expect(api.supabase).toBeDefined();
    expect(api.API_BASE_URL).toBeDefined();
    expect(api.apiFetch).toBeDefined();
    expect(api.authApi).toBeDefined();
    expect(api.campaignsApi).toBeDefined();
    expect(api.videosApi).toBeDefined();
    expect(api.facebookApi).toBeDefined();
    expect(api.dashboardApi).toBeDefined();
    expect(api.systemApi).toBeDefined();
  });

  it('should have login function', async () => {
    const { authApi } = await import('../lib/api');
    
    expect(authApi.login).toBeDefined();
    expect(typeof authApi.login).toBe('function');
  });

  it('should have campaigns CRUD functions', async () => {
    const { campaignsApi } = await import('../lib/api');
    
    expect(campaignsApi.list).toBeDefined();
    expect(campaignsApi.get).toBeDefined();
    expect(campaignsApi.create).toBeDefined();
    expect(campaignsApi.update).toBeDefined();
    expect(campaignsApi.delete).toBeDefined();
    expect(campaignsApi.sync).toBeDefined();
  });

  it('should have videos CRUD functions', async () => {
    const { videosApi } = await import('../lib/api');
    
    expect(videosApi.list).toBeDefined();
    expect(videosApi.get).toBeDefined();
    expect(videosApi.update).toBeDefined();
    expect(videosApi.delete).toBeDefined();
    expect(videosApi.publish).toBeDefined();
    expect(videosApi.generateCaption).toBeDefined();
  });
});

describe('Auth Context', () => {
  it('should export AuthProvider', async () => {
    const { AuthProvider } = await import('../lib/AuthContext');
    expect(AuthProvider).toBeDefined();
  });

  it('should export useAuth hook', async () => {
    const { useAuth } = await import('../lib/AuthContext');
    expect(useAuth).toBeDefined();
  });
});

describe('Hooks', () => {
  it('should export useCampaigns hook', async () => {
    const { useCampaigns } = await import('../hooks/useCampaigns');
    expect(useCampaigns).toBeDefined();
  });

  it('should export useVideos hook', async () => {
    const { useVideos } = await import('../hooks/useVideos');
    expect(useVideos).toBeDefined();
  });

  it('should export useFacebookPages hook', async () => {
    const { useFacebookPages } = await import('../hooks/useFacebookPages');
    expect(useFacebookPages).toBeDefined();
  });

  it('should export useDashboard hook', async () => {
    const { useDashboard } = await import('../hooks/useDashboard');
    expect(useDashboard).toBeDefined();
  });
});

describe('Components', () => {
  it('should export Layout component', async () => {
    const Layout = (await import('../components/Layout')).default;
    expect(Layout).toBeDefined();
  });
});

describe('Pages', () => {
  it('should export LoginPage component', async () => {
    const LoginPage = (await import('../pages/LoginPage')).default;
    expect(LoginPage).toBeDefined();
  });

  it('should export DashboardPage component', async () => {
    const DashboardPage = (await import('../pages/DashboardPage')).default;
    expect(DashboardPage).toBeDefined();
  });

  it('should export CampaignsPage component', async () => {
    const CampaignsPage = (await import('../pages/CampaignsPage')).default;
    expect(CampaignsPage).toBeDefined();
  });

  it('should export VideosPage component', async () => {
    const VideosPage = (await import('../pages/VideosPage')).default;
    expect(VideosPage).toBeDefined();
  });

  it('should export FacebookPagesPage component', async () => {
    const FacebookPagesPage = (await import('../pages/FacebookPagesPage')).default;
    expect(FacebookPagesPage).toBeDefined();
  });
});

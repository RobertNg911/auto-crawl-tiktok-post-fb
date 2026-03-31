export const MOCK_CHANNELS = [
  {
    id: '1',
    channel_id: 'ch_001',
    username: 'nguyenthanh2512',
    display_name: 'Nguyễn Thanh',
    topic: 'lifestyle',
    status: 'active',
    latest_metrics: {
      followers: 125000,
      video_count: 89,
      total_views: 2500000,
      snapshot_date: '2026-03-30',
    },
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    channel_id: 'ch_002',
    username: 'phamquynh_official',
    display_name: 'Phạm Quỳnh',
    topic: 'beauty',
    status: 'active',
    latest_metrics: {
      followers: 89000,
      video_count: 156,
      total_views: 1800000,
      snapshot_date: '2026-03-30',
    },
    created_at: '2026-01-20T14:30:00Z',
  },
  {
    id: '3',
    channel_id: 'ch_003',
    username: 'levietphong',
    display_name: 'Lê Việt Phong',
    topic: 'education',
    status: 'active',
    latest_metrics: {
      followers: 250000,
      video_count: 234,
      total_views: 5200000,
      snapshot_date: '2026-03-30',
    },
    created_at: '2026-02-01T08:00:00Z',
  },
  {
    id: '4',
    channel_id: 'ch_004',
    username: 'tranminhtuan',
    display_name: 'Trần Minh Tuấn',
    topic: 'gaming',
    status: 'inactive',
    latest_metrics: {
      followers: 45000,
      video_count: 67,
      total_views: 890000,
      snapshot_date: '2026-03-28',
    },
    created_at: '2026-02-10T16:00:00Z',
  },
  {
    id: '5',
    channel_id: 'ch_005',
    username: 'hoangyen_studio',
    display_name: 'Hoàng Yến Studio',
    topic: 'music',
    status: 'active',
    latest_metrics: {
      followers: 320000,
      video_count: 412,
      total_views: 8900000,
      snapshot_date: '2026-03-30',
    },
    created_at: '2026-02-15T12:00:00Z',
  },
];

export const TOPICS = [
  { value: 'all', label: 'Tất cả chủ đề' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'education', label: 'Education' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'food', label: 'Food' },
  { value: 'travel', label: 'Travel' },
];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Dừng' },
];

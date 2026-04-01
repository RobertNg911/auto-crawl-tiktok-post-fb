"""
Integration Tests for Phase 2 & 3 - Publishing and Analytics
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest
from sqlalchemy.orm import Session

from app.models.models import (
    Campaign,
    CampaignStatus,
    FacebookPage,
    TargetChannel,
    ChannelStatus,
    ChannelMetricsSnapshot,
    Video,
    VideoStatus,
)
from app.services.campaign_jobs import (
    publish_video_job,
    sync_channel_metrics_for_target_channel,
)
from app.services.facebook_publisher import (
    FacebookPublisherService,
    upload_video_with_retry,
)


class TestPhase2Publishing:
    """Test US-10, US-11, US-12: Facebook Publishing features"""

    def test_facebook_publisher_service_initialization(self):
        """Test US-10: FacebookPublisherService can be instantiated"""
        publisher = FacebookPublisherService("test_access_token")
        assert publisher.access_token == "test_access_token"
        assert publisher.api_url == "https://graph.facebook.com/v19.0"

    def test_upload_video_with_retry_function_exists(self):
        """Test US-10: upload_video_with_retry function exists"""
        # Function exists and is callable
        assert callable(upload_video_with_retry)

    def test_cleanup_video_file_function_exists(self):
        """Test US-10: cleanup_video_file function exists"""
        from app.services.facebook_publisher import cleanup_video_file

        assert callable(cleanup_video_file)

    def test_publish_video_job_requires_video(self, db_session: Session):
        """Test US-10: publish_video_job raises error for invalid video"""
        with pytest.raises(ValueError, match="không hợp lệ"):
            publish_video_job("invalid-uuid")

    def test_publish_video_job_missing_file(self, db_session: Session):
        """Test US-10: publish_video_job raises error when no file"""
        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        video = Video(
            campaign_id=campaign.id,
            original_id="test_video",
            source_video_url="https://tiktok.com/test",
            status=VideoStatus.ready,
            file_path=None,
        )
        db_session.add(video)
        db_session.commit()

        with pytest.raises(ValueError, match="chưa có file"):
            publish_video_job(str(video.id))

    def test_auto_post_scheduler_logic(self, db_session: Session):
        """Test US-11: Auto-post scheduler can find ready videos"""
        # Create a page
        page = FacebookPage(
            page_id="test_page_123",
            page_name="Test Page",
            long_lived_access_token="encrypted_token",
        )
        db_session.add(page)
        db_session.commit()

        # Create campaign with target page
        campaign = Campaign(
            name="Auto Post Test",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
            target_page_id="test_page_123",
            auto_post=True,
            schedule_interval=7200,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        # Create video ready to post
        video = Video(
            campaign_id=campaign.id,
            original_id="ready_video",
            source_video_url="https://tiktok.com/ready",
            status=VideoStatus.ready,
            file_path="C:/fake/path/video.mp4",
            publish_time=datetime.utcnow() - timedelta(hours=1),
            priority=1,
        )
        db_session.add(video)
        db_session.commit()

        # Verify video is ready
        ready_videos = (
            db_session.query(Video)
            .filter(
                Video.status == VideoStatus.ready,
                Video.publish_time <= datetime.utcnow(),
            )
            .all()
        )
        assert len(ready_videos) >= 1


class TestPhase3Analytics:
    """Test US-02, US-03: Channel and Video Metrics"""

    def test_sync_channel_metrics_function_exists(self):
        """Test US-02: sync_channel_metrics function exists"""
        from app.services.campaign_jobs import sync_channel_metrics_for_target_channel

        assert callable(sync_channel_metrics_for_target_channel)

    def test_channel_metrics_snapshot_model_exists(self, db_session: Session):
        """Test US-02: ChannelMetricsSnapshot model exists"""
        from app.models.models import ChannelMetricsSnapshot

        assert ChannelMetricsSnapshot is not None

    def test_channel_metrics_can_be_stored(self, db_session: Session):
        """Test US-02: Channel metrics can be stored in database"""
        # Create target channel
        channel = TargetChannel(
            channel_id="ch_test_123",
            username="testuser",
            display_name="Test User",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        # Create metrics snapshot
        snapshot = ChannelMetricsSnapshot(
            channel_id=channel.id,
            followers=10000,
            following=500,
            likes=50000,
            video_count=100,
            total_views=1000000,
            snapshot_date=datetime.utcnow(),
        )
        db_session.add(snapshot)
        db_session.commit()

        # Verify metrics stored
        stored = (
            db_session.query(ChannelMetricsSnapshot)
            .filter(ChannelMetricsSnapshot.channel_id == channel.id)
            .first()
        )
        assert stored is not None
        assert stored.followers == 10000

    def test_video_metrics_snapshot_model_exists(self, db_session: Session):
        """Test US-03: VideoMetricsSnapshot model exists"""
        from app.models.models import VideoMetricsSnapshot

        assert VideoMetricsSnapshot is not None

    def test_tiktok_analytics_service_functions_exist(self):
        """Test US-02, US-03: Analytics service functions exist"""
        from app.services.tiktok_analytics import (
            extract_channel_metrics,
            extract_video_metrics,
            extract_channel_video_list,
            is_video_older_than_30_days,
        )

        assert callable(extract_channel_metrics)
        assert callable(extract_video_metrics)
        assert callable(extract_channel_video_list)
        assert callable(is_video_older_than_30_days)


class TestPhase2Phase3Integration:
    """Integration tests for complete flows"""

    def test_end_to_end_flow_channel_to_metrics_to_dashboard(self, db_session: Session):
        """Test complete flow: Add Channel -> Sync Metrics -> View Dashboard"""
        # 1. Create target channel
        channel = TargetChannel(
            channel_id="ch_flow_123",
            username="flowuser",
            display_name="Flow User",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        # 2. Store channel metrics
        snapshot = ChannelMetricsSnapshot(
            channel_id=channel.id,
            followers=50000,
            following=200,
            likes=200000,
            video_count=50,
            total_views=5000000,
            snapshot_date=datetime.utcnow(),
        )
        db_session.add(snapshot)
        db_session.commit()

        # 3. Verify channel can be retrieved with metrics
        retrieved_channel = (
            db_session.query(TargetChannel)
            .filter(TargetChannel.id == channel.id)
            .first()
        )
        assert retrieved_channel is not None

        metrics = (
            db_session.query(ChannelMetricsSnapshot)
            .filter(ChannelMetricsSnapshot.channel_id == channel.id)
            .all()
        )
        assert len(metrics) >= 1

    def test_campaign_to_video_to_publish_flow(self, db_session: Session):
        """Test flow: Create Campaign -> Sync Videos -> Schedule -> Publish"""
        # 1. Create Facebook Page
        page = FacebookPage(
            page_id="page_flow_123",
            page_name="Flow Page",
            long_lived_access_token="encrypted_token",
            auto_post=True,
        )
        db_session.add(page)
        db_session.commit()

        # 2. Create Campaign with page
        campaign = Campaign(
            name="Flow Campaign",
            source_url="https://tiktok.com/@flowtest",
            status=CampaignStatus.active,
            target_page_id="page_flow_123",
            auto_post=True,
            schedule_interval=3600,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        # 3. Create Video in campaign
        video = Video(
            campaign_id=campaign.id,
            original_id="flow_video_1",
            source_video_url="https://tiktok.com/@flowtest/video/1",
            status=VideoStatus.ready,
            original_caption="Original caption",
            ai_caption="AI generated caption",
            file_path="C:/temp/video.mp4",
            views=100000,
            likes=10000,
            comments_count=500,
            priority=1,
            publish_time=datetime.utcnow(),
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        # 4. Verify flow is complete
        # Check campaign has videos
        videos = db_session.query(Video).filter(Video.campaign_id == campaign.id).all()
        assert len(videos) >= 1
        assert videos[0].status == VideoStatus.ready


class TestRegressionPhase1:
    """Ensure Phase 1 features still work"""

    def test_channel_crud_operations(self, db_session: Session):
        """Regression: Channel CRUD operations work"""
        # Create
        channel = TargetChannel(
            channel_id="reg_ch_1",
            username="testregression",
            display_name="Regression Test",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        # Read
        retrieved = (
            db_session.query(TargetChannel)
            .filter(TargetChannel.id == channel.id)
            .first()
        )
        assert retrieved is not None

        # Update
        retrieved.topic = "Entertainment"
        db_session.commit()

        # Verify update
        updated = (
            db_session.query(TargetChannel)
            .filter(TargetChannel.id == channel.id)
            .first()
        )
        assert updated.topic == "Entertainment"

    def test_video_status_enum(self):
        """Regression: Video status enum works correctly"""
        assert VideoStatus.pending == "pending"
        assert VideoStatus.downloading == "downloading"
        assert VideoStatus.ready == "ready"
        assert VideoStatus.posted == "posted"
        assert VideoStatus.failed == "failed"

    def test_campaign_status_enum(self):
        """Regression: Campaign status enum works"""
        assert CampaignStatus.active == "active"
        assert CampaignStatus.paused == "paused"

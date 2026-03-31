import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models.models import Campaign, CampaignStatus, Video, VideoStatus


class TestVideoAPI:
    def test_list_videos_default(self, client, auth_headers, db_session: Session):
        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        for i in range(5):
            video = Video(
                campaign_id=campaign.id,
                original_id=f"video{i}",
                source_video_url=f"https://tiktok.com/@test/video{i}",
                status=VideoStatus.pending,
                priority=i,
            )
            db_session.add(video)
        db_session.commit()

        response = client.get("/videos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5

    def test_list_videos_filter_by_status(
        self, client, auth_headers, db_session: Session
    ):
        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        pending = Video(
            campaign_id=campaign.id, original_id="v1", status=VideoStatus.pending
        )
        ready = Video(
            campaign_id=campaign.id, original_id="v2", status=VideoStatus.ready
        )
        db_session.add_all([pending, ready])
        db_session.commit()

        response = client.get("/videos?status=ready", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "ready"

    def test_list_videos_filter_by_campaign(
        self, client, auth_headers, db_session: Session
    ):
        c1 = Campaign(
            name="Campaign 1",
            source_url="https://tiktok.com/@c1",
            status=CampaignStatus.active,
        )
        c2 = Campaign(
            name="Campaign 2",
            source_url="https://tiktok.com/@c2",
            status=CampaignStatus.active,
        )
        db_session.add_all([c1, c2])
        db_session.commit()
        db_session.refresh(c1)
        db_session.refresh(c2)

        v1 = Video(campaign_id=c1.id, original_id="v1", status=VideoStatus.pending)
        v2 = Video(campaign_id=c2.id, original_id="v2", status=VideoStatus.pending)
        db_session.add_all([v1, v2])
        db_session.commit()

        response = client.get(f"/videos?campaign_id={c1.id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_list_videos_sort_by_priority(
        self, client, auth_headers, db_session: Session
    ):
        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        for i in [3, 1, 2]:
            video = Video(
                campaign_id=campaign.id,
                original_id=f"v{i}",
                status=VideoStatus.ready,
                priority=i,
            )
            db_session.add(video)
        db_session.commit()

        response = client.get(
            "/videos?sort_by=priority&sort_order=desc", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["priority"] == 3
        assert data["items"][1]["priority"] == 2
        assert data["items"][2]["priority"] == 1

    def test_list_videos_pagination(self, client, auth_headers, db_session: Session):
        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        for i in range(25):
            video = Video(
                campaign_id=campaign.id,
                original_id=f"video{i}",
                status=VideoStatus.pending,
            )
            db_session.add(video)
        db_session.commit()

        response = client.get("/videos?page=1&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert data["page_size"] == 10
        assert len(data["items"]) == 10

    def test_get_video_success(self, client, auth_headers, db_session: Session):
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
            original_id="testvideo",
            source_video_url="https://tiktok.com/@test/video/123",
            status=VideoStatus.ready,
            views=50000,
            likes=5000,
            comments_count=500,
            priority=1,
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        response = client.get(f"/videos/{video.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["original_id"] == "testvideo"
        assert data["views"] == 50000
        assert data["priority"] == 1

    def test_get_video_not_found(self, client, auth_headers):
        fake_id = str(uuid.uuid4())
        response = client.get(f"/videos/{fake_id}", headers=auth_headers)
        assert response.status_code == 404

    def test_update_video_ai_caption(self, client, auth_headers, db_session: Session):
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
            original_id="testvideo",
            status=VideoStatus.ready,
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        response = client.patch(
            f"/videos/{video.id}",
            json={"ai_caption": "New AI caption"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["ai_caption"] == "New AI caption"

    def test_update_video_priority(self, client, auth_headers, db_session: Session):
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
            original_id="testvideo",
            status=VideoStatus.ready,
            priority=0,
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        response = client.patch(
            f"/videos/{video.id}",
            json={"priority": 5},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["priority"] == 5

    def test_delete_video(self, client, auth_headers, db_session: Session):
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
            original_id="testvideo",
            status=VideoStatus.pending,
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        response = client.delete(f"/videos/{video.id}", headers=auth_headers)
        assert response.status_code == 204

        db_session.refresh(video)
        assert video.is_deleted is True

    def test_bulk_update_priority(self, client, auth_headers, db_session: Session):
        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@test",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(campaign)

        v1 = Video(
            campaign_id=campaign.id,
            original_id="v1",
            status=VideoStatus.ready,
            priority=0,
        )
        v2 = Video(
            campaign_id=campaign.id,
            original_id="v2",
            status=VideoStatus.ready,
            priority=0,
        )
        db_session.add_all([v1, v2])
        db_session.commit()
        db_session.refresh(v1)
        db_session.refresh(v2)

        response = client.post(
            "/videos/bulk-priority",
            json={
                "video_priorities": [
                    {"video_id": str(v1.id), "priority": 5},
                    {"video_id": str(v2.id), "priority": 10},
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["updated_count"] == 2

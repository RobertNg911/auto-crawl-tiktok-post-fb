import uuid

import pytest
from sqlalchemy.orm import Session

from app.models.models import TargetChannel, ChannelStatus


class TestChannelAPI:
    def test_create_channel_success(self, client, auth_headers):
        response = client.post(
            "/channels",
            json={
                "username": "testchannel",
                "display_name": "Test Channel",
                "topic": "entertainment",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "testchannel"
        assert data["display_name"] == "Test Channel"
        assert data["topic"] == "entertainment"
        assert data["status"] == "active"
        assert "id" in data

    def test_create_channel_duplicate(self, client, auth_headers, db_session: Session):
        channel = TargetChannel(
            channel_id="tiktok_duplicate",
            username="duplicate",
            display_name="Duplicate",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()

        response = client.post(
            "/channels",
            json={"username": "duplicate"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_channel_invalid_username(self, client, auth_headers):
        response = client.post(
            "/channels",
            json={"username": "invalid@username!"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_list_channels_default(self, client, auth_headers, db_session: Session):
        for i in range(3):
            channel = TargetChannel(
                channel_id=f"tiktok_channel{i}",
                username=f"channel{i}",
                display_name=f"Channel {i}",
                status=ChannelStatus.active,
            )
            db_session.add(channel)
        db_session.commit()

        response = client.get("/channels", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_list_channels_filter_by_status(
        self, client, auth_headers, db_session: Session
    ):
        active = TargetChannel(
            channel_id="tiktok_active",
            username="active",
            status=ChannelStatus.active,
        )
        inactive = TargetChannel(
            channel_id="tiktok_inactive",
            username="inactive",
            status=ChannelStatus.inactive,
        )
        db_session.add_all([active, inactive])
        db_session.commit()

        response = client.get("/channels?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "active"

    def test_list_channels_search(self, client, auth_headers, db_session: Session):
        channel = TargetChannel(
            channel_id="tiktok_search",
            username="searchable",
            display_name="Search Target",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()

        response = client.get("/channels?search=search", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_list_channels_pagination(self, client, auth_headers, db_session: Session):
        for i in range(25):
            channel = TargetChannel(
                channel_id=f"tiktok_page{i}",
                username=f"page{i}",
                status=ChannelStatus.active,
            )
            db_session.add(channel)
        db_session.commit()

        response = client.get("/channels?page=1&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert data["page_size"] == 10
        assert len(data["items"]) == 10

    def test_get_channel_success(self, client, auth_headers, db_session: Session):
        channel = TargetChannel(
            channel_id="tiktok_get",
            username="gettest",
            display_name="Get Test",
            topic="tech",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        response = client.get(f"/channels/{channel.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "gettest"
        assert data["display_name"] == "Get Test"

    def test_get_channel_not_found(self, client, auth_headers):
        fake_id = str(uuid.uuid4())
        response = client.get(f"/channels/{fake_id}", headers=auth_headers)
        assert response.status_code == 404

    def test_update_channel(self, client, auth_headers, db_session: Session):
        channel = TargetChannel(
            channel_id="tiktok_update",
            username="updatetest",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        response = client.patch(
            f"/channels/{channel.id}",
            json={"display_name": "Updated Name", "topic": "music"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated Name"
        assert data["topic"] == "music"

    def test_update_channel_status(self, client, auth_headers, db_session: Session):
        channel = TargetChannel(
            channel_id="tiktok_status",
            username="statustest",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        response = client.patch(
            f"/channels/{channel.id}",
            json={"status": "inactive"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "inactive"

    def test_delete_channel_success(self, client, auth_headers, db_session: Session):
        channel = TargetChannel(
            channel_id="tiktok_delete",
            username="deletetest",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        response = client.delete(f"/channels/{channel.id}", headers=auth_headers)
        assert response.status_code == 204

        db_session.refresh(channel)
        assert channel.is_deleted is True

    def test_delete_channel_used_in_campaign(
        self, client, auth_headers, db_session: Session
    ):
        from app.models.models import Campaign, CampaignStatus

        channel = TargetChannel(
            channel_id="tiktok_protected",
            username="protected",
            status=ChannelStatus.active,
        )
        db_session.add(channel)
        db_session.commit()

        campaign = Campaign(
            name="Test Campaign",
            source_url="https://tiktok.com/@protected",
            status=CampaignStatus.active,
        )
        db_session.add(campaign)
        db_session.commit()
        db_session.refresh(channel)

        response = client.delete(f"/channels/{channel.id}", headers=auth_headers)
        assert response.status_code == 400
        assert "active campaigns" in response.json()["detail"]

    def test_list_channels_with_topic_filter(
        self, client, auth_headers, db_session: Session
    ):
        channels = [
            TargetChannel(
                channel_id="tiktok_topic1",
                username="topic1",
                topic="music",
                status=ChannelStatus.active,
            ),
            TargetChannel(
                channel_id="tiktok_topic2",
                username="topic2",
                topic="music",
                status=ChannelStatus.active,
            ),
            TargetChannel(
                channel_id="tiktok_topic3",
                username="topic3",
                topic="sports",
                status=ChannelStatus.active,
            ),
        ]
        db_session.add_all(channels)
        db_session.commit()

        response = client.get("/channels?topic=music", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 2

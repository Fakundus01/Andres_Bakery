from __future__ import annotations

from ..extensions import db
from ..models import SiteContent


class SiteService:
    def get_about(self) -> dict:
        content = db.session.get(SiteContent, "about")
        return {"content": content.content if content else ""}

    def update_about(self, data: dict) -> dict:
        content_text = str(data.get("content") or "")
        content = db.session.get(SiteContent, "about")
        if not content:
            content = SiteContent(key="about", content=content_text)
            db.session.add(content)
        else:
            content.content = content_text
        db.session.commit()
        return {"status": "updated"}


site_service = SiteService()

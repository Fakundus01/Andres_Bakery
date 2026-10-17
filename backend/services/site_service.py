from __future__ import annotations

from flask import current_app

from ..extensions import db
from ..models import SiteContent


class SiteService:
    def get_delivery(self) -> dict:
        """Una sola fuente de verdad para la zona, el envio y el telefono (C4).

        El front no vuelve a hardcodear 2500 ni a repetir el numero de WhatsApp
        en su propio .env: lo que vale es el entorno del back.
        """
        return {
            "zone_name": str(current_app.config["DELIVERY_ZONE_NAME"]),
            "fee": float(current_app.config["DELIVERY_FEE"]),
            "pickup_address": str(current_app.config["PICKUP_ADDRESS"]),
            "whatsapp_phone": str(current_app.config.get("WHATSAPP_PHONE") or ""),
            "payments_enabled": bool(current_app.config.get("PAYMENTS_ENABLED")),
        }

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

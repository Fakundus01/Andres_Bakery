from flask import Blueprint, current_app, jsonify, request
from flask_mail import Message  #type: ignore
 
from ..extensions import mail


bp = Blueprint("mailer", __name__, url_prefix="/api/contact")


@bp.post("")
def send_contact():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    message = data.get("message")

    if not name or not email or not message:
        return jsonify({"error": "name, email and message are required"}), 400

    if not current_app.config.get("MAIL_SERVER"):
        return jsonify({"error": "mail service not configured"}), 503

    support_email = current_app.config["SUPPORT_EMAIL"]
    msg = Message(
        subject=f"Consulta de {name}",
        sender=current_app.config["MAIL_DEFAULT_SENDER"],
        recipients=[support_email],
        body=f"De: {name} <{email}>\n\n{message}",
    )
    mail.send(msg)
    return jsonify({"status": "sent"})

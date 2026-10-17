from flask import Blueprint, request, send_file

from ..services.upload_service import upload_service
from .utils import admin_required, json_endpoint


bp = Blueprint("uploads", __name__)


@bp.post("/api/uploads")
@admin_required
@json_endpoint
def create_upload():
    archivo = request.files.get("file")
    data = archivo.read() if archivo else b""
    return upload_service.guardar(data), 201


@bp.get("/uploads/<nombre>")
def serve_upload(nombre: str):
    """Sirve una foto subida, inerte (ADR-018).

    `Content-Type` fijo segun lo que el validador reconocio al guardarla, no
    segun la extension ni lo que dijo el navegador que la subio, y `nosniff`
    para que nadie la reinterprete como otra cosa.
    """
    ruta = upload_service.ruta_de(nombre)
    if ruta is None:
        return {"error": "not found"}, 404

    tipo = "image/png" if ruta.suffix == ".png" else "image/jpeg"
    respuesta = send_file(ruta, mimetype=tipo, as_attachment=False, max_age=3600)
    respuesta.headers["Content-Disposition"] = "inline"
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    return respuesta

from __future__ import annotations

import secrets
from pathlib import Path

from flask import current_app

from .exceptions import ValidationError
from .image_file import ImagenInvalida, limpiar


# 4 MB. Una foto de celular ronda 2-4 MB; mas que esto no mejora como se ve en
# una carta y empieza a ser un problema de disco y de datos moviles.
MAX_BYTES = 4 * 1024 * 1024

PREFIJO_PUBLICO = "/uploads/"


class UploadService:
    """Guarda lo que Andrea sube desde el panel (F45, ADR-018).

    Lo que llega se valida por contenido y se reescribe sin metadatos antes de
    tocar el disco. El nombre lo elige el servidor: el del cliente se descarta
    entero, asi que no hay `../` que pueda escapar de la carpeta.
    """

    def carpeta(self) -> Path:
        configurada = current_app.config.get("UPLOAD_DIR")
        destino = Path(configurada) if configurada else Path(current_app.instance_path) / "uploads"
        destino.mkdir(parents=True, exist_ok=True)
        return destino

    def max_bytes(self) -> int:
        return int(current_app.config.get("UPLOAD_MAX_BYTES") or MAX_BYTES)

    def guardar(self, data: bytes) -> dict:
        if not data:
            raise ValidationError("No llego ningun archivo.")

        tope = self.max_bytes()
        if len(data) > tope:
            megas = tope / (1024 * 1024)
            raise ValidationError(f"La imagen pesa mas de {megas:.0f} MB. Sacale peso o elegi otra.")

        try:
            imagen = limpiar(data)
        except ImagenInvalida as exc:
            # El mensaje del validador esta escrito para que lo lea ella, no un
            # programador: nombra el caso (HEIC del iPhone, WEBP) en castellano.
            raise ValidationError(str(exc)) from exc

        nombre = f"{secrets.token_hex(16)}{imagen.extension}"
        (self.carpeta() / nombre).write_bytes(imagen.data)

        return {
            "url": f"{PREFIJO_PUBLICO}{nombre}",
            "filename": nombre,
            "content_type": imagen.content_type,
            "bytes": len(imagen.data),
            "width": imagen.width,
            "height": imagen.height,
        }

    def ruta_de(self, nombre: str) -> Path | None:
        """La ruta en disco de un archivo ya guardado, o None.

        El nombre se vuelve a validar aunque lo haya generado el servidor: esta
        funcion la llama una ruta HTTP, y lo que viene de la red se revisa
        siempre. Solo pasa la forma exacta que genera `guardar`.
        """
        if not _nombre_propio(nombre):
            return None
        candidato = self.carpeta() / nombre
        return candidato if candidato.is_file() else None


def _nombre_propio(nombre: str) -> bool:
    if not nombre or len(nombre) > 64:
        return False
    cuerpo, punto, extension = nombre.rpartition(".")
    if not punto or f".{extension}" not in (".jpg", ".png"):
        return False
    return len(cuerpo) == 32 and all(caracter in "0123456789abcdef" for caracter in cuerpo)


upload_service = UploadService()

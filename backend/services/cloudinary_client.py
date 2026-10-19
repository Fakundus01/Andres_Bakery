"""Subir y borrar en Cloudinary, firmado, sin dependencia nueva (ADR-032).

El SDK oficial sumaria un paquete —y su auditoria (R19)— para armar un
multipart y un SHA-1. `payment_service.py` ya llama a Mercado Pago con
`urllib` por la misma razon, asi que el camino esta probado en este repo.

**Firmado y no `unsigned`.** Un upload preset sin firma es mas simple y es una
puerta publica de escritura a la cuenta de Andrea: se saltea nuestro validador
de imagenes y cualquiera le llena el plan free. El `api_secret` se usa solo
aca, del lado del servidor.
"""

from __future__ import annotations

from hashlib import sha1
import json
import secrets
import time
from urllib import error, request as urllib_request

from flask import current_app

from .exceptions import ConfigurationError, ExternalServiceError


BASE_URL = "https://api.cloudinary.com/v1_1"
SERVIDOR_DE_FOTOS = "https://res.cloudinary.com"
TIMEOUT = 20


class CloudinaryClient:
    """Las cuatro variables del entorno, o nada.

    `configurado()` es lo que decide si las fotos van a Cloudinary o al disco:
    sin credenciales el back sigue andando igual, que es lo que pasa hoy en
    desarrollo.
    """

    def configurado(self) -> bool:
        return all(
            str(current_app.config.get(clave) or "").strip()
            for clave in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
        )

    def cloud_name(self) -> str:
        return str(current_app.config.get("CLOUDINARY_CLOUD_NAME") or "").strip()

    def carpeta(self) -> str:
        return str(current_app.config.get("CLOUDINARY_FOLDER") or "").strip().strip("/")

    def subir(self, data: bytes, *, extension: str, nombre: str | None = None) -> dict:
        """Sube la imagen ya validada y limpia, y devuelve `(public_id, url)`.

        El nombre lo elige el servidor, igual que en disco: el del cliente se
        descarta entero, asi que no hay `../` ni colision que pueda forzar. Lo
        recibe de `almacen_de_imagenes`, que lo necesita **antes** de subir
        para reservar la cuota con esa clave.
        """
        nombre = nombre or secrets.token_hex(16)
        carpeta = self.carpeta()
        parametros = {"public_id": nombre, "timestamp": str(int(time.time()))}
        if carpeta:
            parametros["folder"] = carpeta

        respuesta = self._post(
            "/image/upload",
            parametros,
            archivo=(f"{nombre}{extension}", data),
        )
        public_id = str(respuesta.get("public_id") or "")
        url = str(respuesta.get("secure_url") or "")
        if not public_id or not url:
            raise ExternalServiceError("Cloudinary no devolvió la URL de la foto.")
        return {
            "public_id": public_id,
            "url": url,
            "bytes": int(respuesta.get("bytes") or len(data)),
            "width": int(respuesta.get("width") or 0),
            "height": int(respuesta.get("height") or 0),
        }

    def borrar(self, public_id: str) -> bool:
        respuesta = self._post(
            "/image/destroy",
            {"public_id": public_id, "timestamp": str(int(time.time()))},
        )
        return str(respuesta.get("result") or "") in {"ok", "not found"}

    def firma(self, parametros: dict[str, str]) -> str:
        """SHA-1 de los parametros ordenados mas el `api_secret`.

        Es el esquema que pide Cloudinary: `api_key`, `file` y
        `resource_type` quedan afuera de la firma, y el resto va ordenado
        alfabeticamente.
        """
        secreto = str(current_app.config.get("CLOUDINARY_API_SECRET") or "")
        cadena = "&".join(f"{clave}={parametros[clave]}" for clave in sorted(parametros))
        return sha1(f"{cadena}{secreto}".encode("utf-8")).hexdigest()

    def _post(
        self,
        ruta: str,
        parametros: dict[str, str],
        *,
        archivo: tuple[str, bytes] | None = None,
    ) -> dict:
        if not self.configurado():
            raise ConfigurationError("Cloudinary no está configurado.")

        campos = dict(parametros)
        campos["signature"] = self.firma(parametros)
        campos["api_key"] = str(current_app.config.get("CLOUDINARY_API_KEY") or "")

        borde = f"----andresbakery{secrets.token_hex(8)}"
        cuerpo = _multipart(campos, archivo, borde)
        pedido = urllib_request.Request(
            url=f"{BASE_URL}/{self.cloud_name()}{ruta}",
            data=cuerpo,
            headers={"Content-Type": f"multipart/form-data; boundary={borde}"},
            method="POST",
        )
        try:
            with urllib_request.urlopen(pedido, timeout=TIMEOUT) as respuesta:
                return json.loads(respuesta.read().decode("utf-8"))
        except error.HTTPError as exc:
            detalle = exc.read().decode("utf-8", errors="ignore")
            raise ExternalServiceError(_mensaje_de_cloudinary(detalle) or str(exc)) from exc
        except error.URLError as exc:
            raise ExternalServiceError(f"No se pudo hablar con Cloudinary: {exc}") from exc


def _multipart(campos: dict[str, str], archivo: tuple[str, bytes] | None, borde: str) -> bytes:
    partes: list[bytes] = []
    for clave, valor in campos.items():
        partes.append(f"--{borde}\r\n".encode("utf-8"))
        partes.append(
            f'Content-Disposition: form-data; name="{clave}"\r\n\r\n{valor}\r\n'.encode("utf-8")
        )
    if archivo is not None:
        nombre, data = archivo
        partes.append(f"--{borde}\r\n".encode("utf-8"))
        partes.append(
            f'Content-Disposition: form-data; name="file"; filename="{nombre}"\r\n'
            "Content-Type: application/octet-stream\r\n\r\n".encode("utf-8")
        )
        partes.append(data)
        partes.append(b"\r\n")
    partes.append(f"--{borde}--\r\n".encode("utf-8"))
    return b"".join(partes)


def _mensaje_de_cloudinary(cuerpo: str) -> str:
    """El texto del error, si vino en JSON. Si no, nada: no se adivina."""
    try:
        return str(json.loads(cuerpo).get("error", {}).get("message") or "")
    except (ValueError, AttributeError):
        return ""


cloudinary_client = CloudinaryClient()

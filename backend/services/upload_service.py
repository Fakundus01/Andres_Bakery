from __future__ import annotations

from pathlib import Path

from flask import current_app

from .almacen_de_imagenes import (
    KIND_PRODUCTO,
    KIND_REFERENCIA,
    PREFIJO_PUBLICO,
    almacen_de_imagenes,
)
from .exceptions import ValidationError
from .image_file import ImagenInvalida, limpiar


# 4 MB. Una foto de celular ronda 2-4 MB; mas que esto no mejora como se ve en
# una carta y empieza a ser un problema de disco y de datos moviles.
MAX_BYTES = 4 * 1024 * 1024
MAX_BYTES_REFERENCIA = 2 * 1024 * 1024


class UploadService:
    """Las dos puertas de subida, con dos politicas (F45, F59, ADR-018/032).

    Lo que llega se valida por contenido y se reescribe sin metadatos antes de
    tocar el disco o salir a Cloudinary. El nombre lo elige el servidor: el
    del cliente se descarta entero, asi que no hay `../` que pueda escapar.

    **Dos rutas y no una con el `@admin_required` sacado.** La del panel es de
    Andrea y admite 4 MB; la publica la usa cualquiera, admite menos, tiene
    tope por IP y lo que sube nace provisorio. Una sola ruta con un `if`
    adentro es el lugar donde esas dos politicas se mezclan sin que nadie lo
    note.
    """

    def guardar(self, data: bytes) -> dict:
        """La del panel: la sube Andrea, con token de admin."""
        return self._guardar(
            data, tope=self.max_bytes(), kind=KIND_PRODUCTO, provisional=False
        )

    def guardar_referencia(self, data: bytes) -> dict:
        """La publica: foto de referencia de una torta a pedido (F59).

        Nace **provisoria**: el cliente la sube antes de que el pedido exista,
        y si abandona el carrito —lo mas comun en una tienda— nadie la va a
        reclamar. El barrido se dispara aca, antes de sumar una mas, para que
        la limpieza no dependa de que alguien se acuerde de correrla.
        """
        almacen_de_imagenes.barrer_provisorias()
        return self._guardar(
            data,
            tope=self.max_bytes_referencia(),
            kind=KIND_REFERENCIA,
            provisional=True,
        )

    def max_bytes(self) -> int:
        return int(current_app.config.get("UPLOAD_MAX_BYTES") or MAX_BYTES)

    def max_bytes_referencia(self) -> int:
        tope = int(current_app.config.get("REFERENCE_UPLOAD_MAX_BYTES") or MAX_BYTES_REFERENCIA)
        # Nunca mas que la del panel: si alguien sube el tope general sin
        # mirar este, la ruta publica no puede quedar mas permisiva que la de
        # ella.
        return min(tope, self.max_bytes())

    def carpeta(self) -> Path:
        return almacen_de_imagenes.carpeta()

    def ruta_de(self, nombre: str) -> Path | None:
        return almacen_de_imagenes.ruta_local(nombre)

    def _guardar(self, data: bytes, *, tope: int, kind: str, provisional: bool) -> dict:
        if not data:
            raise ValidationError("No llego ningun archivo.")

        if len(data) > tope:
            megas = tope / (1024 * 1024)
            raise ValidationError(
                f"La imagen pesa mas de {megas:.0f} MB. Sacale peso o elegi otra."
            )

        try:
            imagen = limpiar(data)
        except ImagenInvalida as exc:
            # El mensaje del validador esta escrito para que lo lea ella, no un
            # programador: nombra el caso (HEIC del iPhone, WEBP) en castellano.
            raise ValidationError(str(exc)) from exc

        return almacen_de_imagenes.guardar(imagen, kind=kind, provisional=provisional)


upload_service = UploadService()

__all__ = ["MAX_BYTES", "PREFIJO_PUBLICO", "UploadService", "upload_service"]

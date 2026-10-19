"""Que fotos tenemos guardadas: la reserva, la cuota y el barrido.

Salio de `almacen_de_imagenes.py` (R05), y el corte no es por tamano: son dos
responsabilidades. El almacen sabe **donde vive** una foto; esto sabe **que
tenemos**, cuanto lugar queda y que se puede borrar.

La cuota se sostiene **reservando primero y verificando despues**, no mirando
la suma antes de escribir: seis subidas simultaneas por la ruta publica veian
las seis la misma suma vieja y entraban las seis, 5,7x la cuota (lo midio el
reviewer de T18 con una barrera). Es el mismo `check-then-insert` que ADR-030
cerro para la unicidad del ingrediente.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import threading

from flask import current_app

from ..extensions import db
from ..models import StoredImage
from .exceptions import StorageFullError


KIND_PRODUCTO = "product"
KIND_REFERENCIA = "reference"

# Cuantas huerfanas borra un barrido. Acotado a proposito: el barrido se
# dispara en una request, y con Cloudinary cada borrado es una llamada HTTP.
MAX_POR_BARRIDO = 25

# Una reserva que no llego a archivo se suelta sola pasada esta ventana. Es el
# resto que deja un proceso que murio entre reservar y escribir.
HORAS_DE_RESERVA = 1

# Serializa medir-reservar dentro de este proceso. No cruza procesos: con N
# workers el que manda es el "reservar antes de escribir", que como mucho deja
# pasar una foto por worker en vez de un numero sin techo.
_CANDADO_DE_CUOTA = threading.Lock()


class RegistroDeImagenes:
    """Una fila por foto guardada, y las cuentas que se hacen sobre eso."""

    def __init__(self, borrar_del_destino=None) -> None:
        # Quien sabe borrar en el destino lo inyecta el almacen: el registro no
        # tiene por que saber si la foto esta en disco o en Cloudinary.
        self._borrar_del_destino = borrar_del_destino

    def reservar(
        self, storage_key: str, bytes_nuevos: int, *, kind: str, provisional: bool
    ) -> StoredImage:
        """Anota la fila y **despues** mira si entraba. Si no, la suelta.

        La fila nace con `url` vacia: es una reserva, no una foto. Eso la hace
        reconocible para el barrido —si el proceso muere entre reservar y
        escribir, nadie la va a reclamar— y la deja afuera de `es_nuestra`,
        que busca por URL.
        """
        with _CANDADO_DE_CUOTA:
            reserva = StoredImage(
                storage_key=storage_key,
                url="",
                bytes=bytes_nuevos,
                kind=kind,
                provisional=provisional,
            )
            db.session.add(reserva)
            db.session.commit()

            # `espacio_usado` ya cuenta esta reserva: por eso se compara con
            # la cuota pelada y no sumandole los bytes de nuevo.
            total = int(current_app.config.get("UPLOAD_QUOTA_BYTES") or 0)
            propia = self.cuota(kind)
            sin_lugar = (total > 0 and self.espacio_usado() > total) or (
                propia > 0 and self.espacio_usado_por(kind) > propia
            )
            if sin_lugar:
                self.soltar(reserva)
                raise StorageFullError(self._mensaje_sin_lugar(kind))
        return reserva

    @staticmethod
    def _mensaje_sin_lugar(kind: str) -> str:
        """Cada puerta tiene su mensaje: lo lee gente distinta."""
        if kind == KIND_REFERENCIA:
            return (
                "No queda lugar para más fotos por ahora. "
                "Mandá el pedido sin foto y pasanos la imagen por WhatsApp."
            )
        return (
            "Se llenó el espacio de fotos del sitio. Borrá alguna foto vieja "
            "o subí el tope (UPLOAD_QUOTA_BYTES) antes de seguir."
        )

    @staticmethod
    def soltar(reserva: StoredImage) -> None:
        """Devuelve el lugar reservado. No puede tapar el error que la trajo."""
        try:
            db.session.delete(reserva)
            db.session.commit()
        except Exception:
            db.session.rollback()

    def marcar_usada(self, url: str) -> None:
        """La foto deja de ser provisoria: ya tiene un pedido que la usa.

        Lo provisorio es lo que el barrido se lleva. El cliente sube la foto
        **antes** de que el pedido exista, asi que sin esta marca el barrido
        borraria justo la que si llego a usarse.
        """
        fila = self.fila_de(url)
        if fila is not None and fila.provisional:
            fila.provisional = False

    def barrer_provisorias(self, *, ahora: datetime | None = None) -> int:
        """Borra las fotos de referencia que nunca llegaron a un pedido (D17).

        El cliente que abandona el carrito —lo mas comun que pasa en una
        tienda— deja una foto en disco subida por un anonimo. Las **usadas no
        se tocan nunca**: eso es lo que distingue este barrido de un borrado
        por fecha.
        """
        horas = int(current_app.config.get("REFERENCE_UPLOAD_TTL_HOURS") or 24)
        corte = (ahora or datetime.utcnow()) - timedelta(hours=horas)

        huerfanas = (
            StoredImage.query.filter(
                StoredImage.provisional.is_(True),
                StoredImage.kind == KIND_REFERENCIA,
                StoredImage.created_at < corte,
            )
            .order_by(StoredImage.created_at.asc())
            .limit(MAX_POR_BARRIDO)
            .all()
        )

        borradas = self._soltar_reservas_vencidas(ahora)
        for fila in huerfanas:
            if self._borrar(fila):
                db.session.delete(fila)
                borradas += 1
        if borradas:
            db.session.commit()
        return borradas

    def _soltar_reservas_vencidas(self, ahora: datetime | None) -> int:
        """Las reservas sin archivo que quedaron de un proceso que murio.

        No hay nada que borrar en el destino —nunca se escribio— pero ocupan
        cuota, asi que si nadie las completo en una hora, se van.
        """
        corte = (ahora or datetime.utcnow()) - timedelta(hours=HORAS_DE_RESERVA)
        vencidas = StoredImage.query.filter(
            StoredImage.url == "", StoredImage.created_at < corte
        ).all()
        for reserva in vencidas:
            db.session.delete(reserva)
        if vencidas:
            db.session.commit()
        return len(vencidas)

    def espacio_usado(self) -> int:
        """Bytes registrados. Las fotos de antes de ADR-032 no tienen fila.

        O sea: la cuota las cuenta de menos hasta que se reemplacen. Es
        preferible a inventar filas para archivos de los que no se sabe ni a
        que producto pertenecen.
        """
        return int(db.session.query(db.func.coalesce(db.func.sum(StoredImage.bytes), 0)).scalar() or 0)

    def cuota(self, kind: str = KIND_PRODUCTO) -> int:
        """El techo que le toca a cada puerta.

        Una sola cuota para las dos era un problema de verdad: el anonimo la
        llenaba y **Andrea recibia un 507 al subir la foto de un producto**,
        con un mensaje escrito para clientes (lo marco el pentester de T18).
        Ahora lo que sube cualquiera tiene su propio techo, mas bajo, y el
        total sigue valiendo para las dos.
        """
        total = int(current_app.config.get("UPLOAD_QUOTA_BYTES") or 0)
        if kind != KIND_REFERENCIA:
            return total
        propia = int(current_app.config.get("REFERENCE_UPLOAD_QUOTA_BYTES") or 0)
        if propia <= 0:
            return total
        return min(propia, total) if total > 0 else propia

    def espacio_usado_por(self, kind: str) -> int:
        return int(
            db.session.query(
                db.func.coalesce(db.func.sum(StoredImage.bytes), 0)
            ).filter(StoredImage.kind == kind).scalar()
            or 0
        )

    @staticmethod
    def fila_de(url: str) -> StoredImage | None:
        """La fila de una URL que emitimos, o None. El registro es su dueno."""
        return StoredImage.query.filter_by(url=url).first()

    def _borrar(self, fila: StoredImage) -> bool:
        """Sin quien sepa borrar en el destino, no se borra la fila.

        Borrarla dejaria el archivo alla sin registro, que es peor que la
        huerfana: nadie mas va a saber que existe.
        """
        if self._borrar_del_destino is None:
            return False
        return self._borrar_del_destino(fila)


registro_de_imagenes = RegistroDeImagenes()
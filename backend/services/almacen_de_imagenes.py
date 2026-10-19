"""Donde viven las fotos: Cloudinary si hay credenciales, disco si no (ADR-032).

Una sola capa para las dos fotos del proyecto —la de producto que sube Andrea
(F45) y la de referencia que sube el cliente (F59)—, porque dos caminos
distintos para lo mismo es la clase de diferencia que se descubre en
produccion.

Lo que entra aca ya paso por `image_file.limpiar`: validado por contenido y
reescrito sin metadatos. Este modulo no mira pixeles, decide **donde** se
guarda, **cuanto** espacio se puede usar (D18) y **que** se puede borrar
despues (D17).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import re
import secrets
import threading
from urllib import error, request as urllib_request

from flask import current_app

from ..extensions import db
from ..models import StoredImage
from .cloudinary_client import SERVIDOR_DE_FOTOS, cloudinary_client
from .exceptions import StorageFullError
from .image_file import ImagenLimpia


PREFIJO_PUBLICO = "/uploads/"

KIND_PRODUCTO = "product"
KIND_REFERENCIA = "reference"

# El nombre que genera el servidor: 32 hex y una extension que servimos.
_NOMBRE_PROPIO = re.compile(r"^[0-9a-f]{32}\.(jpg|png)$")

# Cuantas huerfanas borra un barrido. Acotado a proposito: el barrido se
# dispara en una request, y con Cloudinary cada borrado es una llamada HTTP.
MAX_POR_BARRIDO = 25

# Una reserva que no llego a archivo se suelta sola pasada esta ventana. Es el
# resto que deja un proceso que murio entre reservar y escribir.
HORAS_DE_RESERVA = 1

# Serializa medir-reservar dentro de este proceso. No cruza procesos: con N
# workers el que manda es el "reservar antes de escribir" de abajo, que como
# mucho deja pasar una foto por worker en vez de un numero sin techo.
_CANDADO_DE_CUOTA = threading.Lock()


class AlmacenDeImagenes:
    def guardar(
        self, imagen: ImagenLimpia, *, kind: str = KIND_PRODUCTO, provisional: bool = False
    ) -> dict:
        """Guarda la imagen limpia y la registra. Devuelve lo que ve el front.

        **Reserva primero, escribe despues.** La primera version miraba la
        suma y escribia: seis subidas simultaneas por la ruta publica veian
        las seis la misma suma vieja y entraban las seis (5,7x la cuota, lo
        midio el reviewer de T18 con una barrera). Es el mismo
        `check-then-insert` que ADR-030 tuvo que cerrar para la unicidad del
        ingrediente, y se cierra igual: la fila primero, la verificacion
        despues, y lo que no entra se suelta.
        """
        nombre = secrets.token_hex(16)
        reserva = self._reservar(
            self._clave_prevista(nombre, imagen.extension),
            len(imagen.data),
            kind=kind,
            provisional=provisional,
        )

        try:
            if cloudinary_client.configurado():
                subida = cloudinary_client.subir(
                    imagen.data, extension=imagen.extension, nombre=nombre
                )
                # Cloudinary puede devolver un `public_id` distinto del que
                # pedimos (la carpeta, un sufijo): manda el que vuelve, que es
                # el que hace falta para borrarlo despues.
                reserva.storage_key = subida["public_id"]
                reserva.url = subida["url"]
            else:
                self._escribir_en_disco(f"{nombre}{imagen.extension}", imagen.data)
                reserva.url = f"{PREFIJO_PUBLICO}{reserva.storage_key}"
            db.session.commit()
        except Exception:
            # Sin esto, una subida fallida descontaria cuota para siempre y el
            # unico arreglo seria editar la base a mano.
            self._soltar(reserva)
            raise

        return {
            "url": reserva.url,
            "filename": reserva.storage_key,
            "content_type": imagen.content_type,
            "bytes": len(imagen.data),
            "width": imagen.width,
            "height": imagen.height,
        }

    def _reservar(
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
                self._soltar(reserva)
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
    def _soltar(reserva: StoredImage) -> None:
        """Devuelve el lugar reservado. No puede tapar el error que la trajo."""
        try:
            db.session.delete(reserva)
            db.session.commit()
        except Exception:
            db.session.rollback()

    @staticmethod
    def _clave_prevista(nombre: str, extension: str) -> str:
        """La clave con la que se reserva, antes de saber si va a disco o no.

        En disco es el nombre del archivo; en Cloudinary, la carpeta mas el
        nombre, que es como arma el `public_id`. Si vuelve distinto, la fila se
        corrige con el que mando Cloudinary.
        """
        if not cloudinary_client.configurado():
            return f"{nombre}{extension}"
        carpeta = cloudinary_client.carpeta()
        return f"{carpeta}/{nombre}" if carpeta else nombre

    def es_referencia(self, url: object) -> bool:
        """¿Esta URL la emitimos nosotros, y es una foto de referencia?

        El control que importa de F59 (ADR-031): sin esto el renglon del
        pedido es un lugar donde pegar un link a cualquier cosa, y el panel de
        Andrea —y el mensaje de WhatsApp— lo muestran con su firma.

        Son tres preguntas, no una: la **forma** tiene que ser la de nuestros
        nombres, la **fila** tiene que existir en el registro, y si vive en
        disco, el **archivo** tiene que estar. La fila sola ya alcanzaria;
        la forma se chequea igual porque es gratis y porque deja el agujero
        cerrado si algun dia el registro se llena por otro camino.
        """
        fila = self._fila_si_es_nuestra(url)
        return fila is not None and fila.kind == KIND_REFERENCIA

    def es_nuestra(self, url: object) -> bool:
        """Lo mismo, sin importar quien la subio: el panel o un cliente."""
        return self._fila_si_es_nuestra(url) is not None

    def leer(self, url: object) -> tuple[bytes, str] | None:
        """Los bytes de una foto nuestra y su media type, o None.

        Lo pide el asistente de IA, que le manda la foto al modelo (F46). Pasa
        por `es_nuestra` **antes** de descargar: sin eso, pedir el borrador
        con una URL cualquiera convertiria al back en un proxy que descarga lo
        que le pidan desde su propia red (SSRF, el agujero que cerro ADR-020).
        """
        if not self.es_nuestra(url):
            return None

        texto = str(url)
        media_type = "image/png" if texto.endswith(".png") else "image/jpeg"
        if self._forma_local(texto):
            archivo = self.ruta_local(texto.removeprefix(PREFIJO_PUBLICO))
            return (archivo.read_bytes(), media_type) if archivo else None

        try:
            with urllib_request.urlopen(texto, timeout=20) as respuesta:
                return respuesta.read(), media_type
        except (error.HTTPError, error.URLError, OSError):
            return None

    def _fila_si_es_nuestra(self, url: object) -> StoredImage | None:
        """La fila del registro si la URL es una que emitimos, o None.

        Son tres preguntas, no una: la **forma** tiene que ser la de nuestros
        nombres, la **fila** tiene que existir en el registro, y si vive en
        disco, el **archivo** tiene que estar. La fila sola ya alcanzaria; la
        forma se chequea igual porque es gratis y porque deja el agujero
        cerrado si algun dia el registro se llena por otro camino.
        """
        if not isinstance(url, str) or not url:
            return None
        if not (self._forma_local(url) or self._forma_de_cloudinary(url)):
            return None
        fila = self._fila(url)
        if fila is None:
            return None
        if self._forma_local(url) and self.ruta_local(url.removeprefix(PREFIJO_PUBLICO)) is None:
            return None
        return fila

    def marcar_usada(self, url: str) -> None:
        """La foto deja de ser provisoria: ya tiene un pedido que la usa.

        Lo provisorio es lo que el barrido se lleva. El cliente sube la foto
        **antes** de que el pedido exista, asi que sin esta marca el barrido
        borraria justo la que si llego a usarse.
        """
        fila = self._fila(url)
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
            if self._borrar_del_destino(fila):
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

    def carpeta(self) -> Path:
        configurada = current_app.config.get("UPLOAD_DIR")
        destino = Path(configurada) if configurada else Path(current_app.instance_path) / "uploads"
        destino.mkdir(parents=True, exist_ok=True)
        return destino

    def ruta_local(self, nombre: str) -> Path | None:
        """La ruta en disco de un archivo ya guardado, o None.

        El nombre se vuelve a validar aunque lo haya generado el servidor:
        esta funcion la llama una ruta HTTP, y lo que viene de la red se
        revisa siempre. Solo pasa la forma exacta que genera `guardar`.
        """
        if not isinstance(nombre, str) or not _NOMBRE_PROPIO.match(nombre):
            return None
        candidato = self.carpeta() / nombre
        return candidato if candidato.is_file() else None

    def _escribir_en_disco(self, nombre: str, data: bytes) -> None:
        (self.carpeta() / nombre).write_bytes(data)

    def _borrar_del_destino(self, fila: StoredImage) -> bool:
        if fila.url.startswith(SERVIDOR_DE_FOTOS):
            if not cloudinary_client.configurado():
                # Las credenciales se fueron del entorno: borrar la fila
                # dejaria el archivo alla sin registro, que es peor.
                return False
            return cloudinary_client.borrar(fila.storage_key)

        ruta = self.carpeta() / fila.storage_key
        try:
            ruta.unlink(missing_ok=True)
        except OSError:
            return False
        return True

    @staticmethod
    def _fila(url: str) -> StoredImage | None:
        return StoredImage.query.filter_by(url=url).first()

    @staticmethod
    def _forma_local(url: str) -> bool:
        return url.startswith(PREFIJO_PUBLICO) and bool(
            _NOMBRE_PROPIO.match(url.removeprefix(PREFIJO_PUBLICO))
        )

    @staticmethod
    def _forma_de_cloudinary(url: str) -> bool:
        """`https://res.cloudinary.com/<nuestro cloud>/image/upload/.../<32 hex>.<ext>`.

        El cloud tiene que ser el nuestro: si no, cualquiera sube la foto a su
        propia cuenta de Cloudinary y la URL pasaria el filtro de forma.
        """
        prefijo = f"{SERVIDOR_DE_FOTOS}/{cloudinary_client.cloud_name()}/image/upload/"
        if not cloudinary_client.cloud_name() or not url.startswith(prefijo):
            return False
        return bool(_NOMBRE_PROPIO.match(url.rsplit("/", 1)[-1]))


almacen_de_imagenes = AlmacenDeImagenes()

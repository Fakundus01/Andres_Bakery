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

from pathlib import Path
import re
import secrets
from urllib import error, request as urllib_request

from flask import current_app

from ..extensions import db
from ..models import StoredImage
from .cloudinary_client import SERVIDOR_DE_FOTOS, cloudinary_client
from .image_file import ImagenLimpia
from .registro_de_imagenes import (
    KIND_PRODUCTO,
    KIND_REFERENCIA,
    RegistroDeImagenes,
)


PREFIJO_PUBLICO = "/uploads/"

# El nombre que genera el servidor: 32 hex y una extension que servimos.
_NOMBRE_PROPIO = re.compile(r"^[0-9a-f]{32}\.(jpg|png)$")


class AlmacenDeImagenes:
    """Donde vive una foto: Cloudinary si hay credenciales, disco si no.

    Lo que tenemos guardado —la reserva, la cuota y el barrido— lo sabe
    `RegistroDeImagenes`, que recibe de aca la unica cosa que no puede saber:
    como se borra en cada destino.
    """

    def __init__(self) -> None:
        self.registro = RegistroDeImagenes(borrar_del_destino=self._borrar_del_destino)

    # Las cuentas y el barrido se delegan: el almacen no es su dueno, pero es
    # la puerta por la que el resto del back ya los llamaba.
    def marcar_usada(self, url: str) -> None:
        self.registro.marcar_usada(url)

    def barrer_provisorias(self, *, ahora=None) -> int:
        return self.registro.barrer_provisorias(ahora=ahora)

    def espacio_usado(self) -> int:
        return self.registro.espacio_usado()

    def espacio_usado_por(self, kind: str) -> int:
        return self.registro.espacio_usado_por(kind)

    def cuota(self, kind: str = KIND_PRODUCTO) -> int:
        return self.registro.cuota(kind)

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
        reserva = self.registro.reservar(
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
            self.registro.soltar(reserva)
            raise

        return {
            "url": reserva.url,
            "filename": reserva.storage_key,
            "content_type": imagen.content_type,
            "bytes": len(imagen.data),
            "width": imagen.width,
            "height": imagen.height,
        }

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
        fila = self.registro.fila_de(url)
        if fila is None:
            return None
        if self._forma_local(url) and self.ruta_local(url.removeprefix(PREFIJO_PUBLICO)) is None:
            return None
        return fila
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

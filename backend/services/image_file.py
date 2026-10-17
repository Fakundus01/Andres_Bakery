from __future__ import annotations

from dataclasses import dataclass
from zlib import crc32


class ImagenInvalida(ValueError):
    """El archivo no es una imagen que este modulo entienda y pueda limpiar."""


# Tope de lado y de pixeles. Una foto de celular entra holgada; un PNG de
# 30.000 x 30.000 pesa poco comprimido y mata al navegador que lo abre.
MAX_LADO = 6000
MAX_PIXELES = 30_000_000

# JPEG: lo que se tira. APPn (FFE0-FFEF) trae EXIF con GPS, XMP e ICC;
# COM (FFFE) son comentarios. Nada de eso hace falta para ver la foto.
_JPEG_DESCARTE = set(range(0xE0, 0xF0)) | {0xFE}
# Marcadores sin longitud: RSTn y TEM.
_JPEG_SIN_LARGO = set(range(0xD0, 0xD8)) | {0x01}
_JPEG_SOF = set(range(0xC0, 0xD0)) - {0xC4, 0xC8, 0xCC}

_PNG_FIRMA = b"\x89PNG\r\n\x1a\n"
# Lo unico que se conserva: estructura, pixeles, paleta, transparencia y como
# interpretar el color. Se van eXIf, tEXt/iTXt/zTXt, iCCP, tIME y cualquier
# chunk desconocido.
_PNG_CONSERVAR = {b"IHDR", b"PLTE", b"tRNS", b"IDAT", b"IEND", b"gAMA", b"sRGB"}


@dataclass(frozen=True)
class ImagenLimpia:
    data: bytes
    content_type: str
    extension: str
    width: int
    height: int


def limpiar(data: bytes) -> ImagenLimpia:
    """Valida por contenido y devuelve el archivo reescrito sin metadatos.

    No mira la extension ni el Content-Type que manda el navegador: los dos los
    elige quien sube el archivo (ADR-018). Si lo que llega no se puede parsear,
    no se guarda.
    """
    if data.startswith(b"\xff\xd8"):
        return _jpeg(data)
    if data.startswith(_PNG_FIRMA):
        return _png(data)
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        raise ImagenInvalida("Por ahora no se puede subir WEBP: guardala como JPG o PNG.")
    if data[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1", b"ftypmsf1"):
        raise ImagenInvalida(
            "Esa foto es HEIC, el formato del iPhone. En el celular, compartila o guardala como JPG y proba de nuevo."
        )
    raise ImagenInvalida("El archivo no es una imagen JPG ni PNG.")


def _medida_valida(width: int, height: int) -> None:
    if width <= 0 or height <= 0:
        raise ImagenInvalida("La imagen dice medir 0 pixeles.")
    if width > MAX_LADO or height > MAX_LADO:
        raise ImagenInvalida(f"La imagen mide {width}x{height}: el maximo por lado es {MAX_LADO} pixeles.")
    if width * height > MAX_PIXELES:
        raise ImagenInvalida("La imagen tiene demasiados pixeles para mostrarse en una pagina.")


def _jpeg(data: bytes) -> ImagenLimpia:
    total = len(data)
    salida = bytearray(b"\xff\xd8")
    width = height = 0
    i = 2

    while i < total:
        if data[i] != 0xFF:
            raise ImagenInvalida("El JPG esta cortado o no respeta el formato.")
        while i < total and data[i] == 0xFF:
            i += 1
        if i >= total:
            raise ImagenInvalida("El JPG termina en medio de un marcador.")
        marcador = data[i]
        i += 1

        if marcador == 0xD9:  # EOI: lo que venga despues no es la imagen
            salida += b"\xff\xd9"
            _medida_valida(width, height)
            return ImagenLimpia(bytes(salida), "image/jpeg", ".jpg", width, height)

        if marcador in _JPEG_SIN_LARGO:
            continue

        if i + 2 > total:
            raise ImagenInvalida("El JPG termina donde deberia estar el largo de un segmento.")
        largo = int.from_bytes(data[i : i + 2], "big")
        if largo < 2 or i + largo > total:
            raise ImagenInvalida("Un segmento del JPG declara un largo imposible.")
        cuerpo = data[i : i + largo]
        i += largo

        if marcador in _JPEG_SOF:
            if largo < 7:
                raise ImagenInvalida("El JPG no declara sus medidas.")
            height = int.from_bytes(cuerpo[3:5], "big")
            width = int.from_bytes(cuerpo[5:7], "big")
            _medida_valida(width, height)

        if marcador not in _JPEG_DESCARTE:
            salida += bytes((0xFF, marcador)) + cuerpo

        if marcador == 0xDA:  # SOS: sigue la data comprimida hasta el proximo marcador
            i = _copiar_entropia(data, i, salida)

    raise ImagenInvalida("El JPG no tiene marca de final.")


def _copiar_entropia(data: bytes, inicio: int, salida: bytearray) -> int:
    """Copia la data comprimida que sigue a un SOS.

    Adentro, un 0xFF real viaja como FF 00, y los unicos marcadores legales son
    los RSTn. Cualquier otro es el proximo segmento: ahi se corta (y por eso un
    JPEG progresivo, con varios SOS, tambien funciona).
    """
    total = len(data)
    j = inicio
    while j < total - 1:
        if data[j] == 0xFF:
            siguiente = data[j + 1]
            if siguiente == 0x00 or 0xD0 <= siguiente <= 0xD7:
                j += 2
                continue
            break
        j += 1
    else:
        j = total
    salida += data[inicio:j]
    return j


def _png(data: bytes) -> ImagenLimpia:
    total = len(data)
    salida = bytearray(_PNG_FIRMA)
    width = height = 0
    visto_ihdr = False
    i = len(_PNG_FIRMA)

    while i + 8 <= total:
        largo = int.from_bytes(data[i : i + 4], "big")
        tipo = data[i + 4 : i + 8]
        fin = i + 8 + largo + 4
        if largo < 0 or fin > total:
            raise ImagenInvalida("Un chunk del PNG declara un largo imposible.")
        cuerpo = data[i + 8 : i + 8 + largo]
        esperado = int.from_bytes(data[i + 8 + largo : fin], "big")
        if crc32(tipo + cuerpo) & 0xFFFFFFFF != esperado:
            raise ImagenInvalida("El PNG esta corrupto: un chunk no coincide con su checksum.")

        if tipo == b"IHDR":
            if largo < 8:
                raise ImagenInvalida("El PNG no declara sus medidas.")
            width = int.from_bytes(cuerpo[0:4], "big")
            height = int.from_bytes(cuerpo[4:8], "big")
            _medida_valida(width, height)
            visto_ihdr = True
        elif not visto_ihdr:
            raise ImagenInvalida("El PNG no empieza por su cabecera.")

        if tipo in _PNG_CONSERVAR:
            salida += data[i:fin]

        i = fin
        if tipo == b"IEND":
            return ImagenLimpia(bytes(salida), "image/png", ".png", width, height)

    raise ImagenInvalida("El PNG no tiene marca de final.")

"""Imagenes para los tests de subida (F45, ADR-018).

El JPEG es **real**: lo escribio el encoder de JPEG de Windows (System.Drawing)
y entra acá en base64 para que el test no dependa de un archivo binario en el
repo ni de una libreria de imagenes en el venv. Trae su APP0 JFIF, que es justo
lo que el limpiador tiene que tirar.

El PNG se arma en codigo y tambien es real: los chunks llevan su CRC calculado
y los pixeles van comprimidos con zlib, igual que los escribiria cualquier
encoder. Eso permite meterle a mano un `eXIf` y comprobar que se va.
"""

from __future__ import annotations

import base64
import struct
import zlib


# JPEG 16x12, calidad 40, un rectangulo marron. Con APP0 JFIF adentro.
JPEG_REAL = base64.b64decode(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDABQODxIPDRQSERIXFhQYHzMhHxwcHz8tLyUzSkFOTUlBSEZSXHZkUldvWEZIZoxob3p9hIWE"
    "T2ORm4+AmnaBhH//2wBDARYXFx8bHzwhITx/VEhUf39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/"
    "f3//wAARCAAMABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQID"
    "AAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlq"
    "c3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3"
    "+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEI"
    "FEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImK"
    "kpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwAo"
    "ooryz1T/2Q=="
)

PNG_FIRMA = b"\x89PNG\r\n\x1a\n"


def _chunk(tipo: bytes, cuerpo: bytes) -> bytes:
    return (
        struct.pack(">I", len(cuerpo))
        + tipo
        + cuerpo
        + struct.pack(">I", zlib.crc32(tipo + cuerpo) & 0xFFFFFFFF)
    )


def png(ancho: int = 4, alto: int = 3, extras: list[tuple[bytes, bytes]] | None = None) -> bytes:
    """Un PNG RGB valido, con los chunks extra que le quiera meter el test."""
    ihdr = struct.pack(">IIBBBBB", ancho, alto, 8, 2, 0, 0, 0)
    filas = b"".join(b"\x00" + b"\xc8\x7f\x3c" * ancho for _ in range(alto))
    partes = [PNG_FIRMA, _chunk(b"IHDR", ihdr)]
    for tipo, cuerpo in extras or []:
        partes.append(_chunk(tipo, cuerpo))
    partes.append(_chunk(b"IDAT", zlib.compress(filas)))
    partes.append(_chunk(b"IEND", b""))
    return b"".join(partes)


def jpeg_con_exif_gigante(bytes_exif: int = 2048) -> bytes:
    """El JPEG real, con un APP1 EXIF inyectado como lo deja un celular.

    Se mete un EXIF largo a proposito: asi el test puede medir que la foto
    limpia pesa menos, en vez de confiar en que el segmento "no esta".
    """
    cuerpo = b"Exif\x00\x00" + b"G" * bytes_exif
    app1 = b"\xff\xe1" + struct.pack(">H", len(cuerpo) + 2) + cuerpo
    return JPEG_REAL[:2] + app1 + JPEG_REAL[2:]

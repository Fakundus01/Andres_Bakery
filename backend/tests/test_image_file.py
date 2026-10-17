from __future__ import annotations

import struct
import unittest

from backend.services.image_file import ImagenInvalida, limpiar
from backend.tests.imagenes_de_prueba import JPEG_REAL, PNG_FIRMA, jpeg_con_exif_gigante, png


class ImageFileTestCase(unittest.TestCase):
    """El validador/limpiador de ADR-018. No toca disco ni DB: es puro parseo."""

    def test_un_jpeg_de_verdad_pasa_y_dice_cuanto_mide(self) -> None:
        limpia = limpiar(JPEG_REAL)

        self.assertEqual(limpia.content_type, "image/jpeg")
        self.assertEqual(limpia.extension, ".jpg")
        self.assertEqual((limpia.width, limpia.height), (16, 12))

    def test_el_exif_del_celular_se_va(self) -> None:
        """EXIF trae GPS: publicar la carta con eso es publicar su domicilio."""
        con_exif = jpeg_con_exif_gigante(2048)

        limpia = limpiar(con_exif)

        self.assertNotIn(b"Exif\x00\x00", limpia.data)
        self.assertNotIn(b"G" * 100, limpia.data)
        self.assertLess(len(limpia.data), len(con_exif) - 2000)

    def test_el_jfif_tambien_se_va_y_la_foto_sigue_siendo_jpeg(self) -> None:
        limpia = limpiar(JPEG_REAL)

        self.assertIn(b"JFIF", JPEG_REAL)
        self.assertNotIn(b"JFIF", limpia.data)
        self.assertTrue(limpia.data.startswith(b"\xff\xd8"))
        self.assertTrue(limpia.data.endswith(b"\xff\xd9"))

    def test_lo_que_viene_pegado_despues_del_final_no_sobrevive(self) -> None:
        """El poliglota: un JPG valido con un ZIP o HTML colgado atras."""
        poliglota = JPEG_REAL + b"<script>alert(1)</script>" + b"PK\x03\x04payload"

        limpia = limpiar(poliglota)

        self.assertNotIn(b"<script>", limpia.data)
        self.assertNotIn(b"PK\x03\x04", limpia.data)

    def test_limpiar_dos_veces_da_lo_mismo(self) -> None:
        una = limpiar(JPEG_REAL)
        otra = limpiar(una.data)

        self.assertEqual(una.data, otra.data)

    def test_un_png_de_verdad_pasa(self) -> None:
        limpia = limpiar(png(8, 5))

        self.assertEqual(limpia.content_type, "image/png")
        self.assertEqual((limpia.width, limpia.height), (8, 5))
        self.assertTrue(limpia.data.startswith(PNG_FIRMA))

    def test_los_chunks_de_metadatos_del_png_se_van_y_los_de_pixeles_quedan(self) -> None:
        con_basura = png(
            4,
            3,
            extras=[
                (b"eXIf", b"Exif\x00\x00" + b"ubicacion secreta"),
                (b"tEXt", b"Comment\x00algo que no queremos publicar"),
                (b"iCCP", b"perfil\x00\x00" + b"x" * 40),
            ],
        )

        limpia = limpiar(con_basura)

        self.assertNotIn(b"eXIf", limpia.data)
        self.assertNotIn(b"tEXt", limpia.data)
        self.assertNotIn(b"iCCP", limpia.data)
        self.assertNotIn(b"ubicacion secreta", limpia.data)
        self.assertIn(b"IDAT", limpia.data)
        self.assertIn(b"IEND", limpia.data)

    def test_un_png_con_un_chunk_corrupto_no_entra(self) -> None:
        bueno = png(4, 3)
        # Se pisa un byte del cuerpo del IDAT: el CRC deja de coincidir.
        posicion = bueno.index(b"IDAT") + 6
        corrupto = bueno[:posicion] + bytes([bueno[posicion] ^ 0xFF]) + bueno[posicion + 1 :]

        with self.assertRaises(ImagenInvalida):
            limpiar(corrupto)

    def test_una_imagen_enorme_se_rechaza_antes_de_guardarla(self) -> None:
        ihdr_gigante = struct.pack(">IIBBBBB", 40000, 40000, 8, 2, 0, 0, 0)
        armada = png(4, 3)
        # Se reemplaza el IHDR por uno que declara 40.000 x 40.000.
        from backend.tests.imagenes_de_prueba import _chunk

        falsa = PNG_FIRMA + _chunk(b"IHDR", ihdr_gigante) + armada[armada.index(b"IDAT") - 4 :]

        with self.assertRaises(ImagenInvalida):
            limpiar(falsa)

    def test_un_ejecutable_disfrazado_de_foto_no_pasa(self) -> None:
        with self.assertRaises(ImagenInvalida):
            limpiar(b"MZ\x90\x00\x03" + b"\x00" * 200)

    def test_un_svg_con_script_no_pasa(self) -> None:
        with self.assertRaises(ImagenInvalida):
            limpiar(b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

    def test_el_heic_del_iphone_se_rechaza_nombrandolo(self) -> None:
        heic = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 64

        with self.assertRaises(ImagenInvalida) as capturado:
            limpiar(heic)

        self.assertIn("HEIC", str(capturado.exception))

    def test_el_webp_se_rechaza_diciendo_que_hacer(self) -> None:
        webp = b"RIFF" + struct.pack("<I", 100) + b"WEBPVP8 " + b"\x00" * 80

        with self.assertRaises(ImagenInvalida) as capturado:
            limpiar(webp)

        self.assertIn("JPG", str(capturado.exception))

    def test_un_jpeg_cortado_a_la_mitad_no_pasa(self) -> None:
        with self.assertRaises(ImagenInvalida):
            limpiar(JPEG_REAL[: len(JPEG_REAL) // 2])

    def test_un_archivo_vacio_no_pasa(self) -> None:
        with self.assertRaises(ImagenInvalida):
            limpiar(b"")

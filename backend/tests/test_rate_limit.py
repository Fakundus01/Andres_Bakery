from __future__ import annotations

import unittest

from backend.services.exceptions import RateLimitError
from backend.services.rate_limit import Limitador


class RelojFalso:
    """El tiempo como parametro: un test que espera de verdad no es un test."""

    def __init__(self) -> None:
        self.ahora = 1000.0

    def __call__(self) -> float:
        return self.ahora

    def avanzar(self, segundos: float) -> None:
        self.ahora += segundos


class LimitadorTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.reloj = RelojFalso()
        self.limitador = Limitador(reloj=self.reloj)

    def test_deja_pasar_hasta_el_tope_y_corta_el_siguiente(self) -> None:
        topes = ((3, 60),)
        for _ in range(3):
            self.limitador.exigir("ip:1", topes)

        with self.assertRaises(RateLimitError) as capturado:
            self.limitador.exigir("ip:1", topes)
        self.assertEqual(429, capturado.exception.status_code)

    def test_la_ventana_se_desliza(self) -> None:
        topes = ((2, 60),)
        # Los dos intentos en instantes distintos a proposito: si cayeran en el
        # mismo, al vencerse se liberarian los dos juntos y el test no probaria
        # que la ventana se desliza (la primera version de este test se comio
        # justo eso).
        self.limitador.exigir("ip:1", topes)
        self.reloj.avanzar(10)
        self.limitador.exigir("ip:1", topes)

        # Un contador por minuto calendario dejaria pasar dos mas aca.
        self.reloj.avanzar(30)
        with self.assertRaises(RateLimitError):
            self.limitador.exigir("ip:1", topes)

        # Pasado el minuto desde la PRIMERA, se libera un solo lugar: el suyo.
        self.reloj.avanzar(21)
        self.limitador.exigir("ip:1", topes)
        with self.assertRaises(RateLimitError):
            self.limitador.exigir("ip:1", topes)

    def test_los_dos_topes_valen_a_la_vez(self) -> None:
        # 3 por minuto corta la rafaga; 5 por hora corta al que insiste.
        topes = ((3, 60), (5, 3600))
        for vuelta in range(5):
            if vuelta:
                self.reloj.avanzar(61)
            self.limitador.exigir("ip:1", topes)

        self.reloj.avanzar(61)
        with self.assertRaises(RateLimitError) as capturado:
            self.limitador.exigir("ip:1", topes)
        # Lo corta el tope de hora, asi que la espera es de minutos, no segundos.
        self.assertGreater(capturado.exception.espera_segundos, 60)

    def test_cada_clave_cuenta_aparte(self) -> None:
        topes = ((1, 60),)
        self.limitador.exigir("ip:1", topes)
        self.limitador.exigir("ip:2", topes)
        with self.assertRaises(RateLimitError):
            self.limitador.exigir("ip:1", topes)

    def test_la_espera_nunca_es_cero_con_el_tope_lleno(self) -> None:
        topes = ((1, 60),)
        self.limitador.exigir("ip:1", topes)
        # A un pelo de liberarse: devolver 0 seria decirle "dale, pasa".
        self.reloj.avanzar(59.9)
        self.assertEqual(1, self.limitador.espera_necesaria("ip:1", topes))

        self.reloj.avanzar(0.2)
        self.assertEqual(0, self.limitador.espera_necesaria("ip:1", topes))

    def test_el_mensaje_dice_cuanto_falta(self) -> None:
        self.limitador.exigir("ip:1", ((1, 30),))
        with self.assertRaises(RateLimitError) as capturado:
            self.limitador.exigir("ip:1", ((1, 30),))
        self.assertIn("segundos", capturado.exception.message)

        otro = Limitador(reloj=self.reloj)
        otro.exigir("ip:1", ((1, 3600),))
        with self.assertRaises(RateLimitError) as capturado:
            otro.exigir("ip:1", ((1, 3600),))
        self.assertIn("minutos", capturado.exception.message)

    def test_sin_topes_no_limita_ni_explota(self) -> None:
        # `max()` sobre una tupla vacia levanta ValueError: una ruta sin topes
        # no puede ser un 500.
        for _ in range(5):
            self.limitador.exigir("ip:1", ())

    def test_no_crece_sin_limite(self) -> None:
        # El limitador no puede ser la fuga de memoria que venia a prevenir:
        # una inundacion de IPs distintas tiene que desalojar las viejas.
        chico = Limitador(reloj=self.reloj, max_claves=10)
        topes = ((5, 60),)
        for numero in range(200):
            chico.exigir(f"ip:{numero}", topes)

        self.assertLessEqual(chico.claves_vivas, 10)
        # La ultima sigue contando: lo que se desaloja es lo mas viejo.
        self.assertEqual(60, chico.espera_necesaria("ip:199", ((1, 60),)))

    def test_olvidar_todo_borra_la_cuenta(self) -> None:
        topes = ((1, 60),)
        self.limitador.exigir("ip:1", topes)
        self.limitador.olvidar_todo()
        self.limitador.exigir("ip:1", topes)


if __name__ == "__main__":
    unittest.main()

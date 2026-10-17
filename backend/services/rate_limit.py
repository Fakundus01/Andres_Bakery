"""Tope de requests por clave, en memoria del proceso (D2, ADR-026).

Lo que NO es, dicho antes de que alguien se confie:

- No sobrevive un reinicio del back. El que estaba castigado arranca limpio.
- No sirve con varios workers: cada proceso cuenta los suyos, asi que con N
  workers el tope real es N veces el configurado.
- Cuenta por IP, y detras de un proxy `remote_addr` es el proxy. Sin `ProxyFix`
  y un header de confianza, todo el trafico entra como una sola clave.

Para lo que hay hoy —un proceso, sin proxy— alcanza y es barato. Cuando haya
deploy de verdad esto se muda a Redis o al proxy mismo (anotado en security.md).

La ventana es deslizante: guarda la marca de tiempo de cada request y cuenta
las que caen dentro de cada tope. Un contador por minuto calendario dejaria
pasar el doble justo en el cambio de minuto.
"""

from __future__ import annotations

from collections import OrderedDict, deque
from typing import Callable
import time

from .exceptions import RateLimitError


# (cuantas, en cuantos segundos). Varios topes a la vez: el de minuto corta la
# rafaga, el de hora corta al que insiste todo el dia.
Tope = tuple[int, int]

TOPES_PEDIDO_PUBLICO: tuple[Tope, ...] = ((3, 60), (10, 3600))
TOPES_LOGIN: tuple[Tope, ...] = ((10, 300),)
TOPES_REGISTRO: tuple[Tope, ...] = ((5, 3600),)
TOPES_CONTACTO: tuple[Tope, ...] = ((5, 3600),)

# Techo de claves vivas. Sin esto, una inundacion de IPs distintas convierte al
# limitador en la fuga de memoria que venia a prevenir.
MAX_CLAVES = 10_000


class Limitador:
    """Cuenta requests por clave. No sabe de Flask: el reloj se inyecta."""

    def __init__(
        self,
        reloj: Callable[[], float] = time.monotonic,
        max_claves: int = MAX_CLAVES,
    ) -> None:
        self._reloj = reloj
        self._max_claves = max_claves
        # OrderedDict como LRU: lo que se usa va al final, y cuando sobran
        # claves se tira la mas vieja.
        self._marcas: OrderedDict[str, deque[float]] = OrderedDict()

    def exigir(self, clave: str, topes: tuple[Tope, ...]) -> None:
        """Registra el intento, o lo rechaza con 429 si se paso de algun tope."""
        espera = self.espera_necesaria(clave, topes)
        if espera > 0:
            raise RateLimitError(
                "Estas mandando muchos pedidos seguidos. "
                f"Proba de nuevo en {self._texto_de_espera(espera)}.",
                espera_segundos=espera,
            )
        self._anotar(clave, topes)

    def espera_necesaria(self, clave: str, topes: tuple[Tope, ...]) -> int:
        """Segundos que faltan para que la clave pueda pasar. 0 = puede ahora."""
        if not topes:
            return 0

        ahora = self._reloj()
        marcas = self._marcas.get(clave)
        if not marcas:
            return 0

        self._limpiar(marcas, ahora, max(ventana for _, ventana in topes))

        espera = 0.0
        for cuantas, ventana in topes:
            desde = ahora - ventana
            # Las marcas estan ordenadas: contar desde el final es contar las
            # que entran en la ventana.
            dentro = sum(1 for marca in marcas if marca > desde)
            if dentro >= cuantas:
                # La mas vieja que todavia cuenta es la que libera el lugar.
                mas_vieja = marcas[len(marcas) - dentro]
                espera = max(espera, mas_vieja + ventana - ahora)

        # Siempre al menos 1: devolver 0 con el tope lleno diria "pasa ahora".
        return max(1, int(espera + 0.999)) if espera > 0 else 0

    @property
    def claves_vivas(self) -> int:
        return len(self._marcas)

    def olvidar_todo(self) -> None:
        self._marcas.clear()

    def _anotar(self, clave: str, topes: tuple[Tope, ...]) -> None:
        if not topes:
            return
        ahora = self._reloj()
        marcas = self._marcas.get(clave)
        if marcas is None:
            marcas = deque()
            self._marcas[clave] = marcas
        marcas.append(ahora)
        self._marcas.move_to_end(clave)
        self._limpiar(marcas, ahora, max(ventana for _, ventana in topes))

        while len(self._marcas) > self._max_claves:
            self._marcas.popitem(last=False)

    @staticmethod
    def _limpiar(marcas: deque[float], ahora: float, ventana_mayor: int) -> None:
        corte = ahora - ventana_mayor
        while marcas and marcas[0] <= corte:
            marcas.popleft()

    @staticmethod
    def _texto_de_espera(segundos: int) -> str:
        if segundos < 60:
            return f"{segundos} segundos"
        minutos = (segundos + 59) // 60
        return "un minuto" if minutos == 1 else f"{minutos} minutos"


limitador = Limitador()

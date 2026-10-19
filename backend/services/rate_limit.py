"""Tope de requests por clave, en memoria del proceso (D2, ADR-026).

Lo que NO es, dicho antes de que alguien se confie:

- No sobrevive un reinicio del back. El que estaba castigado arranca limpio.
- No sirve con varios workers: cada proceso cuenta los suyos, asi que con N
  workers el tope real es N veces el configurado.
- Cuenta por IP, y detras de un proxy `remote_addr` es el proxy. Sin `ProxyFix`
  y un header de confianza, todo el trafico entra como una sola clave.
- **Una IP distinta es un presupuesto nuevo.** Cualquiera con un VPS, o con
  una conexion IPv6 residencial, tiene un /64 entero: la review de T7 paso 12
  pedidos con 12 direcciones del mismo bloque. Esto frena al que abusa desde
  una IP, no al que sabe lo que hace. Agrupar por /64 ayudaria y tampoco
  alcanza; el control de verdad contra eso no es un contador.

Para lo que hay hoy —un proceso, sin proxy— alcanza y es barato. Cuando haya
deploy de verdad esto se muda a Redis o al proxy mismo (anotado en security.md).

La ventana es deslizante: guarda la marca de tiempo de cada request y cuenta
las que caen dentro de cada tope. Un contador por minuto calendario dejaria
pasar el doble justo en el cambio de minuto.
"""

from __future__ import annotations

from collections import OrderedDict, deque
from typing import Callable
import threading
import time

from .exceptions import RateLimitError


# (cuantas, en cuantos segundos). Varios topes a la vez: el de minuto corta la
# rafaga, el de hora corta al que insiste todo el dia.
Tope = tuple[int, int]

TOPES_PEDIDO_PUBLICO: tuple[Tope, ...] = ((3, 60), (10, 3600))
# Pedidos que se concretan desde una cuenta. La ruta con token no tenia
# ningun tope: registrarse cuesta 1 de 5 por hora y despues eran filas y
# mails sin techo por el camino de al lado (lo marco la review de T7).
TOPES_PEDIDO_CON_CUENTA: tuple[Tope, ...] = ((5, 60), (30, 3600))
# Lo que se cuenta aunque falle: deja equivocarse con el formulario sin
# quemar el tope de pedidos, pero acota el trabajo que puede pedir una IP.
TOPES_INTENTOS_PEDIDO: tuple[Tope, ...] = ((15, 60), (40, 3600))
# Foto de referencia de una torta a pedido (F59). Es escritura publica de
# archivos: mas angosto que el pedido, porque cada una cuesta disco (o cuota de
# Cloudinary) y no solo una fila.
TOPES_FOTO_REFERENCIA: tuple[Tope, ...] = ((4, 60), (15, 3600))
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
        # El servidor de Flask atiende con hilos: sin esto, un hilo puede
        # estar recorriendo el deque mientras otro lo modifica
        # (`RuntimeError: deque mutated during iteration`). Con los topes
        # reales el deque tiene 10 elementos y la ventana de carrera es
        # minima, pero el lock no cuesta nada.
        self._candado = threading.RLock()
        # OrderedDict como LRU: lo que se usa va al final, y cuando sobran
        # claves se tira la mas vieja.
        self._marcas: OrderedDict[str, deque[float]] = OrderedDict()

    def exigir(self, clave: str, topes: tuple[Tope, ...], *, anotar: bool = True) -> None:
        """Rechaza con 429 si la clave se paso de algun tope.

        `anotar=False` solo chequea: sirve para los topes que se cuentan
        **despues**, cuando se sabe como salio el pedido (ver `limitar` en
        routes/utils.py).
        """
        with self._candado:
            espera = self.espera_necesaria(clave, topes)
            if espera > 0:
                # Tocar la clave aunque se rechace: si no, la del que insiste
                # envejece en el OrderedDict y es la primera en caer por LRU,
                # o sea que inundar claves le borra el castigo justo al
                # castigado. Lo marco la review de T7.
                self._marcas.move_to_end(clave)
                raise RateLimitError(
                    "Estas mandando muchos pedidos seguidos. "
                    f"Proba de nuevo en {self._texto_de_espera(espera)}.",
                    espera_segundos=espera,
                )
            if anotar:
                self._anotar(clave, topes)

    def anotar(self, clave: str, topes: tuple[Tope, ...]) -> None:
        """Suma un intento sin chequear nada."""
        with self._candado:
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
                # La que libera lugar es la (dentro - cuantas + 1)-esima mas
                # vieja de la ventana, que en el deque es `len - cuantas`. Con
                # `len - dentro` se tomaba siempre la mas vieja de todas y el
                # Retry-After salia corto cuando hay mas marcas que el tope
                # (pasa si alguien baja un tope con el proceso caliente).
                libera = marcas[len(marcas) - cuantas]
                espera = max(espera, libera + ventana - ahora)

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

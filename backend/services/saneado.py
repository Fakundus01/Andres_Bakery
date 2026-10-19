"""Lo que llega de afuera, convertido en algo con lo que se puede trabajar.

Nace de la review de T7: la ruta publica de pedido contestaba **500 con HTML**
ante cualquier campo que no fuera del tipo esperado —un `customer` que es
string, un `address` que es numero, un `notes` que es dict—, y el front, que
espera JSON, terminaba mostrandole al invitado el HTML del error de Werkzeug
adentro del checkout.

Tres reglas:

1. Lo que no es del tipo esperado es un **400 explicado**, no una excepcion.
2. Todo texto tiene tope de largo. SQLite no hace cumplir el `String(120)` del
   modelo, asi que sin esto un anonimo deja 4 MB de texto en una fila (y el
   dia que la base sea Postgres, el mismo dato es un 500).
3. Los campos de una sola linea pierden los saltos de linea. Si no, alguien
   escribe en las notas una linea que dice "Pagado: SI, transferencia hecha" y
   en el mail que lee Andrea parece un campo del sistema.
"""

from __future__ import annotations

import re
import unicodedata

from .exceptions import ValidationError


# Suficiente para una direccion real y para una dedicatoria; corto para que no
# sirva de deposito.
TOPE_NOMBRE = 120
TOPE_DIRECCION = 255
TOPE_NOTAS = 500
TOPE_MAIL = 255
TOPE_TELEFONO = 40

# Un mail valido de verdad no se puede reconocer con una regex; esto descarta
# lo que seguro no lo es, incluidos los saltos de linea que rompen el envio.
_MAIL = re.compile(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")


def diccionario(valor: object, campo: str) -> dict:
    if valor is None:
        return {}
    if not isinstance(valor, dict):
        raise ValidationError(f"El campo «{campo}» tiene que venir como objeto.")
    return valor


def texto(
    valor: object,
    campo: str,
    *,
    tope: int,
    una_linea: bool = True,
    obligatorio: bool = False,
) -> str:
    """Devuelve texto limpio y recortado, o levanta 400 si no es texto.

    Un numero se acepta y se pasa a texto —un telefono escrito como numero es
    un error honesto de quien llama—, pero un dict o una lista no: eso no es
    alguien tipeando mal, y terminaba reventando al grabar.
    """
    limpio = _a_texto(valor, campo)
    limpio = _sin_caracteres_de_control(limpio, una_linea=una_linea).strip()
    if obligatorio and not limpio:
        raise ValidationError(f"Falta «{campo}».")
    return limpio[:tope]


def _a_texto(valor: object, campo: str) -> str:
    """Lo que llega convertido a str, o 400.

    Un numero se acepta y se pasa a texto —un telefono escrito como numero es
    un error honesto de quien llama—, pero un dict o una lista no: eso no es
    alguien tipeando mal, y terminaba reventando al grabar.
    """
    if valor is None:
        return ""
    if isinstance(valor, bool) or isinstance(valor, (dict, list, tuple, set)):
        raise ValidationError(f"El campo «{campo}» tiene que venir como texto.")
    if isinstance(valor, (int, float)):
        return str(valor)
    if isinstance(valor, str):
        return valor
    raise ValidationError(f"El campo «{campo}» tiene que venir como texto.")


def mail(valor: object) -> str:
    """Vacio si no parece un mail. No rechaza el pedido por eso.

    Quien pide por WhatsApp deja el mail de yapa: que lo escriba mal no puede
    costarle la compra. Lo que no puede pasar es que un texto cualquiera
    termine de destinatario de un mail que manda el servidor de Andrea.
    """
    candidato = texto(valor, "email", tope=TOPE_MAIL)
    return candidato if _MAIL.match(candidato) else ""


def _sin_caracteres_de_control(valor: str, *, una_linea: bool) -> str:
    salida = []
    for caracter in valor:
        if caracter in "\r\n":
            # En un campo de varias lineas el salto se conserva; en uno de una
            # sola se convierte en separador para que no finja un renglon.
            salida.append("\n" if not una_linea else " · ")
            continue
        if caracter == "\t":
            salida.append(" ")
            continue
        if unicodedata.category(caracter) == "Cc":
            continue
        salida.append(caracter)
    unido = "".join(salida)
    # Dos saltos seguidos quedan en uno: en un mail, una pared de lineas
    # vacias esconde lo que importa.
    return re.sub(r"\n{2,}", "\n", re.sub(r"( · )+", " · ", unido))


# Lo que no se ve pero ocupa lugar: espacio de ancho cero, guion suave y la
# marca de orden de bytes. Con uno adentro, "Azucar" se ve identico a "Azucar"
# y seria un duplicado que nadie puede distinguir mirando la lista.
_INVISIBLES = dict.fromkeys(map(ord, "­​‌‍﻿"))


def sin_invisibles(valor: str) -> str:
    """Saca lo que no se ve pero cuenta como caracter.

    Hace falta en dos lugares distintos: antes de **comparar** (si no, el
    duplicado invisible entra) y antes de **guardar** (si no, un nombre hecho
    solo de espacios de ancho cero pasa el control de "no vacio").
    """
    return valor.translate(_INVISIBLES)


def normalizar_nombre(valor: object, campo: str, *, tope: int) -> str:
    """La forma de un nombre **para comparar**, no para guardar.

    Sin acentos, sin mayusculas, sin espacios de mas. La n con virgulilla se
    conserva: es otra letra, no una n con acento, y barrerla haria que "Pina"
    y "Pin~a" fueran el mismo ingrediente y uno de los dos nombres
    desapareciera de la lista de Andrea sin que nadie lo haya decidido.

    **Espeja a `front/src/lib/ingredientes.ts::normalizar`.** Las dos existen
    porque la comparacion tiene que valer igual de los dos lados: cuando vivia
    solo en el front, el back aceptaba "coco rallado" sobre "Coco rallado" y
    el duplicado entraba igual (T6-F20b).

    El espejo se mantiene con **categorias Unicode** y no con rangos escritos
    a mano. Una primera version barria `[̀-ͯ]` en el front y
    `unicodedata.combining` aca, y divergian en arabe, hebreo y devanagari; y
    pasaba por `texto(una_linea=True)`, que convierte el salto de linea en
    " · " y hacia que "coco
rallado" normalizara distinto. Lo midio el
    reviewer: 11 divergencias de 56 casos.
    """
    crudo = _a_texto(valor, campo)[:tope]
    limpio = _limpiar_para_comparar(crudo)
    descompuesto = unicodedata.normalize("NFD", limpio)
    # NFD parte la n con virgulilla en "n" + tilde suelta, y el barrido de la
    # linea siguiente la dejaria en "n". Se recompone antes de barrer.
    con_enie = descompuesto.replace("ñ", "ñ").replace("Ñ", "Ñ")
    sin_marcas = "".join(c for c in con_enie if unicodedata.category(c)[0] != "M")
    return " ".join(sin_marcas.lower().split(" "))


def _limpiar_para_comparar(valor: str) -> str:
    """Los invisibles se van; todo lo que es espacio o control pasa a espacio.

    La diferencia importa: un espacio de ancho cero adentro de "Azucar" no
    puede partir la palabra en dos, pero un tabulador si tiene que separar.
    """
    salida = []
    for caracter in valor:
        categoria = unicodedata.category(caracter)
        if categoria == "Cf":
            continue
        if caracter.isspace() or categoria in {"Cc", "Zs", "Zl", "Zp"}:
            salida.append(" ")
            continue
        salida.append(caracter)
    return "".join(salida)


def entero(valor: object, campo: str, *, minimo: int, maximo: int) -> int:
    """Entero de verdad y dentro de rango.

    `int(2.9)` daba 2 y el pedido salia confirmando una cantidad que nadie
    pidio; `True` daba 1; y un `product_id` de 10**30 reventaba al grabar
    (`OverflowError` de SQLite) con un 500 sin auth.
    """
    if isinstance(valor, bool) or not isinstance(valor, (int, str)):
        raise ValidationError(f"«{campo}» tiene que ser un numero entero.")
    try:
        numero = int(str(valor).strip())
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"«{campo}» tiene que ser un numero entero.") from exc
    if numero < minimo or numero > maximo:
        raise ValidationError(f"«{campo}» tiene que estar entre {minimo} y {maximo}.")
    return numero

"""El texto del pedido que le llega a Andrea por WhatsApp (F23, ADR-025).

Lo arma el servidor, con los importes que estan en la base. Si el texto se
armara en el navegador, cualquiera le edita el total antes de mandarlo y ella
recibe un mensaje que dice $2.000 por algo de $12.000, con la cara de un
pedido legitimo. Es la misma razon por la que `validate_quantity` corre del
lado del servidor (V4).

El modulo no sabe de Flask ni de HTTP: entra un `Order`, sale un `str`.
"""

from __future__ import annotations

from decimal import Decimal

from ..models import Order


# `wa.me` no es un buzon: el texto viaja en la URL y los clientes de WhatsApp
# lo recortan cuando se pasa. El detalle completo del pedido vive en el panel,
# asi que el mensaje es un aviso, no el comprobante.
TOPE_CARACTERES = 1500

SALUDO = "¡Hola Andrea! Te hago un pedido desde la web."


def armar_mensaje(order: Order, *, tope: int = TOPE_CARACTERES) -> str:
    delivery = order.delivery
    partes: list[str] = [SALUDO, "", f"Pedido #{order.id}"]

    renglones = [
        f"- {item.quantity} x {item.product.name}: {plata(Decimal(str(item.unit_price)) * item.quantity)}"
        for item in order.items
    ]
    partes.extend(_recortar(renglones, tope))

    if delivery and Decimal(str(delivery.shipping_amount or 0)) > 0:
        partes.append(f"Envío: {plata(Decimal(str(delivery.shipping_amount)))}")
    partes.append(f"Total: {plata(Decimal(str(order.total_amount or 0)))}")

    if delivery:
        partes.extend(_datos_de_contacto(delivery))

    return "\n".join(partes)


def plata(monto: Decimal) -> str:
    """Formato argentino: punto para los miles, coma para los centavos.

    Sin centavos cuando son cero, que es el caso de toda la carta: "$9.000" se
    lee de un vistazo y "$9.000,00" no agrega nada.
    """
    entero, centavos = divmod(int(monto * 100), 100)
    miles = f"{entero:,}".replace(",", ".")
    return f"${miles}" if centavos == 0 else f"${miles},{centavos:02d}"


def _datos_de_contacto(delivery) -> list[str]:
    lineas = ["", f"Nombre: {delivery.customer_name}"]
    if delivery.customer_phone:
        lineas.append(f"Teléfono: {delivery.customer_phone}")

    if delivery.delivery_method == "delivery":
        destino = ", ".join(
            parte for parte in (delivery.address, delivery.neighborhood) if parte
        )
        lineas.append(f"Entrega: envío a {destino}" if destino else "Entrega: envío")
    else:
        lineas.append("Entrega: paso a retirar")

    if delivery.notes:
        lineas.append(f"Notas: {delivery.notes}")
    return lineas


def _recortar(renglones: list[str], tope: int) -> list[str]:
    """Deja los renglones que entran en el tope y resume el resto.

    El corte se decide sobre los productos y no sobre el mensaje entero: el
    total y los datos de entrega son justo lo que ella necesita, y seria al
    reves perder esos y conservar el producto numero 29.
    """
    usado = 0
    entran: list[str] = []
    for indice, renglon in enumerate(renglones):
        faltan = len(renglones) - indice
        # El aviso del resto tambien ocupa lugar: se reserva antes de cortar.
        aviso = len(_aviso_del_resto(faltan))
        if usado + len(renglon) + 1 + aviso > tope:
            entran.append(_aviso_del_resto(faltan))
            return entran
        entran.append(renglon)
        usado += len(renglon) + 1
    return entran


def _aviso_del_resto(cuantos: int) -> str:
    producto = "producto" if cuantos == 1 else "productos"
    return f"- y {cuantos} {producto} mas (el detalle completo esta en el panel)"

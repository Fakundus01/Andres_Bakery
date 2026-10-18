"""El texto del pedido que le llega a Andrea por WhatsApp (F23, ADR-025).

Lo arma el servidor, con los importes que estan en la base. Si el texto se
armara en el navegador, cualquiera le edita el total antes de mandarlo y ella
recibe un mensaje que dice $2.000 por algo de $12.000, con la cara de un
pedido legitimo. Es la misma razon por la que `validate_quantity` corre del
lado del servidor (V4).

El modulo no sabe de Flask ni de HTTP: entra un `Order`, sale un `str`.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from ..models import Order


# `wa.me` no es un buzon: el texto viaja en la URL y los clientes de WhatsApp
# lo recortan cuando se pasa. El detalle completo del pedido vive en el panel,
# asi que el mensaje es un aviso, no el comprobante.
TOPE_CARACTERES = 1500

SALUDO = "¡Hola Andrea! Te hago un pedido desde la web."


def armar_mensaje(order: Order, *, tope: int = TOPE_CARACTERES) -> str:
    """El mensaje entero, no solo los renglones, entra en el tope.

    La primera versión le pasaba el tope a `_recortar` y agregaba el total y
    los datos de entrega **después**: con una dedicatoria larga el mensaje se
    iba a 5000 caracteres y el link de WhatsApp quedaba inservible, que es
    justo el paso que le falta a quien ya hizo el pedido. Ahora la cabecera y
    el pie se miden primero y los productos se reparten lo que sobra.
    """
    delivery = order.delivery
    cabecera = [SALUDO, "", f"Pedido #{order.id}"]

    pie: list[str] = []
    if delivery and Decimal(str(delivery.shipping_amount or 0)) > 0:
        pie.append(f"Envío: {plata(Decimal(str(delivery.shipping_amount)))}")
    pie.append(f"Total: {plata(Decimal(str(order.total_amount or 0)))}")
    if delivery:
        pie.extend(_datos_de_contacto(delivery))

    renglones = [
        f"- {item.quantity} x {item.product.name}: {plata(Decimal(str(item.unit_price)) * item.quantity)}"
        for item in order.items
    ]
    gastado = len("\n".join(cabecera + pie)) + 1
    return "\n".join(cabecera + _recortar(renglones, max(tope - gastado, 0)) + pie)


def plata(monto: Decimal) -> str:
    """Formato argentino: punto para los miles, coma para los centavos.

    Sin centavos cuando son cero, que es el caso de toda la carta: "$9.000" se
    lee de un vistazo y "$9.000,00" no agrega nada.
    """
    # El signo se saca antes de dividir: `divmod` con negativos redondea para
    # abajo y -1500,50 salía "$-1.501,50", mal el peso y mal el lugar del
    # signo. Hoy ningún total puede ser negativo —el envío lo pone el
    # servidor—, pero esta función es pública y el primer descuento llega.
    signo = "-" if monto < 0 else ""
    centesimos = int(abs(monto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100)
    entero, centavos = divmod(centesimos, 100)
    miles = f"{entero:,}".replace(",", ".")
    return f"{signo}${miles}" if centavos == 0 else f"{signo}${miles},{centavos:02d}"


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
        aviso = _aviso_del_resto(faltan)
        if usado + len(renglon) + 1 + len(aviso) > tope:
            if not entran:
                # Ni el primero entraba: mejor nombrarlo cortado que mandarle
                # a Andrea un pedido sin un solo producto. Y entonces el aviso
                # cubre uno menos, porque este ya quedó listado.
                recorte = max(tope - len(aviso) - 2, 20)
                entran.append(renglon[:recorte].rstrip() + "…")
                aviso = _aviso_del_resto(faltan - 1) if faltan > 1 else ""
            if aviso:
                entran.append(aviso)
            return entran
        entran.append(renglon)
        usado += len(renglon) + 1
    return entran


def _aviso_del_resto(cuantos: int) -> str:
    producto = "producto" if cuantos == 1 else "productos"
    return f"- y {cuantos} {producto} mas (el detalle completo esta en el panel)"

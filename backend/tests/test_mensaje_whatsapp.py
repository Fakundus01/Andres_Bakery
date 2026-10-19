from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Order, OrderDelivery, OrderItem, OrderItemOption
from backend.services.mensaje_whatsapp import TOPE_CARACTERES, armar_mensaje, plata
from backend.tests.support import BackendServiceTestCase


class PlataTestCase(unittest.TestCase):
    def test_formato_argentino(self) -> None:
        self.assertEqual("$9.000", plata(Decimal("9000")))
        self.assertEqual("$1.234.567", plata(Decimal("1234567")))
        self.assertEqual("$500", plata(Decimal("500")))
        self.assertEqual("$0", plata(Decimal("0")))

    def test_los_centavos_aparecen_solo_si_existen(self) -> None:
        # La carta no tiene centavos, pero el envio configurado puede tenerlos.
        self.assertEqual("$1.234,50", plata(Decimal("1234.5")))
        self.assertEqual("$9.000", plata(Decimal("9000.00")))


class MensajeWhatsAppTestCase(BackendServiceTestCase):
    def armar_pedido(
        self,
        *,
        cantidad: int = 6,
        precio: str = "1500.00",
        delivery_method: str = "delivery",
        telefono: str | None = "11-7059-5319",
        notas: str | None = "Timbre 2",
        envio: str = "2500.00",
        nombre_producto: str = "Cookies de avena",
    ) -> Order:
        producto = self.create_product(name=nombre_producto, price=precio, min_qty=1, qty_step=1)
        unitario = Decimal(precio)
        envio_monto = Decimal(envio) if delivery_method == "delivery" else Decimal("0.00")
        order = Order(status="pending", channel="whatsapp")
        order.total_amount = unitario * cantidad + envio_monto
        db.session.add(order)
        db.session.flush()
        db.session.add(
            OrderItem(order=order, product=producto, quantity=cantidad, unit_price=unitario)
        )
        order.delivery = OrderDelivery(
            customer_name="Facundo Moreno",
            customer_email=None,
            customer_phone=telefono,
            delivery_method=delivery_method,
            address="Calle 123" if delivery_method == "delivery" else None,
            neighborhood="Villa Maipú",
            city="General San Martín",
            shipping_amount=envio_monto,
            notes=notas,
        )
        db.session.commit()
        return order

    def test_trae_el_numero_los_renglones_y_el_total(self) -> None:
        order = self.armar_pedido()
        mensaje = armar_mensaje(order)

        self.assertIn(f"Pedido #{order.id}", mensaje)
        self.assertIn("- 6 x Cookies de avena: $9.000", mensaje)
        self.assertIn("Envío: $2.500", mensaje)
        self.assertIn("Total: $11.500", mensaje)
        self.assertIn("Nombre: Facundo Moreno", mensaje)
        self.assertIn("Teléfono: 11-7059-5319", mensaje)
        self.assertIn("Entrega: envío a Calle 123, Villa Maipú", mensaje)
        self.assertIn("Notas: Timbre 2", mensaje)

    def test_el_importe_sale_de_la_base_no_del_cliente(self) -> None:
        # El corazon de la feature: el renglon se calcula con el unit_price
        # guardado, asi que nadie puede mandarle a Andrea un total inventado.
        order = self.armar_pedido(precio="2000.00", cantidad=3, envio="0.00")
        order.items[0].product.price = Decimal("1.00")
        db.session.commit()

        self.assertIn("- 3 x Cookies de avena: $6.000", armar_mensaje(order))

    def test_retiro_no_habla_de_envio(self) -> None:
        mensaje = armar_mensaje(self.armar_pedido(delivery_method="pickup"))
        self.assertIn("Entrega: paso a retirar", mensaje)
        self.assertNotIn("Envío:", mensaje)

    def test_sin_telefono_y_sin_notas_no_deja_renglones_vacios(self) -> None:
        mensaje = armar_mensaje(self.armar_pedido(telefono=None, notas=None))
        self.assertNotIn("Teléfono:", mensaje)
        self.assertNotIn("Notas:", mensaje)
        self.assertIn("Nombre: Facundo Moreno", mensaje)

    def test_un_pedido_largo_se_corta_pero_conserva_el_total(self) -> None:
        # `wa.me` recorta los mensajes largos, y lo que no se puede perder es
        # el total y los datos de entrega.
        order = self.armar_pedido(nombre_producto="Alfajor de maicena con dulce de leche")
        unitario = Decimal("1500.00")
        for numero in range(40):
            producto = self.create_product(
                name=f"Budin de naranja con glaseado numero {numero}",
                price=str(unitario),
            )
            db.session.add(
                OrderItem(order=order, product=producto, quantity=6, unit_price=unitario)
            )
        db.session.commit()

        mensaje = armar_mensaje(order)
        self.assertLessEqual(len(mensaje), TOPE_CARACTERES + 200)
        self.assertIn("productos mas", mensaje)
        self.assertIn(f"Total: {plata(Decimal(str(order.total_amount)))}", mensaje)
        self.assertIn("Entrega: envío a", mensaje)

    def test_el_aviso_del_resto_cuenta_bien(self) -> None:
        order = self.armar_pedido()
        unitario = Decimal("1500.00")
        for numero in range(3):
            producto = self.create_product(name=f"Torta {numero}", price=str(unitario))
            db.session.add(
                OrderItem(order=order, product=producto, quantity=1, unit_price=unitario)
            )
        db.session.commit()

        # Tope justo para que entre el primer renglon y el aviso cubra los
        # otros tres. Con 60 no entraba ni el primero —el aviso ocupa 57— y el
        # mensaje salia con "y 4": el aviso se reserva ANTES de cortar.
        mensaje = armar_mensaje(order, tope=100)
        self.assertIn("- y 3 productos mas", mensaje)

    def test_un_pedido_sin_delivery_no_explota(self) -> None:
        order = self.armar_pedido()
        order.delivery = None
        db.session.commit()

        mensaje = armar_mensaje(order)
        self.assertIn(f"Pedido #{order.id}", mensaje)
        self.assertNotIn("Nombre:", mensaje)


class MensajeDeTortaAPedidoTestCase(BackendServiceTestCase):
    """El mensaje tiene que alcanzar para empezar a hacer la torta (F19a/F58)."""

    def armar_torta(
        self,
        *,
        variante: str | None = "8 porciones",
        precio: str = "14000.00",
        sabores: tuple[tuple[str, str], ...] = (("Bizcocho", "Vainilla"), ("Relleno", "Dulce de leche")),
        nota: str | None = None,
        foto: str | None = None,
    ) -> Order:
        producto = self.create_product(name="Torta de chocolate", price=precio)
        order = Order(status="pending", channel="whatsapp")
        order.total_amount = Decimal(precio)
        db.session.add(order)
        db.session.flush()
        item = OrderItem(
            order=order,
            product=producto,
            quantity=1,
            unit_price=Decimal(precio),
            variant_name=variante,
            note=nota,
            reference_image=foto,
        )
        for grupo, opcion in sabores:
            item.options.append(OrderItemOption(group_name=grupo, option_name=opcion))
        db.session.add(item)
        order.delivery = OrderDelivery(
            customer_name="Vecina",
            customer_phone="1144556677",
            delivery_method="pickup",
            shipping_amount=Decimal("0.00"),
            payment_method="whatsapp",
        )
        db.session.commit()
        return order

    def test_el_renglon_nombra_el_tamano(self) -> None:
        mensaje = armar_mensaje(self.armar_torta())

        self.assertIn("- 1 x Torta de chocolate (8 porciones): $14.000", mensaje)

    def test_sin_variante_el_renglon_queda_como_antes(self) -> None:
        mensaje = armar_mensaje(self.armar_torta(variante=None, sabores=()))

        self.assertIn("- 1 x Torta de chocolate: $14.000", mensaje)

    def test_el_mensaje_nombra_los_sabores_elegidos(self) -> None:
        mensaje = armar_mensaje(self.armar_torta())

        self.assertIn("Bizcocho: Vainilla", mensaje)
        self.assertIn("Relleno: Dulce de leche", mensaje)

    def test_el_mensaje_lleva_la_nota_y_la_foto(self) -> None:
        mensaje = armar_mensaje(
            self.armar_torta(
                nota="Que diga Feliz cumple Mica, en azul",
                foto="/uploads/" + "ab" * 16 + ".jpg",
            )
        )

        self.assertIn("Nota: Que diga Feliz cumple Mica, en azul", mensaje)
        self.assertIn("Foto: /uploads/" + "ab" * 16 + ".jpg", mensaje)

    def test_la_foto_sale_con_el_dominio_del_back_si_esta_configurado(self) -> None:
        """El link tiene que poder abrirse desde el celular de ella."""
        self.app.config["BACKEND_PUBLIC_URL"] = "https://api.andresbakery.test/"

        mensaje = armar_mensaje(self.armar_torta(foto="/uploads/" + "ab" * 16 + ".jpg"))

        self.assertIn("Foto: https://api.andresbakery.test/uploads/", mensaje)

    def test_la_foto_de_cloudinary_ya_viene_absoluta(self) -> None:
        url = "https://res.cloudinary.com/andres-bakery/image/upload/v1/x/" + "ab" * 16 + ".jpg"

        mensaje = armar_mensaje(self.armar_torta(foto=url))

        self.assertIn(f"Foto: {url}", mensaje)

    def test_diez_tortas_con_nota_larga_siguen_entrando_en_el_tope(self) -> None:
        """Lo que ADR-031 dejo anotado: los productos se empiezan a caer.

        Lo que no puede pasar es que el mensaje pase el tope, porque el link
        de WhatsApp queda inservible justo en el ultimo paso del pedido.
        """
        producto = self.create_product(name="Torta grande de chocolate", price="14000.00")
        order = Order(status="pending", channel="whatsapp")
        order.total_amount = Decimal("140000.00")
        db.session.add(order)
        db.session.flush()
        for _ in range(10):
            item = OrderItem(
                order=order,
                product=producto,
                quantity=1,
                unit_price=Decimal("14000.00"),
                variant_name="12 porciones",
                note="X" * 300,
                reference_image="/uploads/" + "ab" * 16 + ".jpg",
            )
            item.options.append(OrderItemOption(group_name="Relleno", option_name="Dulce de leche"))
            db.session.add(item)
        order.delivery = OrderDelivery(
            customer_name="Vecina",
            customer_phone="1144556677",
            delivery_method="pickup",
            shipping_amount=Decimal("0.00"),
            payment_method="whatsapp",
        )
        db.session.commit()

        mensaje = armar_mensaje(order)

        self.assertLessEqual(len(mensaje), TOPE_CARACTERES)
        self.assertIn("Total: $140.000", mensaje)
        self.assertIn("Nombre: Vecina", mensaje)
        self.assertIn("productos mas", mensaje)


if __name__ == "__main__":
    unittest.main()

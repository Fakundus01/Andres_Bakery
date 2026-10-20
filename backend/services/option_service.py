from __future__ import annotations

from decimal import Decimal

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Option, OptionGroup
from .base import ServiceBase
from .exceptions import ValidationError
from .serializers import Serializer
from . import saneado


# El modelo dice String(120) y SQLite no lo hace cumplir: sin este tope
# entraron 4 MB en un `name` en los ingredientes (review de T6-F20).
TOPE_NOMBRE = 120
# Una lista mas larga que esto no se puede elegir en un celular, y es admin,
# asi que el tope es contra el error de pegar un texto entero, no contra abuso.
MAX_OPCIONES = 60


class OptionService(ServiceBase):
    """Los grupos de opciones y sus sabores (F57, ADR-031).

    La chef define **que se puede elegir**; el cliente elige de eso. Los
    grupos son globales como las etiquetas y los ingredientes: "Relleno" se
    escribe una vez y se engancha a las tortas que lo usen.

    La unicidad vive aca por lo mismo que la del ingrediente (ADR-030): el
    panel solo puede evitar los duplicados que ve, y con la lista vieja
    "relleno" sobre "Relleno" entraba igual.
    """

    def list(self) -> list[dict]:
        grupos = OptionGroup.query.order_by(
            OptionGroup.sort_order.asc(), OptionGroup.name.asc()
        ).all()
        return [Serializer.option_group(grupo) for grupo in grupos]

    def create(self, data: dict) -> tuple[dict, bool]:
        """Devuelve `(payload, creado)`. Si ya existe, devuelve **ese**.

        Igual que el alta de ingrediente: pedir uno que ya esta es la misma
        intencion que usarlo, y hacerle leer un error a Andrea por eso seria
        ruido. La ruta traduce el `creado` a 201 o 200.
        """
        data = saneado.diccionario(data, "grupo")
        name = self._nombre(data.get("name"))

        existente = self._buscar_grupo(name)
        if existente:
            return Serializer.option_group(existente), False

        grupo = OptionGroup(
            name=name,
            required=self._bandera(data.get("required"), por_default=True),
            sort_order=self._orden(data.get("sort_order")),
        )
        for posicion, (nombre, recargo) in enumerate(
            self._opciones_del_alta(data.get("options"))
        ):
            grupo.options.append(
                Option(name=nombre, price_delta=recargo, sort_order=posicion)
            )

        db.session.add(grupo)
        try:
            db.session.commit()
        except IntegrityError:
            # La ventana entre mirar y escribir, igual que en los ingredientes:
            # sin esto el IntegrityError sube hasta `json_endpoint` —que solo
            # atrapa ServiceError— y sale como 500 con HTML en una API JSON.
            db.session.rollback()
            rescatado = self._buscar_grupo(name)
            if rescatado:
                return Serializer.option_group(rescatado), False
            raise
        return Serializer.option_group(grupo), True

    def update(self, group_id: int, data: dict) -> dict:
        data = saneado.diccionario(data, "grupo")
        grupo = self.require_entity(OptionGroup, group_id, "option group")

        if "name" in data:
            name = self._nombre(data.get("name"))
            choque = self._buscar_grupo(name)
            # Excluir la propia fila es lo que permite corregir un tipeo:
            # renombrar "relleno" a "Relleno" choca consigo mismo si no.
            if choque and choque.id != grupo.id:
                raise ValidationError(f"Ya existe un grupo que se llama «{choque.name}».")
            grupo.name = name
        if "required" in data:
            grupo.required = self._bandera(data.get("required"), por_default=grupo.required)
        if "sort_order" in data:
            grupo.sort_order = self._orden(data.get("sort_order"))

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValidationError("Ese nombre ya lo tiene otro grupo.") from None
        return {"status": "updated"}

    def delete(self, group_id: int) -> dict:
        """Borra el grupo y sus sabores. Los pedidos viejos no se tocan.

        Pueden hacerlo porque el renglon del pedido guarda **nombres** y no
        FKs (ADR-031): un pedido de enero sigue diciendo "Relleno: dulce de
        leche" aunque el grupo ya no exista.
        """
        grupo = self.require_entity(OptionGroup, group_id, "option group")
        db.session.delete(grupo)
        db.session.commit()
        return {"status": "deleted"}

    def create_option(self, group_id: int, data: dict) -> tuple[dict, bool]:
        data = saneado.diccionario(data, "opción")
        grupo = self.require_entity(OptionGroup, group_id, "option group")
        name = self._nombre(data.get("name"))

        existente = self._buscar_opcion(grupo, name)
        if existente:
            # Pedir uno que ya esta es la misma intencion que usarlo, pero si
            # vino con recargo hay que ponerselo: el panel avisaba "«X»
            # agregado con +$7.777" y el recargo se descartaba en silencio
            # (review de T20). Afirmar un precio que no se guardo es lo peor
            # que puede hacer la unica pantalla donde ella maneja plata.
            if "price_delta" in data:
                existente.price_delta = self._recargo(
                    data.get("price_delta"), por_default=existente.price_delta
                )
                db.session.commit()
            return Serializer.option(existente), False
        if len(grupo.options) >= MAX_OPCIONES:
            raise ValidationError(f"Un grupo admite hasta {MAX_OPCIONES} opciones.")

        opcion = Option(
            group=grupo,
            name=name,
            price_delta=self._recargo(data.get("price_delta"), por_default=Decimal("0")),
            sort_order=self._orden(data.get("sort_order"), por_default=len(grupo.options)),
        )
        db.session.add(opcion)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            rescatada = self._buscar_opcion(grupo, name)
            if rescatada:
                return Serializer.option(rescatada), False
            raise
        return Serializer.option(opcion), True

    def update_option(self, group_id: int, option_id: int, data: dict) -> dict:
        data = saneado.diccionario(data, "opción")
        grupo = self.require_entity(OptionGroup, group_id, "option group")
        opcion = self._opcion_del_grupo(grupo, option_id)

        if "name" in data:
            name = self._nombre(data.get("name"))
            choque = self._buscar_opcion(grupo, name)
            if choque and choque.id != opcion.id:
                raise ValidationError(f"«{choque.name}» ya está en este grupo.")
            opcion.name = name
        if "price_delta" in data:
            opcion.price_delta = self._recargo(
                data.get("price_delta"), por_default=opcion.price_delta
            )
        if "sort_order" in data:
            opcion.sort_order = self._orden(data.get("sort_order"))

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValidationError("Ese nombre ya lo tiene otra opción del grupo.") from None
        return {"status": "updated"}

    def delete_option(self, group_id: int, option_id: int) -> dict:
        grupo = self.require_entity(OptionGroup, group_id, "option group")
        db.session.delete(self._opcion_del_grupo(grupo, option_id))
        db.session.commit()
        return {"status": "deleted"}

    def _opcion_del_grupo(self, grupo: OptionGroup, option_id: int) -> Option:
        """La opcion tiene que ser **de este grupo**, no de cualquiera.

        Mismo control que `variant.product_id == product.id` (ADR-029): sin
        esto, el id de la opcion de otro grupo se renombra o se borra por la
        ruta de este.
        """
        opcion = self.require_entity(Option, option_id, "option")
        if opcion.option_group_id != grupo.id:
            raise ValidationError("Esa opción no es de este grupo.")
        return opcion

    def _buscar_grupo(self, name: str) -> OptionGroup | None:
        buscado = self._normalizado(name)
        if not buscado:
            return None
        return OptionGroup.query.filter_by(normalized_name=buscado).first()

    def _buscar_opcion(self, grupo: OptionGroup, name: str) -> Option | None:
        buscado = self._normalizado(name)
        if not buscado:
            return None
        return Option.query.filter_by(
            option_group_id=grupo.id, normalized_name=buscado
        ).first()

    def _opciones_del_alta(self, crudas: object) -> list[tuple[str, Decimal]]:
        """Los sabores del alta con su recargo, limpios y sin repetidos.

        El duplicado se saca aca y no en la base: mandar la lista con
        "Chocolate" dos veces es un error de tipeo del panel, y hacerlo
        fallar entero obligaria a Andrea a buscar cual era.

        Un sabor puede venir como texto —"Chocolate"— o como objeto con su
        recargo (F61). Las dos formas siguen entrando: la lista de nombres
        sueltos es la que usa el alta rapida del panel.
        """
        if crudas is None:
            return []
        if not isinstance(crudas, list):
            raise ValidationError("Las opciones tienen que venir como lista.")
        if len(crudas) > MAX_OPCIONES:
            raise ValidationError(f"Un grupo admite hasta {MAX_OPCIONES} opciones.")

        sabores: list[tuple[str, Decimal]] = []
        vistos: set[str] = set()
        for cruda in crudas:
            es_objeto = isinstance(cruda, dict)
            nombre = self._nombre(cruda.get("name") if es_objeto else cruda)
            normalizado = self._normalizado(nombre)
            if normalizado in vistos:
                continue
            vistos.add(normalizado)
            recargo = self._recargo(
                cruda.get("price_delta") if es_objeto else None, por_default=Decimal("0")
            )
            sabores.append((nombre, recargo))
        return sabores

    def _recargo(self, valor: object, *, por_default: Decimal) -> Decimal:
        """Lo que el sabor suma al precio. Recargo, nunca descuento (ADR-036).

        Vacio vale cero y no "dejalo como estaba": el campo del panel esta
        siempre a la vista, asi que borrarlo es la forma de sacar el recargo.
        """
        if valor is None:
            return Decimal(str(por_default or 0))
        if isinstance(valor, str) and not valor.strip():
            return Decimal("0")

        recargo = self.parse_decimal(valor, "recargo")
        if recargo < 0:
            raise ValidationError(
                "El sabor puede tener un recargo, no un descuento: poné 0 o más."
            )
        # `0.001` entraba y se guardaba como 0.00: ella pone un numero
        # positivo y el sistema guarda cero sin decir nada. Es el mismo caso
        # que `_precio_de_variante` ya rechazaba para el precio del tamano.
        if recargo > 0 and recargo.quantize(Decimal("0.01")) <= 0:
            raise ValidationError(
                "Ese recargo es tan chico que queda en cero. Poné al menos un centavo, o 0."
            )
        return recargo

    @staticmethod
    def _normalizado(name: str) -> str:
        return saneado.normalizar_nombre(name, "nombre", tope=TOPE_NOMBRE)

    @staticmethod
    def _nombre(valor: object) -> str:
        limpio = saneado.nombre_para_guardar(valor, "nombre", tope=TOPE_NOMBRE)
        if not limpio:
            raise ValidationError("Hace falta un nombre.")
        return limpio

    @staticmethod
    def _bandera(valor: object, *, por_default: bool) -> bool:
        if valor is None:
            return por_default
        if isinstance(valor, bool):
            return valor
        if isinstance(valor, str):
            return valor.strip().lower() in {"1", "true", "yes", "on", "si", "sí"}
        raise ValidationError("«required» tiene que ser verdadero o falso.")

    def _orden(self, valor: object, *, por_default: int = 0) -> int:
        if valor is None:
            return por_default
        return saneado.entero(valor, "orden", minimo=0, maximo=9999)


option_service = OptionService()

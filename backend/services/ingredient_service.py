from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Ingredient
from .base import ServiceBase
from .exceptions import ValidationError
from .serializers import Serializer
from . import saneado


# El modelo dice String(120)/String(40), pero SQLite no lo hace cumplir: sin
# estos topes entraron 4 MB en `name`, y `GET /api/ingredients` es publico, asi
# que el que se los descargaba era cada visitante (review de T6-F20).
TOPE_NOMBRE = 120
TOPE_UNIDAD = 40


class IngredientService(ServiceBase):
    """Los ingredientes son **globales**: un nombre, una fila, y la comparten
    todos los productos que lo lleven.

    Por eso la unicidad vive aca y no en el panel. Cuando vivia solo en el
    front —que compara sin acentos ni mayusculas— el back comparaba exacto, y
    con la lista del panel desactualizada entraba el duplicado igual: quedaron
    "Coco rallado" y "coco rallado" en la misma lista (T6-F20b). El front solo
    puede evitar los duplicados que ve.
    """

    def list(self) -> list[dict]:
        ingredients = Ingredient.query.order_by(Ingredient.name.asc()).all()
        return [Serializer.ingredient(ingredient) for ingredient in ingredients]

    def create(self, data: dict) -> tuple[dict, bool]:
        """Devuelve `(payload, creado)`. Si ya existe, devuelve **ese**.

        Pedir desde el panel un ingrediente que ya esta es la misma intencion
        que marcarlo: hacerle leer un error a Andrea por eso seria ruido. La
        ruta traduce el `creado` a 201 o 200.
        """
        data = saneado.diccionario(data, "ingrediente")
        name = self._nombre(data.get("name"))
        unit = self._unidad(data.get("unit"))

        existente = self._buscar_por_nombre(name)
        if existente:
            # El nombre que gana es el que ya estaba: lo escribio ella, y un
            # alta posterior con otra grafia no se lo pisa. Por eso la
            # respuesta lo devuelve: si no, el panel muestra en el chip lo que
            # se tipeo y no lo que quedo guardado, hasta que alguien recargue.
            return {"id": existente.id, "name": existente.name}, False

        # `normalized_name` lo deriva el modelo al asignar `name`.
        ingredient = Ingredient(name=name, unit=unit or None)
        db.session.add(ingredient)
        try:
            db.session.commit()
        except IntegrityError:
            # La ventana entre mirar y escribir: otra request lo creo en el
            # medio. Sin esto, el `IntegrityError` sube hasta `json_endpoint`
            # —que solo atrapa `ServiceError`— y sale como **500 con HTML** en
            # una API JSON, que es la clase de bug con la que arranca
            # `saneado.py`. La restriccion de la base es la que decide; aca
            # solo se traduce a la misma respuesta que si lo hubieramos visto.
            db.session.rollback()
            rescatado = self._buscar_por_nombre(name)
            if rescatado:
                return {"id": rescatado.id, "name": rescatado.name}, False
            raise
        return {"id": ingredient.id, "name": ingredient.name}, True

    def update(self, ingredient_id: int, data: dict) -> dict:
        data = saneado.diccionario(data, "ingrediente")
        ingredient = self.require_entity(Ingredient, ingredient_id, "ingredient")

        if "name" in data:
            name = self._nombre(data.get("name"))
            existente = self._buscar_por_nombre(name)
            # Excluir la propia fila es lo que permite corregir un tipeo:
            # renombrar "azucar" a "Azúcar" choca consigo mismo si no.
            if existente and existente.id != ingredient.id:
                raise ValidationError(f"Ya existe un ingrediente que se llama «{existente.name}».")
            ingredient.name = name

        if "unit" in data:
            ingredient.unit = self._unidad(data.get("unit")) or None

        try:
            db.session.commit()
        except IntegrityError:
            # Misma ventana que en el alta, del otro lado: dos renombres a la
            # vez hacia el mismo nombre.
            db.session.rollback()
            raise ValidationError("Ese nombre ya lo tiene otro ingrediente.") from None
        return {"status": "updated"}

    def delete(self, ingredient_id: int) -> dict:
        ingredient = self.require_entity(Ingredient, ingredient_id, "ingredient")
        db.session.delete(ingredient)
        db.session.commit()
        return {"status": "deleted"}

    def _buscar_por_nombre(self, name: str) -> Ingredient | None:
        """Una consulta por la columna indexada, no un barrido.

        La primera version traia todas las filas y comparaba en Python. Era
        correcta y lineal, pero no podia sostener una restriccion de la base:
        por eso ahora el normalizado es una **columna** con indice unico, y
        buscarlo es mirar ese indice.
        """
        buscado = self._normalizado(name)
        if not buscado:
            return None
        return Ingredient.query.filter_by(normalized_name=buscado).first()

    @staticmethod
    def _normalizado(name: str) -> str:
        return saneado.normalizar_nombre(name, "nombre", tope=TOPE_NOMBRE)

    @staticmethod
    def _nombre(valor: object) -> str:
        limpio = saneado.nombre_para_guardar(valor, "nombre", tope=TOPE_NOMBRE)
        if not limpio:
            raise ValidationError("El ingrediente necesita un nombre.")
        return limpio

    @staticmethod
    def _unidad(valor: object) -> str:
        limpio = saneado.texto(valor, "unidad", tope=TOPE_UNIDAD + 1)
        if len(limpio) > TOPE_UNIDAD:
            raise ValidationError(f"La unidad no puede pasar de {TOPE_UNIDAD} caracteres.")
        return limpio


ingredient_service = IngredientService()

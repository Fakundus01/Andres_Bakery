"""El nombre de la marca, escrito una sola vez del lado del servidor (D24).

Estaba repetido a mano en seis lugares del back (dos asuntos de mail, el
cuerpo del mail al cliente, la descripcion del envio en Mercado Pago, el
texto institucional sembrado y el punto de retiro por defecto) y en cinco del
front, con dos grafias distintas: el logo lo escribe con apostrofo y en
mayusculas, el sitio lo escribia sin apostrofo. El humano decidio el
2026-10-25 seguir el logo. Las dos grafias viejas no se citan aca a proposito:
el barrido de `tests/test_marca.py` las busca en este archivo tambien.

Apostrofo recto (U+0027) y caja normal: las razones estan en
`front/Andres_Bakery/src/lib/marca.test.ts`, que es el mismo contrato del
otro lado. Modulo sin imports a proposito, para que `config.py` pueda leerlo
sin ciclos.

Lo que NO cambia y no es un descuido: la carpeta, el nombre del repo, el
`CLOUDINARY_FOLDER`, el `statement_descriptor` de la tarjeta y las claves de
`localStorage` siguen con el nombre viejo, con guion bajo o con guion. Son
identificadores y rutas de datos ya guardados, no texto visible: renombrarlos
mueve archivos subidos y vacia carritos.
"""

from __future__ import annotations

MARCA = "Andre's Bakery"

# El default del `.env`: el punto de retiro que ve quien compra, en el carrito
# y en el checkout. En produccion y en la base de desarrollo lo pisa
# `PICKUP_ADDRESS` del entorno.
PUNTO_DE_RETIRO_POR_DEFECTO = f"{MARCA}, Villa Maipú, General San Martín"

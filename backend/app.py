from pathlib import Path
import os
import sys

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.app_factory import create_app


app = create_app()


if __name__ == "__main__":
    # `debug=True` por default era una bomba de tiempo: cualquier 500 sirve el
    # debugger de Werkzeug, que es una consola de Python en el navegador. Y
    # este archivo es el comando natural para levantar el back ("python
    # backend/app.py"), asi que el dia que alguien lo use en un server, el
    # primer campo mal tipeado de un anonimo abre esa consola.
    #
    # Para desarrollar: FLASK_DEBUG=1 python backend/app.py
    # Para probar desde el celular en la misma red: FLASK_HOST=0.0.0.0
    # (era el default y es justo lo que no conviene combinar con el debugger).
    debug = os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
    app.run(host=os.getenv("FLASK_HOST", "127.0.0.1"), port=5000, debug=debug)

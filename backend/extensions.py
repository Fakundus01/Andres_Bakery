from flask_jwt_extended import JWTManager  # type: ignore
from flask_mail import Mail  # type: ignore
from flask_migrate import Migrate  # type: ignore
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
# render_as_batch: SQLite no sabe ALTER COLUMN, asi que Alembic recrea la
# tabla y copia los datos. Sin esto, cada migracion que toque una columna
# existente falla (ADR-010).
migrate = Migrate(render_as_batch=True)

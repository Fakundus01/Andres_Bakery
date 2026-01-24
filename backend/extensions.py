from flask_jwt_extended import JWTManager  #type: ignore
from flask_mail import Mail #type: ignore
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
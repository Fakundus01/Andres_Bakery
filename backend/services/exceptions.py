from __future__ import annotations


class ServiceError(Exception):
    status_code = 400

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class ValidationError(ServiceError):
    status_code = 400


class AuthenticationError(ServiceError):
    status_code = 401


class AuthorizationError(ServiceError):
    status_code = 403


class NotFoundError(ServiceError):
    status_code = 404


class RateLimitError(ServiceError):
    """Demasiados requests de la misma clave (D2, ADR-026).

    Lleva la espera para poder contestar `Retry-After`: sin ese header, un
    cliente bien portado no tiene con que saber cuanto esperar.
    """

    status_code = 429

    def __init__(self, message: str, *, espera_segundos: int = 60) -> None:
        super().__init__(message)
        self.espera_segundos = espera_segundos


class StorageFullError(ServiceError):
    """La cuota de fotos esta llena (D18, ADR-032).

    507 y no 400: el pedido estaba bien, el que no puede cumplir es el
    servidor. Con subida publica de archivos, "se llena y ya" no es una
    opcion, y un 400 le diria a quien sube que se equivoco.
    """

    status_code = 507


class ConfigurationError(ServiceError):
    status_code = 503


class ExternalServiceError(ServiceError):
    status_code = 502

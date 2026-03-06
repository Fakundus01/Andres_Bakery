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


class ConfigurationError(ServiceError):
    status_code = 503


class ExternalServiceError(ServiceError):
    status_code = 502

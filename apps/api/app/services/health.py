from smartroute_shared.schemas import HealthResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.settings import get_settings
from app.db.session import check_database_connection


class HealthCheckError(RuntimeError):
    pass


def build_health_response() -> HealthResponse:
    settings = get_settings()

    try:
        check_database_connection()
    except SQLAlchemyError as error:
        raise HealthCheckError("Database connection failed.") from error

    return HealthResponse(status="ok", db="connected", version=settings.app_version)

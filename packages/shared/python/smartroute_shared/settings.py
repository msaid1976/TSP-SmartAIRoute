from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class SharedSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SmartRoute AI"
    app_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    web_port: int = 3000
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "smartroute"
    postgres_user: str = "smartroute"
    postgres_password: SecretStr = SecretStr("smartroute")
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: SecretStr | None = None
    celery_broker_db: int = 0
    celery_result_db: int = 1

    @property
    def database_url(self) -> str:
        password = self.postgres_password.get_secret_value()
        return (
            f"postgresql+psycopg://{self.postgres_user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    def redis_url(self, database: int) -> str:
        password = self.redis_password.get_secret_value() if self.redis_password else ""
        credentials = f":{password}@" if password else ""
        return f"redis://{credentials}{self.redis_host}:{self.redis_port}/{database}"

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url(self.celery_broker_db)

    @property
    def celery_result_backend(self) -> str:
        return self.redis_url(self.celery_result_db)


@lru_cache(maxsize=1)
def get_shared_settings() -> SharedSettings:
    return SharedSettings()

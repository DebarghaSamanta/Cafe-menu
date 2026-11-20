from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_db_name: str = "cafe_db"
    qr_base_url: str = "http://localhost:5173/menu"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # SMTP Email configuration
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    emails_from: str | None = None

    @field_validator("access_token_expire_minutes", mode="before")
    @classmethod
    def parse_expire_minutes(cls, v):
        if isinstance(v, str):
            v = v.strip().rstrip(".")
            return int(float(v))
        return int(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


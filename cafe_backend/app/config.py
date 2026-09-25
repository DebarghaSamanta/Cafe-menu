from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_db_name: str = "cafe_db"
    qr_base_url: str = "http://localhost:5173/menu"
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    # JWT settings
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
settings = Settings()
print("Groq key loaded:", bool(settings.groq_api_key))
print("Groq model:", settings.groq_model)
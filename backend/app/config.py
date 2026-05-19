from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./mbypass.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    # NTL threshold: flag feeders where losses exceed this percentage
    ntl_alert_threshold: float = 15.0

    class Config:
        env_file = ".env"


settings = Settings()

import warnings
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./mbypass.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    # NTL threshold: flag feeders where losses exceed this percentage
    ntl_alert_threshold: float = 15.0
    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    # Anomaly detection thresholds (kept in config so they can be tuned per deployment)
    anomaly_near_zero_kwh: float = 5.0        # Monthly kWh below this is suspicious
    anomaly_drop_pct: float = 0.60             # Single-period drop fraction that triggers flag
    anomaly_billing_divergence: float = 0.40   # Billed/actual ratio divergence threshold
    anomaly_min_bill_kwh: float = 1.0          # Min billed sum before divergence check runs

    @field_validator("secret_key")
    @classmethod
    def warn_insecure_default(cls, v: str) -> str:
        if v == "change-me-in-production":
            warnings.warn(
                "SECRET_KEY is using the insecure default. "
                "Set SECRET_KEY in your .env file before deploying.",
                stacklevel=2,
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()

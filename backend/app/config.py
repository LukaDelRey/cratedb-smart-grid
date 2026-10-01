import os


CRATE_URL = os.getenv("CRATE_URL", "http://cratedb:4200")
MQTT_HOST = os.getenv("MQTT_HOST", "emqx")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TELEMETRY_RETENTION_DAYS = max(
    1,
    int(os.getenv("TELEMETRY_RETENTION_DAYS", "7")),
)
PERSIST_MQTT_TELEMETRY = os.getenv(
    "PERSIST_MQTT_TELEMETRY",
    "false",
).lower() in {"1", "true", "yes", "on"}


def cors_origins():
    configured = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]

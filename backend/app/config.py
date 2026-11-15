import os


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    origins = [
        origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()
    ]
    if "*" in origins:
        raise ValueError("CORS_ORIGINS must list explicit origins; '*' is not allowed.")
    return origins

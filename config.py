from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    TAVILY_API_KEY: Optional[str] = None

    # Agent config
    MAX_SEARCH_RESULTS: int = 8
    MAX_ITERATIONS: int = 5
    REFLECTION_ENABLED: bool = True
    PARALLEL_AGENTS: int = 3

    # Model config
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    MAX_TOKENS: int = 4096

    # Redis (optional for caching)
    REDIS_URL: Optional[str] = "redis://localhost:6379"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

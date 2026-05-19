# Environment variable loading and validation for the DECIA bot
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    telegram_bot_token: str
    api_base_url: str
    workspace_api_token: str
    bot_version: str = "1.0.0"
    https_proxy: str | None = None
    http_proxy: str | None = None

    @classmethod
    def from_env(cls) -> "Config":
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        api_url = os.getenv("API_BASE_URL")
        api_token = os.getenv("WORKSPACE_API_TOKEN")

        missing = [
            name
            for name, val in [
                ("TELEGRAM_BOT_TOKEN", token),
                ("API_BASE_URL", api_url),
                ("WORKSPACE_API_TOKEN", api_token),
            ]
            if not val
        ]

        if missing:
            raise ValueError(f"Variáveis de ambiente ausentes: {', '.join(missing)}")

        return cls(
            telegram_bot_token=token,  # type: ignore[arg-type]
            api_base_url=api_url.rstrip("/"),  # type: ignore[union-attr]
            workspace_api_token=api_token,  # type: ignore[arg-type]
            https_proxy=os.getenv("HTTPS_PROXY"),
            http_proxy=os.getenv("HTTP_PROXY"),
        )


config = Config.from_env()

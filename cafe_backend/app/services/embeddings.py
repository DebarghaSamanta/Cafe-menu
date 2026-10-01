

from functools import lru_cache

from app.config import settings


class EmbeddingError(Exception):
    """
    Raised when an embedding could not be generated. Callers (see
    menu_tools.search_menu) catch this and fall back to structured
    search rather than let the request fail.
    """


_EMBEDDING_DIMENSIONS = {
    "all-MiniLM-L6-v2": 384,
}


@lru_cache(maxsize=1)
def _get_local_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.embedding_model)


def get_embedding(text: str) -> list[float]:
    """
    Turn text into an embedding vector using the configured provider.
    Never exposed in any API response - internal retrieval use only.
    """
    if not text or not text.strip():
        raise EmbeddingError("Cannot embed empty text")

    provider = settings.embedding_provider

    try:
        if provider == "local":
            model = _get_local_model()
            vector = model.encode(text, normalize_embeddings=True)
            return vector.tolist()

        raise EmbeddingError(f"Unknown embedding provider: {provider}")
    except EmbeddingError:
        raise
    except Exception as exc:
        raise EmbeddingError(f"Embedding generation failed: {exc}") from exc


def build_embedding_text(document: dict) -> str:
    """
    Combine the semantically useful fields of a menu item into one
    string for embedding. Deliberately excludes ids and prices.
    """
    parts = [
        document.get("name", ""),
        document.get("category", ""),
        document.get("description", ""),
    ]

    tags = document.get("tags") or []
    if tags:
        parts.append(", ".join(tags))

    return ". ".join(p.strip() for p in parts if p and p.strip())


def embedding_dimensions() -> int:
    return _EMBEDDING_DIMENSIONS.get(settings.embedding_model, 384)
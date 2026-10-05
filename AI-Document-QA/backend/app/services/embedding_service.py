import logging
import threading
from typing import List

logger = logging.getLogger(__name__)

# What is an embedding? It is a vector representation of text where semantically similar texts have similar vectors.
# Why Sentence Transformers? It provides state-of-the-art sentence embeddings that are highly optimized for semantic search.
# Expected output: A list of floats (or list of list of floats) representing the dense vector(s).
MODEL_NAME = "all-MiniLM-L6-v2"

# The model is loaded lazily on the first embedding request, then reused.
# Why lazy? Loading the model is expensive (disk I/O, network download on a
# fresh machine, memory allocation). Doing it at import time blocks application
# startup — on platforms like Render this delays binding to the PORT long
# enough that the platform reports "No open ports detected" and times out.
# Importing the FastAPI app must therefore NOT touch the model.
_model = None
_model_lock = threading.Lock()


def _get_model():
    """
    Returns the shared SentenceTransformer instance, loading it on first use.

    Thread-safe via double-checked locking: repeated calls reuse the same
    model instance instead of reloading it every time.
    """
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                # Imported here (not at module level) so that importing this
                # module — and by extension the whole FastAPI app — performs
                # no model initialization or network download.
                from sentence_transformers import SentenceTransformer

                logger.info(f"Loading embedding model {MODEL_NAME}...")
                _model = SentenceTransformer(MODEL_NAME)
                logger.info(f"Embedding model {MODEL_NAME} loaded successfully.")
    return _model


def embed_text(text: str) -> List[float]:
    """
    Generates a dense vector embedding for a single string of text.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Input text must be a non-empty string.")

    # Generate the embedding. Output is a numpy array.
    vector = _get_model().encode(text)

    # Convert numpy array to a list of floats
    return vector.tolist()

def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generates dense vector embeddings for a list of strings efficiently in a batch.
    Preserves the original input order.
    """
    if not isinstance(texts, list) or not texts:
        raise ValueError("Input texts must be a non-empty list of strings.")

    for t in texts:
        if not isinstance(t, str) or not t.strip():
            raise ValueError("All items in the input list must be non-empty strings.")

    # Generate embeddings in batch. Output is a numpy matrix.
    vectors = _get_model().encode(texts)

    # Convert to list of lists of floats
    return vectors.tolist()

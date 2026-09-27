import logging
from typing import List
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Load the model once at module level so it's reused across requests.
# What is an embedding? It is a vector representation of text where semantically similar texts have similar vectors.
# Why Sentence Transformers? It provides state-of-the-art sentence embeddings that are highly optimized for semantic search.
# Why load once? Loading a model is expensive (disk I/O, memory allocation). Reusing it avoids this overhead on every request.
# Expected output: A list of floats (or list of list of floats) representing the dense vector(s).
MODEL_NAME = "all-MiniLM-L6-v2"

try:
    logger.info(f"Loading embedding model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    logger.info(f"Embedding model {MODEL_NAME} loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load embedding model {MODEL_NAME}: {e}")
    # We allow the app to crash here because without embeddings, the AI Q&A cannot function.
    raise

def embed_text(text: str) -> List[float]:
    """
    Generates a dense vector embedding for a single string of text.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Input text must be a non-empty string.")
        
    # Generate the embedding. Output is a numpy array.
    vector = model.encode(text)
    
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
    vectors = model.encode(texts)
    
    # Convert to list of lists of floats
    return vectors.tolist()

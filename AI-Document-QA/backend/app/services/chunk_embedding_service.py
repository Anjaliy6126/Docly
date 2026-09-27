from typing import List, Dict, Any
import copy
from app.services.embedding_service import embed_texts

def embed_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates embedding vectors for a list of document chunks.
    
    Why chunks are embedded:
    Embeddings map the semantic meaning of the text to a high-dimensional vector space. 
    This allows us to perform semantic search to find the most relevant chunks when 
    answering a user's question later in the RAG pipeline.
    
    Why batch embedding is used:
    Embedding text is a computationally intensive operation (matrix multiplication).
    Batching the inputs allows the underlying model/hardware to vectorize operations, 
    making it significantly faster than processing chunks one at a time.
    
    Why chunk metadata must be preserved:
    The RAG system requires metadata (like page_number and document_id) to accurately 
    cite its sources and restrict searches to the correct document.
    
    Why embeddings are not stored yet:
    We are incrementally building the pipeline. Database schema definitions and vector 
    store integrations (like FAISS or pgvector) will be introduced in subsequent steps.
    """
    if not isinstance(chunks, list) or not chunks:
        raise ValueError("chunks must be a non-empty list.")

    texts = []
    
    for chunk in chunks:
        if not isinstance(chunk, dict):
            raise ValueError("Every chunk must be a dictionary.")
            
        required_keys = {"document_id", "page_number", "chunk_index", "text"}
        if not required_keys.issubset(chunk.keys()):
            raise ValueError(f"Chunk is missing one or more required keys: {required_keys}")
            
        text = chunk.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Chunk text must be a non-empty string.")
            
        texts.append(text)

    # Generate embeddings as a batch
    embeddings = embed_texts(texts)
    
    if len(embeddings) != len(chunks):
        raise ValueError("The number of embeddings returned does not match the number of input chunks.")

    # Create new output dictionaries to preserve immutability of input
    output_chunks = []
    for i, chunk in enumerate(chunks):
        new_chunk = copy.deepcopy(chunk)
        new_chunk["embedding"] = embeddings[i]
        output_chunks.append(new_chunk)
        
    return output_chunks

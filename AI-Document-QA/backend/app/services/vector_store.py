import numpy as np
import faiss
from typing import List, Dict, Any, Optional

# The embedding model (all-MiniLM-L6-v2 in embedding_service.py) produces
# fixed-size dense vectors. This constant must match that output exactly,
# otherwise FAISS would reject every add/search with a dimension mismatch.
EMBEDDING_DIMENSION = 384

class FAISSVectorStore:
    """
    A local, in-memory FAISS vector store for document chunk embeddings.

    How it works:
    - FAISS stores only the numeric vectors, in a flat index.
    - Metadata (document_id, page_number, chunk_index, text) is kept in a
      plain Python list that lives OUTSIDE the index.
    - The two structures are kept in lockstep: a vector added at FAISS
      position i always has its metadata at self.metadata[i].
    """
    
    def __init__(self, dimension: int = EMBEDDING_DIMENSION):
        if not isinstance(dimension, int) or dimension <= 0:
            raise ValueError("dimension must be a positive integer.")
        
        self.dimension = dimension
        self.metadata: List[Dict[str, Any]] = []
        
        # Why IndexFlatIP:
        # IndexFlatIP performs exact (not approximate) inner-product search.
        # When vectors are L2-normalized, inner product equals cosine
        # similarity, which is the standard similarity measure for
        # sentence-transformer embeddings. A flat index also guarantees
        # deterministic, exact results with no tuning parameters, which is
        # what a RAG pipeline wants for reliable source retrieval.
        self.index = faiss.IndexFlatIP(self.dimension)
    
    def add_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Adds document chunks (each containing metadata and an embedding) to
        the vector store. Vectors go into the FAISS index; metadata goes into
        self.metadata at the same positional index.
        """
        if not isinstance(chunks, list) or not chunks:
            raise ValueError("chunks must be a non-empty list.")
        
        required_keys = {"document_id", "page_number", "chunk_index", "text", "embedding"}
        
        for chunk in chunks:
            if not isinstance(chunk, dict):
                raise ValueError("Every chunk must be a dictionary.")
            if not required_keys.issubset(chunk.keys()):
                raise ValueError(f"Chunk is missing one or more required keys: {required_keys}")
            
            text = chunk.get("text")
            if not isinstance(text, str) or not text.strip():
                raise ValueError("Chunk text must be a non-empty string.")
            
            embedding = chunk.get("embedding")
            if not isinstance(embedding, list) or not embedding:
                raise ValueError("Chunk embedding must be a non-empty list.")
            if len(embedding) != self.dimension:
                raise ValueError(
                    f"Chunk embedding must have exactly {self.dimension} dimensions, "
                    f"got {len(embedding)}."
                )
        
        # Build a float32 matrix of shape (n, dimension).
        # FAISS requires contiguous float32 arrays.
        vectors = np.array(
            [chunk["embedding"] for chunk in chunks],
            dtype=np.float32
        )
        
        # Why normalize_L2:
        # all-MiniLM-L6-v2 embeddings are not guaranteed to be unit length.
        # Normalizing them makes inner product equivalent to cosine
        # similarity, so scores are comparable and bounded in [-1, 1].
        # Normalizing here operates on the numpy copy, never on the caller's
        # input chunks, so the inputs remain unmodified.
        faiss.normalize_L2(vectors)
        
        # add_with_ids would shift positions if ids were used; plain add()
        # appends sequentially, guaranteeing that the vector added at FAISS
        # position i aligns with metadata appended at self.metadata[i].
        self.index.add(vectors)
        for chunk in chunks:
            self.metadata.append({
                "document_id": chunk["document_id"],
                "page_number": chunk["page_number"],
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
            })
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        document_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Searches the index for the top_k most similar vectors to the query.
        Returns matched chunks with their metadata and similarity scores,
        ordered by score (highest first).

        document_ids filtering:
        - None: search all indexed chunks (original behavior, unchanged).
        - [1]: only chunks belonging to document 1.
        - [1, 2]: chunks belonging to documents 1 and 2.
        """
        if not isinstance(query_embedding, list) or not query_embedding:
            raise ValueError("query_embedding must be a non-empty list.")
        if len(query_embedding) != self.dimension:
            raise ValueError(
                f"query_embedding must have exactly {self.dimension} dimensions, "
                f"got {len(query_embedding)}."
            )
        if not isinstance(top_k, int) or top_k <= 0:
            raise ValueError("top_k must be a positive integer.")
        if document_ids is not None:
            if not isinstance(document_ids, list) or not all(isinstance(d, int) for d in document_ids):
                raise ValueError("document_ids must be a list of integers or None.")

        if self.index.ntotal == 0:
            raise ValueError("Vector store is empty.")

        # document_ids=[] means "no documents are allowed", so no result can
        # ever match; return early instead of running a pointless search.
        if document_ids is not None and not document_ids:
            return []

        # Why metadata is stored separately:
        # FAISS only handles vectors; it cannot store document_id,
        # page_number, chunk_index, or text. Keeping metadata in a parallel
        # Python list lets us reattach the full chunk context to search
        # results by index, without bloating the index itself.
        # The FAISS position returned by search() maps directly to
        # self.metadata[position], so vector i and metadata i stay synchronized.

        query = np.array([query_embedding], dtype=np.float32)
        faiss.normalize_L2(query)

        if document_ids is None:
            # Original behavior: let FAISS return only the top_k best matches.
            candidate_k = min(top_k, self.index.ntotal)
        else:
            # When filtering by document, the top_k global matches might all
            # belong to other documents. IndexFlatIP is exact and this index
            # is small, so we simply rank ALL vectors and filter afterwards —
            # this guarantees correct filtered results with no heuristics.
            candidate_k = self.index.ntotal

        scores, positions = self.index.search(query, candidate_k)

        allowed = None if document_ids is None else set(document_ids)
        results = []
        for score, position in zip(scores[0], positions[0]):
            if position == -1:
                continue
            if allowed is not None and self.metadata[position]["document_id"] not in allowed:
                continue
            result = dict(self.metadata[position])
            result["score"] = float(score)
            results.append(result)
            if document_ids is None and len(results) >= top_k:
                break

        # IndexFlatIP returns results sorted by descending score already, but
        # sorting here makes the ordering contract explicit and guaranteed.
        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:top_k]

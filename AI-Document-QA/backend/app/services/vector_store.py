import json
import logging
import os

import numpy as np
import faiss
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# The embedding model (all-MiniLM-L6-v2 in embedding_service.py) produces
# fixed-size dense vectors. This constant must match that output exactly,
# otherwise FAISS would reject every add/search with a dimension mismatch.
EMBEDDING_DIMENSION = 384

class FAISSVectorStore:
    """
    A local FAISS vector store for document chunk embeddings.

    How it works:
    - FAISS stores only the numeric vectors, in a flat index.
    - Metadata (document_id, page_number, chunk_index, text) is kept in a
      plain Python list that lives OUTSIDE the index.
    - The two structures are kept in lockstep: a vector added at FAISS
      position i always has its metadata at self.metadata[i].

    Persistence (optional):
    - Pass persist_directory to save the index + metadata to disk and load
      them back on construction (so the store survives restarts).
    - Without persist_directory the store behaves exactly as before:
      purely in-memory (all existing callers/tests are unaffected).
    """

    INDEX_FILENAME = "index.faiss"
    METADATA_FILENAME = "metadata.json"

    def __init__(self, dimension: int = EMBEDDING_DIMENSION,
                 persist_directory: Optional[str] = None):
        if not isinstance(dimension, int) or dimension <= 0:
            raise ValueError("dimension must be a positive integer.")
        if persist_directory is not None and not isinstance(persist_directory, str):
            raise ValueError("persist_directory must be a directory path string or None.")

        self.dimension = dimension
        self.persist_directory = persist_directory
        self.metadata: List[Dict[str, Any]] = []

        # Why IndexFlatIP:
        # IndexFlatIP performs exact (not approximate) inner-product search.
        # When vectors are L2-normalized, inner product equals cosine
        # similarity, which is the standard similarity measure for
        # sentence-transformer embeddings. A flat index also guarantees
        # deterministic, exact results with no tuning parameters, which is
        # what a RAG pipeline wants for reliable source retrieval.
        self.index = faiss.IndexFlatIP(self.dimension)

        if self.persist_directory is not None:
            # Missing files are a normal first-run condition (load() simply
            # keeps the empty store). A CORRUPTED file raises a clear error
            # instead of pretending the store contains valid vectors.
            self.load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _persistence_paths(self, directory: Optional[str] = None):
        directory = directory or self.persist_directory
        if not directory:
            raise ValueError(
                "No persistence directory configured. Pass persist_directory "
                "to the constructor or a directory to save()/load()."
            )
        return (
            os.path.join(directory, self.INDEX_FILENAME),
            os.path.join(directory, self.METADATA_FILENAME),
        )

    def save(self, directory: Optional[str] = None) -> None:
        """
        Persists the FAISS index and the metadata list to disk.

        Why atomic saving:
        The index and metadata are written to temporary files first and then
        swapped into place with os.replace(), so an interrupted save can
        never leave a half-written index paired with a full metadata list
        (or vice versa).
        """
        index_path, metadata_path = self._persistence_paths(directory)
        directory = os.path.dirname(index_path)
        os.makedirs(directory, exist_ok=True)

        tmp_index_path = index_path + ".tmp"
        tmp_metadata_path = metadata_path + ".tmp"

        faiss.write_index(self.index, tmp_index_path)
        with open(tmp_metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False)

        os.replace(tmp_index_path, index_path)
        os.replace(tmp_metadata_path, metadata_path)
        logger.info(
            f"Vector store saved: {self.index.ntotal} vectors -> {directory}"
        )

    def load(self, directory: Optional[str] = None) -> bool:
        """
        Loads the FAISS index and metadata from disk.

        Returns True if a persisted store was loaded, False if no
        persistence files exist yet (a normal first-run condition).

        Raises RuntimeError with a clear message if the files exist but
        cannot be loaded safely (corrupted index, unreadable metadata,
        dimension mismatch, or index/metadata out of sync) — an empty store
        is used instead of pretending the data is valid.
        """
        index_path, metadata_path = self._persistence_paths(directory)

        if not os.path.exists(index_path) and not os.path.exists(metadata_path):
            # Normal first run: nothing persisted yet.
            return False

        if not os.path.exists(index_path) or not os.path.exists(metadata_path):
            raise RuntimeError(
                "Vector store persistence is incomplete: index and metadata "
                f"files must exist together (missing one of: {index_path}, "
                f"{metadata_path})."
            )

        try:
            loaded_index = faiss.read_index(index_path)
        except Exception as exc:
            raise RuntimeError(f"Could not read the FAISS index file: {exc}")

        if loaded_index.d != self.dimension:
            raise RuntimeError(
                f"Persisted FAISS index has dimension {loaded_index.d}, but this "
                f"store expects {self.dimension}. The persisted store is "
                "incompatible and was not loaded."
            )

        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                loaded_metadata = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError) as exc:
            raise RuntimeError(f"Could not read the vector store metadata file: {exc}")

        if not isinstance(loaded_metadata, list):
            raise RuntimeError("Vector store metadata file is invalid (expected a list).")
        if len(loaded_metadata) != loaded_index.ntotal:
            raise RuntimeError(
                f"Vector store is out of sync: index has {loaded_index.ntotal} "
                f"vectors but metadata has {len(loaded_metadata)} entries. "
                "The persisted store is inconsistent and was not loaded."
            )
        for i, entry in enumerate(loaded_metadata):
            if not isinstance(entry, dict) or not {"document_id", "page_number", "chunk_index", "text"}.issubset(entry.keys()):
                raise RuntimeError(
                    f"Vector store metadata entry at position {i} is invalid."
                )

        # Only now, after every check passed, replace the in-memory state.
        self.index = loaded_index
        self.metadata = loaded_metadata
        logger.info(
            f"Vector store loaded: {self.index.ntotal} vectors from {directory or self.persist_directory}"
        )
        return True
    
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

        # Persist immediately so newly indexed documents survive a restart.
        # Without a configured persist_directory this is a no-op (in-memory
        # behavior, unchanged).
        if self.persist_directory is not None:
            self.save()
    
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

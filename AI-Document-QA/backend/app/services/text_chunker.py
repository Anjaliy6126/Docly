import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def chunk_document_pages(document_id: int, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Chunks extracted page-level text into smaller overlapping chunks.
    
    Strategy:
    - Target chunk size: ~500 words
    - Overlap: ~50 words
    - Preserve page boundaries (do not combine text across multiple pages)
    - Skip empty pages
    - Assign sequential chunk_index starting from 0
    """
    
    if not isinstance(document_id, int):
        raise ValueError("document_id must be an integer.")
    if not isinstance(pages, list):
        raise ValueError("pages must be a list of dictionaries.")
        
    chunk_size = 500
    overlap = 50
    chunks = []
    chunk_index = 0
    
    for page in pages:
        page_num = page.get("page_number")
        text = page.get("text", "").strip()
        
        if not text:
            continue
            
        words = text.split()
        if not words:
            continue
            
        # If the page is short, it becomes a single chunk.
        if len(words) <= chunk_size:
            chunks.append({
                "document_id": document_id,
                "page_number": page_num,
                "chunk_index": chunk_index,
                "text": text
            })
            chunk_index += 1
            continue
            
        # For longer pages, split into overlapping chunks
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)
            
            chunks.append({
                "document_id": document_id,
                "page_number": page_num,
                "chunk_index": chunk_index,
                "text": chunk_text
            })
            chunk_index += 1
            
            # If we've reached the end of the words, stop
            if end >= len(words):
                break
                
            # Move start forward by (chunk_size - overlap)
            start += (chunk_size - overlap)
            
    return chunks

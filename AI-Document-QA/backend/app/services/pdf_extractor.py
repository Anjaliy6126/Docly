import fitz  # PyMuPDF
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text from a PDF file page by page using PyMuPDF (fitz).
    
    Why PyMuPDF: It is fast, accurate, and handles various PDF formats well compared to other libraries.
    Why preserve page numbers: Page numbers are essential for the future RAG system to provide accurate source citations.
    Why not store in DB yet: We are waiting to implement chunking strategies before deciding the final schema for the extracted text.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at path.")
        
    pages_data = []
    
    try:
        # Open the PDF safely
        doc = fitz.open(file_path)
    except Exception as e:
        logger.error(f"Failed to open PDF file {file_path}: {e}")
        raise ValueError("File cannot be opened as a PDF.") from e
        
    try:
        if len(doc) == 0:
            raise ValueError("PDF has zero pages.")
            
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text").strip()
            
            # Even if the text is empty, we record the page to maintain structure.
            # We can handle empty pages during the chunking phase.
            pages_data.append({
                "page_number": page_num + 1,  # 1-indexed for human readability
                "text": text
            })
            
    except Exception as e:
        logger.error(f"Error during extraction from {file_path}: {e}")
        raise RuntimeError("Unexpected error during PDF extraction.") from e
    finally:
        # Ensure the document is closed
        doc.close()
        
    return pages_data

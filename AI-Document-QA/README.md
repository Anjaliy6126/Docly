# AI Document Q&A System

## 1. Project Description
A RAG-based document assistant that allows students to upload PDF documents and ask questions about them. The system provides intelligent answers using a local LLM and supports persistent chat histories and multi-document conversations.

## 2. Problem Statement
Students often have to search through lengthy academic regulations, examination guidelines, and other PDF documents to find specific information. This is time-consuming and error-prone.

## 3. Proposed Solution
An AI-powered Q&A system that extracts text from uploaded PDFs, chunks and embeds the text, and uses Retrieval-Augmented Generation (RAG) to provide accurate, context-aware answers to student queries, complete with source citations.

## 4. Main Features
- **PDF Text Processing:** Extraction, cleaning, and chunking of PDF documents.
- **RAG Capabilities:** Vector search and context-aware answers based on uploaded documents.
- **Source Citations:** Answers include citations pointing to the source document and page number.
- **Persistent Chat:** Save conversations and continue them later.
- **Multi-Document Support:** A single chat can reference multiple PDFs.
- **Document Management:** Upload, view, update, delete, and categorize documents.

## 5. Planned Technology Stack
- **Frontend:** React (Vite)
- **Backend:** Python, FastAPI
- **PDF Processing:** PyMuPDF
- **Embeddings:** Sentence Transformers (Open-source)
- **Vector Search:** FAISS (initially)
- **Local LLM:** Ollama
- **Database:** PostgreSQL (for relational data like users, documents, and chat history)
- **Version Control:** Git & GitHub

## 6. High-Level Architecture
1. **Frontend (React):** Provides the user interface for document management, chat, and viewing citations. Communicates with the backend via REST APIs.
2. **Backend (FastAPI):** Handles API requests, coordinates PDF processing, vector storage, and language model interaction.
3. **Relational Database (PostgreSQL):** Stores metadata about users, documents, chats, and messages.
4. **Vector Database (FAISS):** Stores document embeddings for fast similarity search.
5. **LLM Engine (Ollama):** Processes the context and user query to generate answers.

## 7. Current Development Status
- Initial project structure created.
- Basic frontend (React) and backend (FastAPI) directories established.
- AI functionality, database integration, and UI implementation are pending in future phases.

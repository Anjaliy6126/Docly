# AI Document Q&A System

A local, private AI assistant that lets you upload PDF documents and have a real conversation with them. Everything runs on your own machine — no paid AI API, no cloud subscription, and your documents never leave your computer.

---

## What is this?

Imagine you have a 200-page university handbook, an exam regulation document, or a dense research paper. You want to know something specific — say, the penalty for late submission, or the maximum number of backlogs allowed. You would normally open the PDF, try Ctrl+F, give up, and read half the document.

This system lets you just ask. You upload the PDF, select it, and type your question in plain English. The AI reads through the relevant parts and gives you a direct answer — with a citation telling you exactly which document and page it found the information on.

It works like a private ChatGPT for your own documents, but runs completely locally. No subscription. After the required packages and models are downloaded once, the core document question-answering workflow runs locally without sending your documents to a cloud AI service.

---

## The problem it solves

Students deal with a lot of dense documents: syllabi, regulations, hostel rulebooks, project guidelines. Finding a specific piece of information in any of them is frustrating. Keyword search only works if you already know the exact words used. Reading through linearly takes too long.

Large language models like ChatGPT can answer questions very well, but they do not know the contents of your specific documents. And uploading sensitive university documents to a third-party cloud service raises legitimate privacy concerns.

This project bridges both problems: it gives you an AI that can intelligently answer questions, grounded specifically in the documents you provide, running entirely on your hardware.

---

## How it works

Here is what happens, step by step, every time you upload a PDF and ask a question.

### Step 1 — You upload a PDF

You click Upload and choose a PDF file. The backend saves the file safely on disk and records its name, title, and size in the PostgreSQL database. The file size limit is 20 MB.

### Step 2 — The PDF is read page by page

The backend opens the PDF using **PyMuPDF**. It reads the text from every page and keeps track of which page number each piece of text came from. That page-number tracking is what later lets the system say "found on page 14 of Hostel_Rules.pdf".

### Step 3 — The text is split into chunks

A full page of text can be very long, and sending an entire page to the AI every time you ask something would be slow and inefficient. So the text is broken into smaller pieces called **chunks** — each chunk is roughly 500 words. Consecutive chunks overlap by about 50 words so that any sentence near the boundary between two chunks is not accidentally cut off and lost.

### Step 4 — Each chunk is converted into a vector (an embedding)

This is the core trick that makes semantic search possible. A machine learning model called `all-MiniLM-L6-v2`, from a library called **Sentence Transformers**, reads each chunk and converts it into a list of 384 numbers. This list is called an **embedding** or a **vector**.

The important property of these numbers is that chunks with similar *meaning* end up with similar number patterns — even if they use completely different words. So "rules about late fee payment" and "penalty for not paying the fee on time" would produce very similar vectors, even though they share almost no words. This is what makes semantic search so much better than simple keyword matching.

### Step 5 — The vectors are stored in FAISS

All those number-lists are stored in a fast search engine called **FAISS** (Facebook AI Similarity Search). FAISS is built for exactly one job: given a new vector, find the most similar vectors in its index quickly, even if the index contains millions of entries. Think of it as a library catalogue where you search by meaning rather than by title or keyword.

### Step 6 — You select documents and ask a question

In the chat interface, you first pick one or more of your uploaded and processed PDFs. **This selection step is required** before you can type anything — the chat input stays disabled until at least one processed document is selected. The system needs to know which documents to search so it does not blindly pull in text from unrelated PDFs.

**Example:** Suppose you have uploaded four documents:

```
Syllabus.pdf
Hostel_Rules.pdf
Placement_Guide.pdf
Scholarship.pdf
```

If you are asking about hostel fees, you select `Hostel_Rules.pdf`. The AI will search only that document. If your question spans multiple topics, you can select multiple PDFs at once. This is an intentional design decision, not a limitation.

The flow for a new chat looks like this:

```
New Chat
   ↓
Select one or more processed PDFs
   ↓
Chat input becomes available
   ↓
Type your question
   ↓
System finds relevant chunks via FAISS
   ↓
Ollama generates the answer
   ↓
Answer + page/document citation shown
```

### Step 7 — Your question is also turned into a vector

The same embedding model that processed your PDF chunks now converts your question into a vector using the exact same method.

### Step 8 — FAISS finds the most relevant chunks

The system asks FAISS: which stored chunks are most similar in meaning to this question? FAISS returns the top 3 most relevant chunks from your selected documents. These are the passages most likely to contain the answer.

### Step 9 — A prompt is built and sent to Ollama

The system assembles your question and the 3 retrieved chunks into a structured prompt — something like:

> "You are a helpful assistant. Here are some passages from a document. Answer the question using only this information. If the answer is not in the passages, say so."

This entire prompt (question + retrieved context) is the **RAG** pattern: **Retrieval-Augmented Generation**. The key idea is:
- **Retrieval** — find the relevant chunks from the document
- **Augmented** — give those chunks to the language model alongside the question
- **Generation** — let the model generate a focused, grounded answer

The prompt is sent to **Ollama**, a tool that runs AI language models locally on your computer. The model used is **llama3.2:3b** — a 3 billion parameter open-weight model. Ollama handles everything: model loading, inference on your CPU or GPU, and returning the text response.

### Step 10 — The answer arrives with citations

The model returns a plain-English answer. The system also attaches source metadata — which document and which page each retrieved chunk came from — so you can open the original PDF and verify the answer yourself.

### Step 11 — Everything is saved to PostgreSQL

Every question, every answer, and the documents linked to each chat are saved to the PostgreSQL database. You can close the browser, restart the servers, and pick up any previous conversation exactly where you left off from the chat history sidebar.

---

## PDF processing and indexing

When you upload a PDF, the backend immediately tries to extract text, chunk it, generate embeddings, and store them in FAISS. This entire pipeline runs synchronously during the upload request.

- If the pipeline completes successfully, the document status changes to **processed** and it becomes available for chat.
- If any step fails (e.g., a corrupted PDF, a memory issue, or the embedding model failing to load), the document is marked as **failed**. The PDF file itself is still saved on disk. No automatic retry mechanism is currently implemented — you can check the backend terminal output for the specific error.

**Do not try to use a document for chat if its status is not "processed".** It will not appear in the selectable list in the chat view.

---

## Features

- **PDF upload and processing** — Upload any text-based PDF up to 20 MB. Scanned image-only PDFs (no embedded text layer) are not supported.
- **Semantic question answering** — Understands the meaning of your question, not just keywords.
- **Source citations** — Every answer includes the document name and page number.
- **Persistent chat history** — All conversations are saved to PostgreSQL. Resume any chat from the sidebar.
- **Conversation context** — The last few messages in a chat are included in the prompt so the model can handle follow-up questions naturally.
- **Multi-document chats** — Ask a single question across multiple PDFs at once.
- **Per-user isolation** — Each user account has its own documents and chats. One user cannot access another's data.
- **Local AI inference** — No paid API. No cloud. Documents never leave your machine for AI processing.

---

## Technology stack

### Backend

| Library / Tool | Version | What it does |
|---|---|---|
| **Python** | 3.12.10 | Language the entire backend is written in |
| **FastAPI** | 0.111.0 | HTTP API framework. Handles routing, request validation, and response serialization |
| **Uvicorn** | 0.30.1 | ASGI server that runs the FastAPI app |
| **Pydantic** | 2.7.4 | Data validation for API request and response schemas |
| **SQLAlchemy** | 2.0.30 | ORM used to define and query the PostgreSQL database |
| **psycopg2-binary** | 2.9.9 | PostgreSQL database driver used by SQLAlchemy |
| **python-dotenv** | 1.0.1 | Loads environment variables from the `.env` file at startup |
| **python-multipart** | 0.0.9 | Required by FastAPI to parse `multipart/form-data` (PDF file uploads) |
| **PyMuPDF** | 1.24.5 | Extracts text from PDF files page by page |
| **Sentence Transformers** | latest | Loads the `all-MiniLM-L6-v2` model to convert text into semantic embedding vectors |
| **faiss-cpu** | latest | Facebook AI Similarity Search — stores and searches document embedding vectors locally |
| **Ollama** | external | Runs the local LLM. Installed separately, not via pip |
| **llama3.2:3b** | — | The language model pulled into Ollama. Generates answers from the retrieved context |
| **bcrypt** | 5.0.0 | Hashes user passwords before storing them. Plaintext passwords are never saved |
| **PyJWT** | 2.15.1 | Creates and verifies JWT access tokens for authenticated API requests |
| **email-validator** | 2.3.0 | Validates email format in registration requests via Pydantic's `EmailStr` type |

### Frontend

| Library / Tool | Version | What it does |
|---|---|---|
| **React** | 19.2.8 | UI library. All pages and components are React function components |
| **Vite** | 8.3.0 | Development server and build tool |
| **motion** | 13.4.4 | Animation library (`motion/react`). Used for page transitions, message animations, and UI micro-interactions |
| **lucide-react** | 1.48.0 | Icon library used throughout the interface |
| **Tailwind CSS** | 4.3.3 | Utility-first CSS framework used for styling |
| **tailwind-merge** | 3.7.0 | Safely merges Tailwind class names in components |
| **clsx** | 2.1.1 | Conditional class name utility |

The frontend communicates with the FastAPI backend exclusively through the browser's `fetch` API, sending JSON (for chat and auth requests) or `FormData` (for PDF uploads) to `http://127.0.0.1:8000`. All protected routes include a `Bearer` token in the `Authorization` header, read from `localStorage`.

---

## Authentication

```
Register (name + email + password)
   ↓
Password hashed with bcrypt (plaintext never stored)
   ↓
User row created in PostgreSQL
   ↓
Log in with email + password
   ↓
Backend verifies password hash
   ↓
JWT access token issued (signed with JWT_SECRET from .env)
   ↓
Token stored in browser localStorage
   ↓
All subsequent API requests include: Authorization: Bearer <token>
   ↓
Backend verifies token on every protected route
   ↓
Documents and chats are scoped to the authenticated user
```

The JWT secret is set in your local `.env` file and is never committed to source control.

---

## Architecture

```
User (Browser)
   ↓
React + Vite Frontend  [http://localhost:5173]
   ↓  (fetch with Bearer token)
FastAPI Backend  [http://127.0.0.1:8000]
   │
   ├── /auth        → Registration, Login, JWT issuance
   │
   ├── /documents   → PDF upload, indexing, list, delete
   │     ├── PyMuPDF           (text extraction)
   │     ├── Text chunker      (500-word chunks, 50-word overlap)
   │     ├── Sentence Transformers  (all-MiniLM-L6-v2 embeddings)
   │     └── FAISS             (vector store, persisted to disk)
   │
   ├── /chats       → Create chat, send message, load history
   │     └── RAG pipeline
   │           ├── Sentence Transformers  (embed the question)
   │           ├── FAISS                  (find top-3 relevant chunks)
   │           └── Ollama / llama3.2:3b   (generate the answer)
   │
   └── /rag         → Standalone question answering (without chat session)
   │
   ↓
PostgreSQL
   Users, Documents (metadata), Chats, Messages
   (FAISS index stored separately on disk in backend/vector_store/)
```

**PostgreSQL** stores structured application data: user accounts, document metadata (filename, size, status), chat sessions, and all messages.

**FAISS** stores the document embedding vectors and is used for semantic similarity search. The FAISS index lives on disk in `backend/vector_store/` and is loaded into memory when the backend starts.

---

## Project structure

```
project612/
└── AI-Document-QA/
    ├── backend/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── deps.py           # get_current_user dependency
    │   │   │   └── routes/
    │   │   │       ├── auth.py       # POST /auth/register, POST /auth/login
    │   │   │       ├── documents.py  # Upload, list, get, delete documents
    │   │   │       ├── chats.py      # Create chat, send message, load history
    │   │   │       └── rag.py        # POST /rag/ask (standalone Q&A)
    │   │   ├── core/
    │   │   │   ├── config.py         # App settings from .env
    │   │   │   ├── database.py       # SQLAlchemy session setup
    │   │   │   └── security.py       # bcrypt + JWT helpers
    │   │   ├── models/               # SQLAlchemy ORM models (User, Document, Chat, Message)
    │   │   ├── schemas/              # Pydantic request/response schemas
    │   │   ├── services/
    │   │   │   ├── pdf_extractor.py          # PyMuPDF text extraction
    │   │   │   ├── text_chunker.py           # 500-word overlapping chunker
    │   │   │   ├── embedding_service.py      # Sentence Transformers wrapper
    │   │   │   ├── vector_store.py           # FAISS index implementation
    │   │   │   ├── document_vector_store.py  # Global shared FAISS store
    │   │   │   ├── document_indexing_service.py  # Orchestrates upload pipeline
    │   │   │   ├── llm_service.py            # Ollama HTTP client
    │   │   │   └── rag_service.py            # RAG pipeline orchestrator
    │   │   └── main.py               # FastAPI app, CORS, route registration
    │   ├── documents/                # Uploaded PDF files (not committed)
    │   ├── vector_store/             # FAISS index files (not committed)
    │   ├── requirements.txt
    │   ├── create_tables.py
    │   └── .env.example
    ├── frontend/
    │   ├── src/
    │   │   ├── components/
    │   │   │   ├── auth/             # LoginForm, RegisterForm, AuthPage
    │   │   │   ├── chat/             # ChatInput, ChatMessage, ChatHistorySidebar, EmptyChatState
    │   │   │   ├── layout/           # TopNav
    │   │   │   └── ui/               # Button, shared UI primitives
    │   │   ├── context/
    │   │   │   └── AuthContext.jsx   # React auth state + localStorage sync
    │   │   ├── hooks/
    │   │   │   └── useBackendHealth.js
    │   │   ├── pages/
    │   │   │   ├── Chat.jsx          # Main chat interface
    │   │   │   ├── Dashboard.jsx
    │   │   │   └── Documents.jsx     # Document management page
    │   │   ├── services/
    │   │   │   └── api.ts            # All fetch calls to the FastAPI backend
    │   │   ├── App.jsx
    │   │   └── index.css
    │   └── package.json
    └── README.md
```

---

## Prerequisites

Install the following before you start:

- **Python 3.12** — [python.org/downloads](https://www.python.org/downloads/) — the backend virtual environment uses Python 3.12.10
- **Node.js 18 or later** — [nodejs.org](https://nodejs.org/)
- **PostgreSQL** — [postgresql.org/download](https://www.postgresql.org/download/)
- **Ollama** — [ollama.com](https://ollama.com/) — runs the language model locally

> **Internet during setup:** Python packages, npm packages, Sentence Transformer model weights, and the Ollama model all need to be downloaded once during initial setup. After that, the question-answering workflow runs locally.

---

## Installation and setup

### 1. Clone the repository

```bash
git clone https://github.com/Anjaliy6126/project612.git
cd project612
cd AI-Document-QA
```

### 2. Set up the backend virtual environment

```bash
cd backend
```

Create a Python 3.12 virtual environment (the project is tested on 3.12.10):

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3.12 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

> The first install downloads the `all-MiniLM-L6-v2` Sentence Transformers model weights (~80 MB). This only happens once.

### 3. Configure environment variables

Copy the example file:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and fill in your values:

```
DATABASE_URL=postgresql+psycopg2://postgres:your_password_here@localhost:5432/ai_document_qa
JWT_SECRET=replace_with_a_long_random_secret_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Generate a secure JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copy the output into the `JWT_SECRET` field. Never commit `.env` to source control.

### 4. Create the PostgreSQL database

Open a PostgreSQL shell (psql) or pgAdmin and run:

```sql
CREATE DATABASE ai_document_qa;
```

Then create the tables:

```bash
python create_tables.py
```

### 5. Download the AI model

Make sure Ollama is installed and running, then:

```bash
ollama pull llama3.2:3b
```

This downloads approximately 2 GB. You only need to do this once.

### 6. Start the backend server

From `AI-Document-QA/backend/` with your virtual environment active:

```bash
python -m uvicorn app.main:app --reload
```

The backend starts at `http://127.0.0.1:8000`. You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### 7. Start the frontend (in a separate terminal)

From `AI-Document-QA/frontend/`:

```bash
npm install
npm run dev
```

The frontend starts at [http://localhost:5173](http://localhost:5173).

> You need **two terminals running at the same time**: one for the backend, one for the frontend. Ollama also needs to be running (check your system tray on Windows, or run `ollama serve` on macOS/Linux).

---

## Using the application

**1. Register an account**
Open [http://localhost:5173](http://localhost:5173) and create an account with your name, email, and password.

**2. Upload a PDF**
Go to the **Documents** tab. Click Upload and choose a text-based PDF. The backend will extract the text, chunk it, generate embeddings, and store them in FAISS. This takes a few seconds for a short document, longer for a large one. The document status changes from *processing* to *processed* (or *failed* if something goes wrong — check the backend terminal).

**3. Start a chat**
Go to the **Chats** tab and click New Chat. A document selection panel appears on the left. **You must select at least one processed document before the chat input becomes active.** This is intentional — the system needs to know which PDFs to search.

**4. Ask your question**
Type your question and press Enter. The backend embeds your question, searches FAISS for the most relevant chunks from your selected documents, sends them to Ollama with your question, and returns a grounded answer with source citations.

**5. Continue or revisit conversations**
All chats are saved automatically. Click any previous chat in the sidebar to load it. The last few messages are also sent to the LLM as conversation context so it can handle follow-up questions.

---

## API reference

The FastAPI backend serves interactive documentation automatically:

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Log in, receive a JWT access token |
| `GET` | `/health` | Check if the backend is running |
| `GET` | `/health/db` | Check if the database connection is working |
| `POST` | `/documents/upload` | Upload and index a PDF |
| `GET` | `/documents/` | List all your documents |
| `GET` | `/documents/{id}` | Get a single document's metadata |
| `DELETE` | `/documents/{id}` | Delete a document (removes DB record, PDF file, and FAISS vectors) |
| `GET` | `/documents/{id}/text` | Get the extracted text for a document |
| `GET` | `/documents/{id}/chunks` | Get the text chunks for a document |
| `POST` | `/chats/` | Create a new chat session linked to documents |
| `GET` | `/chats/` | List all your chats |
| `POST` | `/chats/{id}/messages` | Send a message, get an AI answer with citations |
| `GET` | `/chats/{id}/messages` | Load the full message history for a chat |
| `POST` | `/rag/ask` | Ask a question directly (not tied to a saved chat session) |

---

## Troubleshooting

**"Could not connect to the Ollama server"**
Ollama is not running. On Windows, look for Ollama in the system tray. On macOS/Linux, run `ollama serve` in a terminal. Make sure `llama3.2:3b` has been pulled (`ollama pull llama3.2:3b`).

**"Database connection failed"**
PostgreSQL is either not running, or the `DATABASE_URL` in your `.env` does not match your PostgreSQL username, password, host, port, or database name.

**"Only PDF files are allowed"**
Only `.pdf` files are accepted. Scanned PDFs without an embedded text layer (image-only PDFs) will upload but produce no usable text chunks.

**Document stuck on "processing" or shows "failed"**
Look at the backend terminal for the stack trace. Common causes: embedding model failed to load at startup, FAISS ran out of memory, or the PDF is password-protected.

**Chat input is disabled even after uploading**
The document must reach *processed* status before it appears in the selection list. If it failed, check the backend terminal and consider re-uploading.

**Slow answers**
The `llama3.2:3b` model runs on CPU by default if no compatible GPU is detected. On a typical laptop CPU, expect 10–40 seconds per answer. A GPU (Nvidia CUDA or Apple Silicon) will significantly reduce this.

---

## License

This project was built as a university coursework assignment. All AI components (Ollama, Sentence Transformers, FAISS) are open-source.

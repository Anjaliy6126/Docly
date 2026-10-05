# ── Docly FastAPI Backend Dockerfile ─────────────────────────────────────────
# Uses official Python 3.12 slim base image matching local development
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Set working directory
WORKDIR /app

# Copy requirements first to take advantage of Docker layer caching
COPY requirements.txt .

# Upgrade pip and install all backend dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code into the container
# (.dockerignore ensures .venv, .env, __pycache__, and test.db are excluded)
COPY . .

# Ensure storage directories exist for document uploads and FAISS vector index
RUN mkdir -p /app/storage/documents /app/storage/vector_store /app/documents /app/vector_store

# Expose backend service port
EXPOSE 8000

# Initialize database tables with create_tables.py and start FastAPI app with uvicorn
CMD ["sh", "-c", "python create_tables.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

import json
import logging
import urllib.request
import urllib.error
from typing import Any, Dict

logger = logging.getLogger(__name__)

# Why localhost:
# The whole point of this project is a fully local, private, zero-cost RAG
# pipeline. The Ollama server runs on the user's own machine, so no document
# content ever leaves the computer and no cloud LLM API (OpenAI, Gemini,
# Claude, etc.) or paid API key is involved.
OLLAMA_BASE_URL = "http://localhost:11434"

# Small instruct model (2 GB) chosen because it runs comfortably on a laptop
# while still producing useful answers for document Q&A.
OLLAMA_MODEL = "llama3.2:3b"

# Why a timeout is important:
# LLM generation can take tens of seconds, and if the Ollama server hangs or
# dies mid-request, a client without a timeout would block forever. 120s is
# generous enough for a 3B model on CPU/GPU while still failing fast enough
# to surface a clear, actionable error.
OLLAMA_TIMEOUT = 120  # seconds

def generate_response(prompt: str) -> str:
    """
    Sends a prompt to the local Ollama server and returns the generated text.

    Uses Ollama's /api/generate endpoint, which performs a single
    prompt-in / completion-out generation with the loaded local model.
    """
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be a non-empty string.")

    payload: Dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        # Why streaming is disabled:
        # /api/generate streams newline-delimited JSON chunks by default.
        # For this first implementation we only need one complete answer for
        # the RAG pipeline, so stream=false makes Ollama return a single JSON
        # object and keeps parsing simple and deterministic.
        "stream": False,
    }

    body = json.dumps(payload).encode("utf-8")
    url = f"{OLLAMA_BASE_URL}/api/generate"

    try:
        request = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT) as response:
            raw = response.read()
    except urllib.error.URLError as exc:
        # Connection refused, DNS failure, timeout, etc. The usual root cause
        # is that the Ollama app/server is not running locally.
        reason = getattr(exc, "reason", exc)
        if isinstance(reason, TimeoutError) or "timed out" in str(reason).lower():
            raise RuntimeError(
                f"Ollama server at {OLLAMA_BASE_URL} timed out after "
                f"{OLLAMA_TIMEOUT} seconds. The model may be busy or slow."
            )
        raise RuntimeError(
            f"Could not connect to the Ollama server at {OLLAMA_BASE_URL}. "
            f"Make sure Ollama is installed and running. Details: {reason}"
        )
    except Exception as exc:
        # Anything unexpected (e.g. protocol-level failure) is still reported
        # as a clear message instead of a raw stack trace.
        raise RuntimeError(f"Unexpected error contacting Ollama server: {exc}")

    try:
        data = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise RuntimeError("Ollama server returned a response that is not valid JSON.")

    # With stream=false, Ollama replies with a single JSON object whose
    # "response" field holds the full generated text.
    if not isinstance(data, dict) or "response" not in data:
        raise RuntimeError("Ollama server response format was unexpected (missing 'response' field).")

    text = data["response"]
    if not isinstance(text, str) or not text.strip():
        raise RuntimeError("Ollama model returned an empty response.")

    return text

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Any, Dict

logger = logging.getLogger(__name__)

# ── Provider selection ──────────────────────────────────────────────────────
# LLM_PROVIDER chooses the backend that generates RAG answers:
#   - "ollama"     (default): local Ollama server, fully offline/private.
#   - "openrouter": OpenRouter's OpenAI-compatible chat API (cloud).
# Any unknown value falls back to the default local Ollama setup.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").strip().lower()

# ── Ollama configuration ────────────────────────────────────────────────────
# Configurable through environment variables for deployment flexibility (e.g. Docker,
# remote Ollama host, or alternative models) while preserving the default local setup.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

try:
    OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))
except (ValueError, TypeError):
    OLLAMA_TIMEOUT = 120

# ── OpenRouter configuration ────────────────────────────────────────────────
# OpenRouter exposes an OpenAI-compatible /chat/completions endpoint.
# The API key is read from the environment ONLY and must never be logged,
# printed, or embedded in error messages.
OPENROUTER_BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
).rstrip("/")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

try:
    OPENROUTER_TIMEOUT = int(os.getenv("OPENROUTER_TIMEOUT", "120"))
except (ValueError, TypeError):
    OPENROUTER_TIMEOUT = 120


def _generate_ollama(prompt: str) -> str:
    """
    Sends a prompt to the local Ollama server and returns the generated text.

    Uses Ollama's /api/generate endpoint, which performs a single
    prompt-in / completion-out generation with the loaded local model.
    """
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


def _generate_openrouter(prompt: str) -> str:
    """
    Sends the RAG prompt to OpenRouter's OpenAI-compatible chat endpoint
    and returns the generated text.

    The prompt already contains the full RAG structure (system instructions,
    document context, conversation history, and the current question), so it
    is sent as a single user chat message. This keeps grounding behavior
    identical between the Ollama and OpenRouter providers.
    """
    # The key must come from the environment. Fail with a clear configuration
    # error before making any network request. The key value itself is never
    # included in error messages or logs.
    if not OPENROUTER_API_KEY or not OPENROUTER_API_KEY.strip():
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Add it to the environment "
            "(or .env) when LLM_PROVIDER=openrouter."
        )

    payload: Dict[str, Any] = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "stream": False,
    }

    body = json.dumps(payload).encode("utf-8")
    url = f"{OPENROUTER_BASE_URL}/chat/completions"

    headers = {
        "Content-Type": "application/json",
        # OpenRouter authenticates with a standard Bearer token.
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    }

    try:
        request = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=OPENROUTER_TIMEOUT) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        # HTTP-level failure (bad key, rate limit, model error, etc.).
        # Report only the status code — never the request headers or key.
        raise RuntimeError(
            f"OpenRouter request failed with HTTP status {exc.code}. "
            f"Check the model name and API key configuration."
        )
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        if isinstance(reason, TimeoutError) or "timed out" in str(reason).lower():
            raise RuntimeError(
                f"OpenRouter request timed out after {OPENROUTER_TIMEOUT} seconds."
            )
        raise RuntimeError(
            f"Could not connect to OpenRouter at {OPENROUTER_BASE_URL}. "
            f"Check your network connection. Details: {reason}"
        )
    except Exception as exc:
        raise RuntimeError(f"Unexpected error contacting OpenRouter: {exc}")

    try:
        data = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise RuntimeError("OpenRouter returned a response that is not valid JSON.")

    # OpenAI-compatible shape: {"choices": [{"message": {"content": "..."}}]}
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(
            "OpenRouter response format was unexpected (missing choices/message/content)."
        )

    if not isinstance(text, str) or not text.strip():
        raise RuntimeError("OpenRouter model returned an empty response.")

    return text


def generate_response(prompt: str) -> str:
    """
    Generates an answer for the given RAG prompt using the configured
    LLM_PROVIDER ("ollama" or "openrouter") and returns the generated text.

    This is the single entry point used by the RAG pipeline, so the rest of
    the application is unaffected by which provider is selected.
    """
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be a non-empty string.")

    if LLM_PROVIDER == "openrouter":
        return _generate_openrouter(prompt)
    # Default (and any unrecognized value) keeps the original local behavior.
    return _generate_ollama(prompt)

/**
 * Centralized API configuration for the FastAPI backend.
 * All backend calls should go through this module so the base URL
 * is defined in exactly one place.
 */
export const API_BASE_URL = 'http://127.0.0.1:8000'

/**
 * Check backend availability via GET /health.
 * Returns true when the backend responds successfully, false otherwise
 * (network error, timeout, non-2xx).
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      // Abort if the backend does not answer within 5 seconds.
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Shape of the document object returned by POST /documents/upload. */
export interface UploadedDocument {
  id: number
  original_filename: string
  title: string | null
  category: string | null
  file_size: number | null
  status: string
  upload_timestamp: string
  updated_timestamp: string
}

/**
 * Extract a readable error message from a FastAPI error response.
 * FastAPI returns { detail: "..." } for HTTPException errors and
 * { detail: [{ msg, ... }, ...] } for validation (422) errors.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  const fallback = `Upload failed (HTTP ${response.status}).`
  try {
    const body = await response.json()
    const detail = body?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean)
      if (messages.length > 0) return messages.join('; ')
    }
  } catch {
    // Response was not JSON; keep the fallback message.
  }
  return fallback
}

/**
 * Upload a PDF to the backend via POST /documents/upload.
 *
 * The backend indexes the document synchronously (extraction, chunking,
 * embeddings, FAISS), so this can take several seconds for large PDFs.
 *
 * Throws an Error with a user-readable message on any failure.
 * Note: do NOT set the Content-Type header manually — fetch/FormData
 * must generate the multipart boundary themselves.
 */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
      // Generous timeout: the backend processes + indexes the PDF inline.
      signal: AbortSignal.timeout(120000),
    })
  } catch {
    throw new Error(
      'Could not reach the backend. Make sure the server is running, then try again.',
    )
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

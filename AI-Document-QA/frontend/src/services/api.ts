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

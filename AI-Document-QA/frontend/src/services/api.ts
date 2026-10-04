/**
 * Centralized API configuration for the FastAPI backend.
 * All backend calls go through this module so the base URL
 * and authentication headers are defined and managed centrally.
 */
export const API_BASE_URL = 'http://127.0.0.1:8000'

/**
 * Authentication storage keys for localStorage.
 * Prefixed with 'pathly_document_qa_' as per project specifications.
 */
export const STORAGE_KEY_TOKEN = 'pathly_document_qa_token'
export const STORAGE_KEY_USER = 'pathly_document_qa_user'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
}

/**
 * Get the JWT access token from localStorage.
 * Returns null if not found or invalid.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY_TOKEN)
  } catch {
    return null
  }
}

/**
 * Get the logged-in user object from localStorage.
 * Returns null if not found or invalid.
 */
export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const userStr = window.localStorage.getItem(STORAGE_KEY_USER)
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Save the auth token and user to localStorage.
 */
export function setAuthSession(token: string, user: AuthUser): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY_TOKEN, token)
    window.localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
  } catch {
    // Storage quota or privacy mode error
  }
}

/**
 * Backwards-compatible alias for setAuthSession.
 */
export const setAuth = setAuthSession

/**
 * Clear authentication data from localStorage.
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY_TOKEN)
    window.localStorage.removeItem(STORAGE_KEY_USER)
  } catch {
    // Storage access error
  }
}

/**
 * Get stored auth data (token and user) for hydrating application state.
 */
export function getStoredAuth(): { token: string; user: AuthUser } | null {
  const token = getAuthToken()
  const user = getAuthUser()
  return token && user ? { token, user } : null
}

/**
 * Centralized helper to get the Authorization header with Bearer token.
 * All protected endpoints use this helper.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Internal helper to check response status and handle 401 Unauthorized.
 * Clears stored authentication session and dispatches custom event for the AuthContext.
 */
export function handleResponse(response: Response): Response {
  if (response.status === 401) {
    clearAuth()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
  }
  return response
}

/**
 * Extract a user-friendly error message from a FastAPI error response.
 * FastAPI returns { detail: "..." } for HTTPException errors and
 * { detail: [{ msg, ... }, ...] } for validation (422) errors.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'Session expired or invalid credentials. Please sign in again.'
  }
  const fallback = `Request failed (HTTP ${response.status}).`
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
 * Authentication interfaces
 */
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  id: number
  name: string
  email: string
  role: string
}

/**
 * Register a new user via POST /auth/register.
 * Returns the created user object.
 */
export async function registerUser(name: string, email: string, password: string): Promise<RegisterResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Could not reach the backend to register. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Overload to support both register(requestObj) and register(name, email, password).
 */
export async function register(
  requestOrName: RegisterRequest | string,
  email?: string,
  password?: string
): Promise<RegisterResponse> {
  if (typeof requestOrName === 'object') {
    return registerUser(requestOrName.name, requestOrName.email, requestOrName.password)
  }
  return registerUser(requestOrName, email ?? '', password ?? '')
}

/**
 * Log in a user via POST /auth/login.
 * Returns the access token and user information.
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Could not reach the backend to login. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Overload to support both login(requestObj) and login(email, password).
 */
export async function login(requestOrEmail: LoginRequest | string, password?: string): Promise<LoginResponse> {
  if (typeof requestOrEmail === 'object') {
    return loginUser(requestOrEmail.email, requestOrEmail.password)
  }
  return loginUser(requestOrEmail, password ?? '')
}

/**
 * Check backend availability via GET /health.
 * Returns true when backend responds successfully, false otherwise.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Document interfaces
 */
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

export interface DocumentTextResponse {
  document_id: number
  filename: string
  pages: Array<{ page_number: number; text: string }>
}

export interface DocumentChunk {
  document_id: number
  page_number: number
  chunk_index: number
  text: string
  token_count?: number
}

/**
 * Upload a PDF to the backend via POST /documents/upload.
 * Note: do NOT set Content-Type header manually — browser sets boundary automatically for FormData.
 */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...getAuthHeaders(),
      },
      // Generous timeout: backend extracts, chunks, embeds, and indexes synchronously
      signal: AbortSignal.timeout(120000),
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Fetch all documents belonging to the authenticated user via GET /documents.
 */
export async function getDocuments(): Promise<UploadedDocument[]> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Fetch single document details via GET /documents/{id}.
 */
export async function getDocument(documentId: number): Promise<UploadedDocument> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Delete a document via DELETE /documents/{document_id}.
 */
export async function deleteDocument(documentId: number): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }
}

/**
 * Get extracted text of a document via GET /documents/{id}/text.
 */
export async function getDocumentText(documentId: number): Promise<DocumentTextResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/${documentId}/text`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Get chunks of a document via GET /documents/{id}/chunks.
 */
export async function getDocumentChunks(documentId: number): Promise<DocumentChunk[]> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/documents/${documentId}/chunks`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Chat interfaces
 */
export interface ChatSource {
  document_id: number
  document_name: string | null
  page_number: number
  chunk_index: number
  score: number
  text?: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export interface ChatResponse {
  chat_id: number
  user_message: ChatMessage
  assistant_message: ChatMessage
  sources: ChatSource[]
}

export interface ChatListItem {
  id: number
  title: string
  document_ids: number[]
  created_at: string
  updated_at: string
}

export interface ChatMessagesResponse {
  chat_id: number
  messages: ChatMessage[]
}

/**
 * Create a new chat session via POST /chats.
 */
export async function createChat(title: string, documentIds: number[]): Promise<{ id: number; title: string; document_ids?: number[] }> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/chats/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ title, document_ids: documentIds }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Could not reach the backend to create a chat. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Send a message to an existing chat via POST /chats/{chatId}/messages.
 */
export async function sendChatMessage(chatId: number, content: string): Promise<ChatResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(120000), // 2 minutes for LLM generation
    })
  } catch {
    throw new Error('Could not reach the backend to send the message. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Fetch all chats for the current user via GET /chats.
 */
export async function getChats(): Promise<ChatListItem[]> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/chats/`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Fetch all messages for a chat via GET /chats/{chatId}/messages.
 */
export async function getChatMessages(chatId: number): Promise<ChatMessagesResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...getAuthHeaders(),
      },
    })
  } catch {
    throw new Error('Could not reach the backend. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}

/**
 * Direct RAG question answering via POST /rag/ask.
 */
export async function askRag(
  question: string,
  documentIds?: number[],
  topK?: number
): Promise<{ answer: string; sources: ChatSource[] }> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/rag/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        question,
        document_ids: documentIds,
        top_k: topK ?? 4,
      }),
      signal: AbortSignal.timeout(120000),
    })
  } catch {
    throw new Error('Could not reach the backend to answer the question. Make sure the server is running, then try again.')
  }

  handleResponse(response)

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return response.json()
}
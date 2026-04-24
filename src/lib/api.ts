/**
 * ARGUS API Client
 * Centralized fetch wrapper that:
 *  - Always reads the JWT from localStorage
 *  - Always sends Authorization: Bearer <token>
 *  - Throws on non-2xx responses (no silent fallback)
 */

const BACKEND = ''; // empty = relative, proxied via next.config.ts → http://localhost:5000

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('argus-token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${BACKEND}${path}`;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await res.json();
        message = body.message || body.error || message;
      } else {
        // Handle plain text error responses
        const textBody = await res.text();
        if (textBody.includes('Internal Server Error')) {
          message = 'Internal Server Error';
        } else {
          message = textBody || message;
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse error response:', parseError);
      message = `HTTP ${res.status} - Failed to parse error response`;
    }
    throw new ApiError(res.status, message);
  }

  // Handle successful responses that might not be JSON
  try {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json() as Promise<T>;
    } else {
      const text = await res.text();
      // If it's not JSON, try to parse it as JSON in case the content-type is wrong
      try {
        return JSON.parse(text) as Promise<T>;
      } catch {
        throw new ApiError(500, 'Invalid JSON response from server');
      }
    }
  } catch (parseError) {
    console.error('Failed to parse successful response:', parseError);
    throw new ApiError(500, 'Invalid JSON response from server');
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export default api;

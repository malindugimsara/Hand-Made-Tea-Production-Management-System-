import toast from 'react-hot-toast';

const BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_BACKEND_URL) ||
  ''
).replace(/\/+$/, '');

// Guard to prevent multiple simultaneous 401 triggers / redirect loops
let isHandlingUnauthorized = false;

/**
 * Handle 401 Unauthorized responses globally.
 * Clears local session and redirects to login page.
 */
export function handleUnauthorized() {
  if (isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;

  // Clear authentication tokens and metadata
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('allowedPaths');
  localStorage.removeItem('allowedPages');
  localStorage.removeItem('activeSystem');

  // Notify user
  toast.error('Session expired or unauthorized. Please log in again.', {
    id: 'auth-session-expired'
  });

  // Notify any active React listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));

    // Redirect to login if not already on the login page
    if (window.location.pathname !== '/login') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 600);
    } else {
      isHandlingUnauthorized = false;
    }
  }
}

/**
 * Build the full target URL.
 * Supports relative API paths ('/api/...') and absolute URLs.
 */
export function buildUrl(endpoint) {
  if (!endpoint) return BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Centralized fetch wrapper.
 * - Automatically injects Bearer token from localStorage
 * - Automatically sets 'Content-Type': 'application/json' when body is an object
 * - Intercepts 401 responses to auto-logout and redirect
 *
 * @param {string} endpoint - API path (e.g. '/api/users') or full URL
 * @param {object} options - Standard fetch options + custom extensions
 * @returns {Promise<Response>} The raw fetch Response object
 */
export async function apiFetch(endpoint, options = {}) {
  const {
    skipAuth = false,
    headers = {},
    body,
    ...restOptions
  } = options;

  const url = buildUrl(endpoint);
  const finalHeaders = new Headers(headers);

  // 1. Inject Authorization header if token exists and not skipped
  if (!skipAuth && !finalHeaders.has('Authorization')) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  // 2. Handle Body and Content-Type
  let finalBody = body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
  const isSearchParams = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;

  if (body && !isFormData && !isBlob && !isSearchParams && typeof body === 'object') {
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json');
    }
    finalBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: finalHeaders,
      body: finalBody
    });

    // 3. Global 401 Interception (Token Expired, Revoked, or Invalid)
    if (response.status === 401) {
      handleUnauthorized();
    }

    return response;
  } catch (error) {
    // Network errors (server down, offline)
    console.error(`[API Network Error] ${options.method || 'GET'} ${url}:`, error);
    throw error;
  }
}

/**
 * Convenient API client instance with helper methods.
 */
export const api = (endpoint, options) => apiFetch(endpoint, options);

api.get = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' });

api.post = (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'POST', body });

api.put = (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PUT', body });

api.patch = (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PATCH', body });

api.delete = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' });

// Upload helper for FormData (multipart/form-data)
api.upload = (endpoint, formData, options = {}) => {
  return apiFetch(endpoint, {
    ...options,
    method: options.method || 'POST',
    body: formData
  });
};

// Token utilities
api.getToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
api.setToken = (token) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('token', token);
};
api.clearToken = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('token');
};

api.BASE_URL = BASE_URL;

export default api;

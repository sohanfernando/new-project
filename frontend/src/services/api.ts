const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  detail: any;

  constructor(message: string, status: number, detail: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type header if sending FormData (browser handles boundaries automatically)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail: any = null;
    let errorMessage = 'An error occurred';
    try {
      const errorJson = await response.json();
      detail = errorJson.detail ?? null;
      // FastAPI returns `detail` as either a string or a structured object.
      // Stringify object details so legacy callers reading `.message` still work.
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (detail && typeof detail === 'object' && 'message' in detail) {
        errorMessage = String(detail.message);
      }
    } catch {
      // response body is not JSON
    }
    throw new ApiError(errorMessage, response.status, detail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: any, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: any, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  uploadCV: async <T>(file: File, roleId?: number | string, levelId?: number | string): Promise<T> => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    if (roleId !== undefined && roleId !== '') {
      formData.append('role_id', String(roleId));
    }
    if (levelId !== undefined && levelId !== '') {
      formData.append('level_id', String(levelId));
    }

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}/api/cv/extract`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload CV';
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.detail || errorMessage;
      } catch { }
      throw new Error(errorMessage);
    }

    return response.json();
  }
};

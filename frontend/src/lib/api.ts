const TOKEN_KEY = 'kl.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function toError(response: Response): Promise<ApiError> {
  let detail = response.statusText;
  let fieldErrors: Record<string, string> | undefined;
  try {
    const body = await response.json();
    detail = body.detail ?? body.message ?? detail;
    fieldErrors = body.fieldErrors;
  } catch {
    // A non-JSON error body is not worth surfacing; the status already tells the story.
  }
  return new ApiError(response.status, detail, fieldErrors);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });

  // A 401 from the login call is a bad-credentials answer, not an expired session; surface the
  // server's real message. Any other 401 means the token lapsed, so clear it and bounce to /login.
  if (response.status === 401 && !path.endsWith('/auth/login')) {
    setToken(null);
    window.location.assign('/login');
    throw new ApiError(401, 'Your session has expired');
  }
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<T>(path, { method: 'POST', body: form });
  },
};

/** Uploaded images win over the source URL, matching what the editor implies. */
export function imageSrc(imageKey?: string | null, imageUrl?: string | null): string | null {
  if (imageKey) return `/api/images/${imageKey}`;
  return imageUrl ?? null;
}

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase()) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (response.status === 204) return null;
  const body = await response.text();
  let payload = {};
  if (body) {
    try {
      payload = JSON.parse(body);
    } catch {
      if (!response.ok && response.status === 429) {
        payload = { error: 'Too many requests. Please wait before trying again.' };
      }
    }
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && typeof payload.error === 'string'
      ? payload.error
      : 'The request could not be completed.';
    throw new Error(message);
  }
  return payload;
}

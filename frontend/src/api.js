let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

function sendRequest(path, options) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase()) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  return fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

async function readPayload(response) {
  if (response.status === 204) return null;
  const body = await response.text();
  let payload = {};
  if (body) {
    try {
      payload = JSON.parse(body);
    } catch {
      if (!response.ok) {
        payload = {
          error: response.status === 429
            ? 'Too many requests. Please wait before trying again.'
            : `The server returned HTTP ${response.status} without a JSON error message.`,
        };
      }
    }
  }
  if (!response.ok && (!payload || typeof payload !== 'object' || typeof payload.error !== 'string')) {
    payload = { error: `The server returned HTTP ${response.status} without a JSON error message.` };
  }
  return payload;
}

const retryableAuthPaths = ['/auth/login', '/auth/session', '/auth/verify-otp', '/auth/register/verify-otp'];
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function api(path, options = {}) {
  let response = await sendRequest(path, options);
  let payload = await readPayload(response);
  const method = (options.method || 'GET').toUpperCase();
  const retryable = retryableAuthPaths.includes(path) || method === 'GET';
  if ((response.status === 503 || (response.status === 500 && retryableAuthPaths.includes(path))) && retryable && options.retry !== false) {
    await sleep(700);
    response = await sendRequest(path, { ...options, retry: false });
    payload = await readPayload(response);
  }
  if (
    response.status === 403
    && method !== 'GET'
    && method !== 'HEAD'
    && payload?.error === 'Invalid CSRF token.'
  ) {
    const sessionResponse = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (sessionResponse.ok) {
      const session = await sessionResponse.json();
      setCsrfToken(session.csrfToken || null);
      response = await sendRequest(path, options);
      payload = await readPayload(response);
    }
  }
  if (!response.ok) {
    const serverMessage = payload && typeof payload === 'object' && typeof payload.error === 'string'
      ? payload.error
      : 'The request could not be completed.';
    const message = serverMessage === 'The request could not be completed.'
      ? 'The server had a temporary problem. Please try again.'
      : serverMessage;
    throw new Error(message);
  }
  return payload;
}

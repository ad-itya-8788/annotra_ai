import { config } from '../config.js';

function assertConfigured() {
  if (!config.messageCentral.customerId || !config.messageCentral.authToken) {
    throw Object.assign(new Error('Message Central is not configured. Set its customer ID and API key in backend/.env.'),{status:503});
  }
}

function providerUrl(base, parameters) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

async function request(url, parameters) {
  assertConfigured();
  const method = parameters.method || 'GET';
  const query = { ...parameters };
  delete query.method;

  let response;
  try {
    response = await fetch(providerUrl(url, query), {
      method,
      headers: {
        authToken: config.messageCentral.authToken,
        accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw Object.assign(
      new Error(timedOut ? 'Message Central request timed out. Please try again.' : 'Could not connect to Message Central. Please try again.'),
      { status: 502, publicMessage: true },
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw Object.assign(
        new Error('Message Central rejected its configured credentials. Check MESSAGE_CENTRAL_CUSTOMER_ID and MESSAGE_CENTRAL_AUTH_TOKEN in backend/.env.'),
        { status: 502, publicMessage: true },
      );
    }
    if (response.status === 429) {
      throw Object.assign(new Error('Message Central rate limit exceeded. Please try again later.'), { status: 429, publicMessage: true });
    }
    throw Object.assign(new Error(`Message Central returned HTTP ${response.status}.`), { status: 502 });
  }
  if (!body || typeof body !== 'object') throw Object.assign(new Error('Message Central returned an invalid response.'), { status: 502 });
  return body;
}

export async function sendOtp(mobile) {
  const countryCode = config.messageCentral.countryCode.replace(/\D/g, '');
  const digits = mobile.replace(/\D/g, '');
  const mobileNumber = digits.startsWith(countryCode) && digits.length > 10
    ? digits.slice(countryCode.length)
    : digits;
  const body = await request(config.messageCentral.sendUrl, {
    countryCode: config.messageCentral.countryCode,
    customerId: config.messageCentral.customerId,
    flowType: 'SMS',
    mobileNumber,
    otpLength: 6,
    method: 'POST',
  });
  const verificationId = body.data?.verificationId
    || body.verificationId
    || body.data?.requestId
    || body.requestId;
  if (!verificationId) throw new Error(body.message || 'Message Central did not return a verification ID.');
  return String(verificationId);
}

export async function verifyOtp(mobile, verificationId, code) {
  const countryCode = config.messageCentral.countryCode.replace(/\D/g, '');
  const digits = mobile.replace(/\D/g, '');
  const mobileNumber = digits.startsWith(countryCode) && digits.length > 10
    ? digits.slice(countryCode.length)
    : digits;
  const body = await request(config.messageCentral.verifyUrl, {
    countryCode: config.messageCentral.countryCode,
    mobileNumber,
    customerId: config.messageCentral.customerId,
    verificationId,
    code,
  });
  const status = String(
    body.data?.verificationStatus || body.verificationStatus || body.status || '',
  ).toUpperCase();
  return status === 'VERIFICATION_COMPLETED'
    || status === 'SUCCESS'
    || body.data?.verified === true
    || body.verified === true;
}

import test from 'node:test';
import assert from 'node:assert/strict';

const overrides = {
  MESSAGE_CENTRAL_SEND_OTP_URL: '',
  MESSAGE_CENTRAL_VALIDATE_OTP_URL: '',
  MESSAGE_CENTRAL_CUSTOMER_ID: '',
  MESSAGE_CENTRAL_AUTH_TOKEN: '',
  MESSAGECENTRAL_SEND_OTP_URL: 'https://legacy.example/send',
  MESSAGECENTRAL_VALIDATE_OTP_URL: 'https://legacy.example/validate',
  MESSAGECENTRAL_CUSTOMER_ID: 'legacy-customer-id',
  MESSAGECENTRAL_API_KEY: 'legacy-auth-token',
};
const previous = new Map(Object.keys(overrides).map((key) => [key, process.env[key]]));
Object.assign(process.env, overrides);
const { config } = await import('../src/config.js?message-central-config-test');
for (const [key, value] of previous) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test('Message Central config accepts existing MESSAGECENTRAL environment names', () => {
  assert.equal(config.messageCentral.sendUrl, 'https://legacy.example/send');
  assert.equal(config.messageCentral.verifyUrl, 'https://legacy.example/validate');
  assert.equal(config.messageCentral.customerId, 'legacy-customer-id');
  assert.equal(config.messageCentral.authToken, 'legacy-auth-token');
});

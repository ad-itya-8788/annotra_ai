import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistration } from '../src/routes.js';

test('registration accepts only a name, mobile number, and password', () => {
  assert.deepEqual(parseRegistration({
    fullName: '  Asha Rao  ',
    mobile: '9876543210',
    password: 'StrongPassword123',
  }), {
    fullName: 'Asha Rao',
    mobile: '+919876543210',
    password: 'StrongPassword123',
  });
});

test('registration still rejects invalid mobile numbers and weak passwords', () => {
  assert.throws(() => parseRegistration({
    fullName: 'Asha Rao',
    mobile: '12345',
    password: 'StrongPassword123',
  }), { status: 400 });
  assert.throws(() => parseRegistration({
    fullName: 'Asha Rao',
    mobile: '9876543210',
    password: 'weak',
  }), { status: 400 });
});

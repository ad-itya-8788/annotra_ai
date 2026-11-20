import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFormAnswers, normalizeFormDefinition, slugifyFormTitle } from '../src/formSchemas.js';

test('form slugs are normalized for public share URLs', () => {
  assert.equal(slugifyFormTitle('  Café / Contact Form! '), 'cafe-contact-form');
});

test('form definitions require unique questions and valid choice options', () => {
  assert.throws(() => normalizeFormDefinition({ title: 'Contact', fields: [] }), { status: 400 });
  assert.throws(() => normalizeFormDefinition({ title: 'Contact', fields: [null] }), { status: 400 });
  assert.throws(() => normalizeFormDefinition({
    title: 'Contact',
    fields: [
      { id: 'topic', label: 'Topic', type: 'single', options: ['Only one'] },
      { id: 'topic', label: 'Duplicate', type: 'short' },
    ],
  }), { status: 400 });
});

test('answers enforce required fields and values from configured choices', () => {
  const { fields } = normalizeFormDefinition({
    title: 'Contact',
    fields: [
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'topics', label: 'Topics', type: 'multiple', required: true, options: ['AI', 'Video'] },
    ],
  });
  assert.throws(() => normalizeFormAnswers(fields, { email: 'person@example.com', topics: [] }), { status: 400 });
  assert.throws(() => normalizeFormAnswers(fields, { email: 'person@example.com', topics: ['Unknown'] }), { status: 400 });
  assert.deepEqual(normalizeFormAnswers(fields, { email: 'person@example.com', topics: ['AI'] }), {
    email: 'person@example.com',
    topics: ['AI'],
  });
});

test('phone answers are validated before they are stored', () => {
  const { fields } = normalizeFormDefinition({
    title: 'Contact',
    fields: [{ id: 'phone', label: 'Phone', type: 'phone', required: true }],
  });
  assert.throws(() => normalizeFormAnswers(fields, { phone: 'call me' }), { status: 400 });
  assert.deepEqual(normalizeFormAnswers(fields, { phone: '+91 98765-43210' }), { phone: '+91 98765-43210' });
});

test('answers reject malformed values instead of silently coercing them', () => {
  const { fields } = normalizeFormDefinition({
    title: 'Contact',
    fields: [{ id: 'email', label: 'Email', type: 'email', required: false }],
  });
  assert.throws(() => normalizeFormAnswers(fields, { email: { value: 'person@example.com' } }), { status: 400 });
});

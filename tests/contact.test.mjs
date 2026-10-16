import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleResume, emptyContact } from '../app/resume/contact.ts';
import { loadContact, saveContact, contactStorageKey } from '../app/resume/contact-storage.ts';

test('literal fields preserve display, order, optional blanks, and safe links', () => {
  const fields = { fullName: ' Alex  Morgan ', email: 'alex@example.com', linkedIn: 'linkedin.com/in/example', website: 'https://example.com/漢', phoneNumber: '+1 (555) 010-0142' };
  const result = assembleResume({ title: 'Engineer' }, fields);
  assert.equal(result.name, fields.fullName);
  assert.deepEqual(result.contact.map(row => row.text), [fields.email, fields.linkedIn, fields.website, fields.phoneNumber]);
  assert.deepEqual(result.contact.map(row => row.link), ['mailto:alex@example.com', 'https://linkedin.com/in/example', 'https://example.com/%E6%BC%A2', undefined]);
  assert.deepEqual(assembleResume({}, { ...emptyContact, fullName: 'Name', email: '  ' }).contact, []);
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/private', 'https://user:password@example.com', 'https://example.com\nattack', '[example](https://example.com)', 'available on request']) {
    assert.deepEqual(assembleResume({}, { ...emptyContact, website: value }).contact, [{ text: value }]);
  }
});

test('storage round trips a strict whitelist and cleared values', () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  assert.deepEqual(loadContact(storage), { fields: emptyContact, warning: '' });
  const fields = { ...emptyContact, fullName: 'Synthetic Name', email: 'name@example.com', resume: 'MUST NOT SAVE', company: 'MUST NOT SAVE' };
  assert.equal(saveContact(storage, fields), '');
  assert.deepEqual(JSON.parse(saved.get(contactStorageKey)), { version: 1, fields: { ...emptyContact, fullName: fields.fullName, email: fields.email } });
  assert.equal(loadContact(storage).fields.email, fields.email);
  saveContact(storage, emptyContact);
  assert.deepEqual(loadContact(storage).fields, emptyContact);
  saved.set(contactStorageKey, JSON.stringify({ version: 1, fields }));
  assert.deepEqual(Object.keys(loadContact(storage).fields), Object.keys(emptyContact));
});

test('unknown, corrupt, wrong-version and blocked storage warn without throwing', () => {
  for (const value of ['{', 'null', '[]', '{}', JSON.stringify({ version: 2, fields: emptyContact }), JSON.stringify({ version: 1, fields: { ...emptyContact, email: 12 } }), JSON.stringify({ version: 1, fields: {} })]) {
    const result = loadContact({ getItem: () => value });
    assert.deepEqual(result.fields, emptyContact);
    assert.ok(result.warning);
  }
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.ok(loadContact(blocked).warning);
  assert.ok(saveContact(blocked, emptyContact));
});

test('current contact fields override contact properties on a structurally compatible body', () => {
  const body = { title: 'Engineer', name: 'Old Name', contact: [{ text: 'old@example.com', link: 'mailto:old@example.com' }] };
  const result = assembleResume(body, { ...emptyContact, fullName: 'Current Name', email: 'current@example.com' });
  assert.equal(result.name, 'Current Name');
  assert.deepEqual(result.contact, [{ text: 'current@example.com', link: 'mailto:current@example.com' }]);
  assert.equal(result.title, 'Engineer');
  assert.deepEqual(assembleResume(body, { ...emptyContact, fullName: 'Current Name' }).contact, []);
});

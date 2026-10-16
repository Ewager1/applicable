import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleResume, emptyContact } from '../src/resume/contact.ts';
import { loadContact, saveContact, contactStorageKey } from '../src/resume/contact-storage.ts';

test('literal fields preserve display, order, optional blanks, and safe links', () => {
  const fields = {
    fullName: ' Alex  Morgan ',
    email: 'alex@example.com',
    linkedIn: 'linkedin.com/in/example',
    website: 'https://example.com/漢',
    phoneNumber: '+1 (555) 010-0142',
  };
  const result = assembleResume({ title: 'Engineer' }, fields);
  assert.equal(result.name, fields.fullName);
  assert.deepEqual(
    result.contact.map((row) => row.text),
    [fields.email, fields.linkedIn, fields.website, fields.phoneNumber],
  );
  assert.deepEqual(
    result.contact.map((row) => row.link),
    [
      'mailto:alex@example.com',
      'https://linkedin.com/in/example',
      'https://example.com/%E6%BC%A2',
      undefined,
    ],
  );
  assert.deepEqual(
    assembleResume({}, { ...emptyContact, fullName: 'Name', email: '  ' }).contact,
    [],
  );
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///tmp/private',
    'https://user:password@example.com',
    'https://example.com\nattack',
    '[example](https://example.com)',
    'available on request',
  ]) {
    assert.deepEqual(assembleResume({}, { ...emptyContact, website: value }).contact, [
      { text: value },
    ]);
  }
});

test('storage round trips a strict whitelist and cleared values', () => {
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  assert.deepEqual(loadContact(storage), { fields: emptyContact, warning: '' });
  const fields = {
    ...emptyContact,
    fullName: 'Synthetic Name',
    email: 'name@example.com',
    resume: 'MUST NOT SAVE',
    company: 'MUST NOT SAVE',
  };
  assert.equal(saveContact(storage, fields), '');
  assert.deepEqual(JSON.parse(saved.get(contactStorageKey)), {
    version: 1,
    fields: { ...emptyContact, fullName: fields.fullName, email: fields.email },
  });
  assert.equal(loadContact(storage).fields.email, fields.email);
  saveContact(storage, emptyContact);
  assert.deepEqual(loadContact(storage).fields, emptyContact);
  saved.set(contactStorageKey, JSON.stringify({ version: 1, fields }));
  assert.deepEqual(Object.keys(loadContact(storage).fields), Object.keys(emptyContact));
});

test('web links preserve scheme, host, credential and URL serialization boundaries', () => {
  const cases = [
    ['example.com', 'https://example.com/'],
    ['example.com/path?query=yes#section', 'https://example.com/path?query=yes#section'],
    ['https://example.com', 'https://example.com/'],
    ['HTTP://EXAMPLE.COM:80/path', 'http://example.com/path'],
    ['https://localhost/path', 'https://localhost/path'],
    ['localhost', undefined],
    ['  example.com  ', 'https://example.com/'],
    ['example.com/!', 'https://example.com/!'],
    ['example.com/\u001f', undefined],
    ['example.com/has space', undefined],
    ['example.com/\u007f', undefined],
    ['example.com/has\ttab', undefined],
    ['https://[::1]/', 'https://[::1]/'],
    ['https://[invalid]/', undefined],
    ['https://example.com:invalid', undefined],
    ['https://', undefined],
    ['//example.com', undefined],
    ['ftp://example.com', undefined],
    ['javascript:alert(1)', undefined],
    ['mailto:person@example.com', undefined],
    ['https://user@example.com', undefined],
    ['https://:password@example.com', undefined],
    ['user@example.com', undefined],
    ['https://@example.com', 'https://example.com/'],
  ];
  for (const [value, expectedLink] of cases) {
    for (const field of ['website', 'linkedIn']) {
      const [detail] = assembleResume({}, { ...emptyContact, [field]: value }).contact;
      assert.equal(detail.text, value);
      assert.equal(detail.link, expectedLink, `${field}: ${JSON.stringify(value)}`);
    }
  }
});

test('email links preserve explicit mailto and bare-address validation behavior', () => {
  const cases = [
    ['person@example.com', 'mailto:person@example.com'],
    ['  person@example.com  ', 'mailto:person@example.com'],
    ['Person+tag@EXAMPLE.COM', 'mailto:Person+tag@EXAMPLE.COM'],
    ['MAILTO:person@example.com', 'mailto:person@example.com'],
    ['mailto:person@example.com?subject=Hello', 'mailto:person@example.com?subject=Hello'],
    ['mailto:', 'mailto:'],
    ['person@localhost', 'mailto:person@localhost'],
    ['person@@example.com', undefined],
    ['person:password@example.com', undefined],
    ['@example.com', undefined],
    ['person@', undefined],
    ['https://example.com', undefined],
    ['person\u001f@example.com', undefined],
    ['person name@example.com', undefined],
    ['person\u007f@example.com', undefined],
  ];
  for (const [value, expectedLink] of cases) {
    const [detail] = assembleResume({}, { ...emptyContact, email: value }).contact;
    assert.equal(detail.text, value);
    assert.equal(detail.link, expectedLink, JSON.stringify(value));
  }
});

test('unknown, corrupt, wrong-version and blocked storage warn without throwing', () => {
  for (const value of [
    '{',
    'null',
    '[]',
    '{}',
    'false',
    '12',
    '"saved contact"',
    JSON.stringify({ version: 2, fields: emptyContact }),
    JSON.stringify({ version: 1 }),
    JSON.stringify({ version: 1, fields: null }),
    JSON.stringify({ version: 1, fields: false }),
    JSON.stringify({ version: 1, fields: 'contact' }),
    JSON.stringify({ version: 1, fields: [] }),
    JSON.stringify({ version: 1, fields: { ...emptyContact, email: 12 } }),
    JSON.stringify({ version: 1, fields: {} }),
  ]) {
    const result = loadContact({ getItem: () => value });
    assert.deepEqual(result.fields, emptyContact);
    assert.ok(result.warning);
  }
  const blocked = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.ok(loadContact(blocked).warning);
  assert.ok(saveContact(blocked, emptyContact));
});

test('current contact fields override contact properties on a structurally compatible body', () => {
  const body = {
    title: 'Engineer',
    name: 'Old Name',
    contact: [{ text: 'old@example.com', link: 'mailto:old@example.com' }],
  };
  const result = assembleResume(body, {
    ...emptyContact,
    fullName: 'Current Name',
    email: 'current@example.com',
  });
  assert.equal(result.name, 'Current Name');
  assert.deepEqual(result.contact, [
    { text: 'current@example.com', link: 'mailto:current@example.com' },
  ]);
  assert.equal(result.title, 'Engineer');
  assert.deepEqual(assembleResume(body, { ...emptyContact, fullName: 'Current Name' }).contact, []);
});

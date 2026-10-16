import test from 'node:test';
import assert from 'node:assert/strict';
import { contactDetails } from '../src/resume/contact.ts';
import { removeLegacyContact } from '../src/resume/contact-storage.ts';

test('literal fields preserve display, order, optional blanks, and safe links', () => {
  const fields = {
    email: 'alex@example.com',
    linkedin: 'linkedin.com/in/example',
    website: 'https://example.com/漢',
    phone: '+1 (555) 010-0142',
  };
  const result = contactDetails(fields);
  assert.deepEqual(
    result.map((row) => row.text),
    [fields.email, fields.linkedin, fields.website, fields.phone],
  );
  assert.deepEqual(
    result.map((row) => row.link),
    [
      'mailto:alex@example.com',
      'https://linkedin.com/in/example',
      'https://example.com/%E6%BC%A2',
      undefined,
    ],
  );
  assert.deepEqual(contactDetails({ email: '  ' }), []);
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///tmp/private',
    'https://user:password@example.com',
    'https://example.com\nattack',
    '[example](https://example.com)',
    'available on request',
  ]) {
    assert.deepEqual(contactDetails({ website: value }), [{ text: value }]);
  }
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
    for (const field of ['website', 'linkedin']) {
      const [detail] = contactDetails({ [field]: value });
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
    const [detail] = contactDetails({ email: value });
    assert.equal(detail.text, value);
    assert.equal(detail.link, expectedLink, JSON.stringify(value));
  }
});

test('legacy contact cleanup removes only its key, never reads or writes values, and tolerates failure', () => {
  const saved = new Map([
    ['applicable.contact.v1', 'synthetic legacy data'],
    ['unrelated', 'keep'],
  ]);
  const calls = [];
  removeLegacyContact({
    removeItem(key) {
      calls.push(key);
      saved.delete(key);
    },
    getItem() {
      assert.fail('Cleanup must never read saved values');
    },
    setItem() {
      assert.fail('Cleanup must never save values');
    },
  });
  assert.deepEqual(calls, ['applicable.contact.v1']);
  assert.deepEqual([...saved], [['unrelated', 'keep']]);
  assert.doesNotThrow(() =>
    removeLegacyContact({
      removeItem() {
        throw new Error('blocked');
      },
    }),
  );
});

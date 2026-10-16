const legacyContactStorageKey = 'applicable.contact.v1';

/** Migration only: never read/reuse old values or change unrelated storage. */
export function removeLegacyContact(storage: { removeItem(key: string): void }) {
  try {
    storage.removeItem(legacyContactStorageKey);
  } catch {
    // Unavailable storage must not block paste, validation or PDF generation.
  }
}

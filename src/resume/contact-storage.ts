import { contactKeys, emptyContact } from './contact.ts';
import type { ContactFields } from './types.ts';

export const contactStorageKey = 'applicable.contact.v1';
export interface ContactStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface ContactLoad {
  fields: ContactFields;
  warning: string;
}
export const savingWarning =
  'Contact details could not be saved in this browser. You can still edit them and create a PDF.';

/** Unknown JSON never crosses the typed boundary; extra keys are never hydrated. */
export function loadContact(storage: ContactStorage): ContactLoad {
  try {
    const saved = storage.getItem(contactStorageKey);
    if (saved === null) return { fields: { ...emptyContact }, warning: '' };
    const data: unknown = JSON.parse(saved);
    if (
      !data ||
      typeof data !== 'object' ||
      !('version' in data) ||
      data.version !== 1 ||
      !('fields' in data)
    )
      throw new Error('Invalid saved contact');
    const storedFields = data.fields;
    if (!storedFields || typeof storedFields !== 'object') throw new Error('Invalid saved contact');
    const fields = storedFields as Record<string, unknown>;
    const result = { ...emptyContact };
    for (const key of contactKeys) {
      if (!(key in fields) || typeof fields[key] !== 'string')
        throw new Error('Invalid saved contact field');
      result[key] = fields[key];
    }
    return { fields: result, warning: '' };
  } catch {
    return {
      fields: { ...emptyContact },
      warning:
        'Saved contact details could not be loaded. Enter them again; editing and PDF creation still work.',
    };
  }
}
export function saveContact(storage: ContactStorage, fields: ContactFields): string {
  try {
    const allowed = Object.fromEntries(contactKeys.map((key) => [key, fields[key]]));
    storage.setItem(contactStorageKey, JSON.stringify({ version: 1, fields: allowed }));
    return '';
  } catch {
    return savingWarning;
  }
}

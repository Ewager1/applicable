import { useState } from 'react';
import { emptyContact } from '../resume/contact.ts';
import { loadContact, saveContact, savingWarning } from '../resume/contact-storage.ts';
import type { ContactFields } from '../resume/types.ts';

export function useContactFields() {
  const [saved, setSaved] = useState(() => {
    try { return loadContact(window.localStorage); }
    catch { return { fields: { ...emptyContact }, warning: savingWarning }; }
  });
  function update(fields: ContactFields) {
    let warning;
    try { warning = saveContact(window.localStorage, fields); }
    catch { warning = savingWarning; }
    setSaved({ fields, warning });
  }
  return { ...saved, update };
}

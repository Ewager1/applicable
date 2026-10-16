import type { ContactDetail, ContactFields, Resume, ResumeBody } from './types.ts';

export const emptyContact: ContactFields = { fullName: '', email: '', linkedIn: '', website: '', phoneNumber: '' };
export const contactKeys = ['fullName', 'email', 'linkedIn', 'website', 'phoneNumber'] as const;

/** Link only recognized email/web destinations; all supplied display text stays literal. */
function safeLink(value: string, email = false): string | undefined {
  const destination = value.trim();
  if (!destination || /\s/.test(destination) || [...destination].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return;
  const candidate = email
    ? (/^mailto:/i.test(destination) ? destination : /^[^:@]+@[^@]+$/.test(destination) ? `mailto:${destination}` : '')
    : /^https?:\/\//i.test(destination) ? destination : /^[^:/?#]+\.[^:/?#]+(?:[/?#].*)?$/.test(destination) ? `https://${destination}` : '';
  if (!candidate) return;
  try {
    const url = new URL(candidate);
    if (email ? url.protocol !== 'mailto:' : !['https:', 'http:'].includes(url.protocol) || !url.hostname || !!url.username || !!url.password) return;
    return url.href;
  } catch { return; }
}

/** The validated body and current contact fields meet only at the PDF boundary. */
export function assembleResume(body: ResumeBody, fields: ContactFields): Resume {
  const contact: ContactDetail[] = [];
  for (const key of ['email', 'linkedIn', 'website', 'phoneNumber'] as const) {
    const text = fields[key];
    if (!text.trim()) continue;
    const link = key === 'phoneNumber' ? undefined : safeLink(text, key === 'email');
    contact.push(link ? { text, link } : { text });
  }
  return { ...body, name: fields.fullName, contact };
}

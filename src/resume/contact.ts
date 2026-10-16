import type { ContactDetail, ContactFields, Resume, ResumeBody } from './types.ts';

export const emptyContact: ContactFields = {
  fullName: '',
  email: '',
  linkedIn: '',
  website: '',
  phoneNumber: '',
};
export const contactKeys = ['fullName', 'email', 'linkedIn', 'website', 'phoneNumber'] as const;

const firstPrintableAsciiCode = 32;
const deleteControlCode = 127;

/** Link only recognized email/web destinations; all supplied display text stays literal. */
function safeLink(value: string, email = false): string | undefined {
  const destination = value.trim();
  if (
    !destination ||
    /\s/.test(destination) ||
    [...destination].some((character) => {
      const code = character.charCodeAt(0);
      return code < firstPrintableAsciiCode || code === deleteControlCode;
    })
  )
    return;
  let candidate = '';
  if (email) {
    if (/^mailto:/i.test(destination)) candidate = destination;
    else if (/^[^:@]+@[^@]+$/.test(destination)) candidate = `mailto:${destination}`;
  } else {
    if (/^https?:\/\//i.test(destination)) candidate = destination;
    // A dotted bare host may include a path, query or fragment, but no scheme.
    else if (/^[^:/?#]+\.[^:/?#]+(?:[/?#].*)?$/.test(destination))
      candidate = `https://${destination}`;
  }
  if (!candidate) return;
  try {
    const url = new URL(candidate);
    if (email) {
      if (url.protocol !== 'mailto:') return;
    } else if (
      !['https:', 'http:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return;
    return url.href;
  } catch {
    return;
  }
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

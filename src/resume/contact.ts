import type { ContactDetail } from './types.ts';

const firstPrintableAsciiCode = 32;
const deleteControlCode = 127;

/** Link only recognized email/web destinations; all supplied display text stays literal. */
export function safeLink(value: string, email = false): string | undefined {
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

/** Preserve the established header order independently of metadata field order. */
export function contactDetails(fields: {
  email?: string;
  linkedin?: string;
  website?: string;
  phone?: string;
}): ContactDetail[] {
  const contact: ContactDetail[] = [];
  for (const key of ['email', 'linkedin', 'website', 'phone'] as const) {
    const text = fields[key];
    if (!text?.trim()) continue;
    const link = key === 'phone' ? undefined : safeLink(text, key === 'email');
    contact.push(link ? { text, link } : { text });
  }
  return contact;
}

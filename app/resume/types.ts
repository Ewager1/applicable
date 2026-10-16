/** Canonical source-preserving contracts; parsing supplies runtime validation. */
export interface ContactDetail { text: string; link?: string }
export interface Job {
  employer: string;
  role: string;
  /** Supplied text; never interpreted or sorted. */
  dates: string;
  location: string;
  bullets: string[];
}
export interface EducationEntry { institution: string; qualification: string; dates: string }
export interface Certification { title: string; issuer: string; dates: string }
/** Comma-separated source text, preserving duplicates and order. */
export interface SkillCategory { category: string; items: string }
export interface Resume {
  name: string;
  contact: ContactDetail[];
  title: string;
  /** Paragraphs separated by two newlines. */
  summary: string;
  jobs: Job[];
  education: EducationEntry[];
  certifications: Certification[];
  skills: SkillCategory[];
}
export interface ValidationError { message: string; line: number | null }
export type ParseResult = { ok: true; resume: Resume } | { ok: false; errors: ValidationError[] };

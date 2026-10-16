// Deliberately synthetic. These objects are rendering inputs, not the future paste format.
const bullets = [
  'Built accessible application screens with JavaScript, reusable components, and careful keyboard interaction.',
  'Improved production reliability with focused automated tests, explicit error handling, and practical release checks.',
  'Worked with design and operations teams to translate complex requirements into clear, maintainable software.',
  'Investigated slow data flows and simplified integration boundaries while preserving existing user behavior.',
];
export function fixture(kind = 'typical') {
  const count = { short: 1, typical: 4, long: 12 }[kind];
  if (!count) throw new Error(`Unknown fixture: ${kind}`);
  return {
    name: 'Alex Morgan',
    contact: [
      { text: 'Portland, OR' },
      { text: '555-010-0142' },
      { text: 'alex@example.com', link: 'mailto:alex@example.com' },
      { text: 'example.com/alex', link: 'https://example.com/alex' },
    ],
    title: 'Full-Stack Software Engineer',
    summary:
      'Product-focused software engineer building reliable web applications and thoughtful interfaces. Experienced in JavaScript, testing, integrations, and translating requirements into useful tools. Preserves source wording: résumé, café, “quoted text”, and an em dash — intact.',
    jobs: Array.from({ length: count }, (_, i) => ({
      employer: `Example Organization ${i + 1}`,
      role: i === 0 ? 'Software Engineer' : 'Application Developer',
      dates: `${2025 - i} - ${2026 - i}`,
      location: i % 2 ? 'Remote' : 'Portland, OR',
      bullets: bullets
        .slice(0, kind === 'short' ? 2 : 4)
        .map((text, j) => `Project ${i + 1}.${j + 1}: ${text}`),
    })),
    education: [
      {
        institution: 'Example State University',
        qualification: 'Bachelor of Science, Computer Science',
        dates: '2015 - 2019',
      },
    ],
    certifications: [
      {
        title: 'Example Web Accessibility Certificate',
        dates: '2024',
        issuer: 'Example Learning Institute',
      },
    ],
    skills: [
      { category: 'Languages', items: 'JavaScript, TypeScript, Python, SQL' },
      { category: 'Frontend', items: 'HTML, CSS, accessible interfaces, component systems' },
      {
        category: 'Engineering',
        items: 'Automated testing, Git, continuous integration, API integration',
      },
    ],
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fixture } from './fixtures.mjs';
import { renderPdf } from './pdf.mjs';

const normalize = value => value.replace(/\s+/g, ' ').trim();
function expectedText(resume) {
  return [resume.name, ...resume.contact.map(item => item.text), resume.title, resume.summary,
    ...resume.jobs.flatMap(job => [job.employer, job.role, job.dates, job.location, ...job.bullets]),
    ...resume.education.flatMap(entry => Object.values(entry)), ...resume.certifications,
    ...resume.skills.flatMap(row => [`${row.category}:`, row.items])];
}
for (const [kind, expectedPages] of [['short', 1], ['typical', 2], ['long', 3]]) {
  test(`${kind}: complete selectable text, local fonts, links, bounds and pagination`, async () => {
    const resume = fixture(kind);
    const bytes = await renderPdf(resume);
    assert.ok(Buffer.from(bytes).toString('latin1').match(/\/FontFile2/g)?.length >= 3, 'All three TrueType weights are embedded');
    const pdf = await getDocument({ data: Uint8Array.from(bytes), useSystemFonts: false }).promise;
    try {
      assert.equal(pdf.numPages, expectedPages);
      const pageTexts = [];
      const links = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const { items, styles } = await page.getTextContent();
        assert.ok(items.some(item => item.str.trim()), 'No empty pages');
        assert.ok(Object.values(styles).every(style => style.fontFamily), 'PDF provides font mappings');
        pageTexts.push(normalize(items.map(item => item.str + (item.hasEOL ? '\n' : '')).join('')));
        for (const item of items.filter(item => item.str.trim())) {
          const x = item.transform[4];
          const y = item.transform[5];
          assert.ok(x >= 42 && x + item.width <= 570, `Horizontal clipping: ${item.str}`);
          assert.ok(y >= 42 && y <= 750, `Vertical clipping: ${item.str}`);
        }
        links.push(...(await page.getAnnotations()).filter(annotation => annotation.subtype === 'Link').map(annotation => annotation.url));
      }
      const allText = pageTexts.join(' ');
      for (const text of expectedText(resume)) assert.ok(allText.includes(normalize(text)), `Missing text: ${text}`);
      assert.deepEqual([...new Set(links)].sort(), ['https://example.com/alex', 'mailto:alex@example.com'].sort());
      let previousIndex = -1;
      for (const job of resume.jobs) {
        const index = allText.indexOf(job.employer);
        assert.ok(index > previousIndex, 'Preserve source job order');
        previousIndex = index;
        const headerPage = pageTexts.findIndex(text => text.includes(job.employer));
        assert.ok(pageTexts[headerPage].includes(`Project ${resume.jobs.indexOf(job) + 1}.1:`), `Orphaned job header: ${job.employer}`);
      }
      for (const [heading, following] of [['RELEVANT EXPERIENCE', resume.jobs[0].employer], ['EDUCATION', resume.education[0].institution], ['CERTIFICATIONS', resume.certifications[0]], ['SKILLS', 'Languages:']]) {
        const page = pageTexts.find(text => text.includes(heading));
        assert.ok(page?.includes(following), `Orphaned section: ${heading}`);
      }
    } finally { await pdf.destroy(); }
  });
}

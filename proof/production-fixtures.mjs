import { readFile } from 'node:fs/promises';
import { parseResume } from '../app/resume/parse.ts';
const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
export const parsedExample = parseResume(source).resume;
export function stressFixture(kind) {
  const resume = structuredClone(parsedExample);
  resume.jobs = [resume.jobs[0]];
  if (kind === 'split-job') {
    resume.jobs[0].bullets = Array.from({ length: 24 }, (_, i) => `Bullet ${i + 1}: Built accessible interfaces and reliable application workflows. Verified wording and operations with focused automated tests.`);
  } else if (kind === 'multi-page-bullet') {
    resume.jobs[0].bullets = [`Beginning of one long bullet. ${'Maintained reliable interfaces and accessible workflows with automated checks. '.repeat(150)}End of the same long bullet.`];
  } else if (kind === 'long-values') {
    resume.jobs[0].employer = 'Long Organization Name '.repeat(10).trim();
    resume.jobs[0].role = 'Long Application Engineering Role '.repeat(6).trim();
    resume.jobs[0].dates = 'An intentionally long supplied date description '.repeat(4).trim();
    resume.jobs[0].location = 'An intentionally long supplied location '.repeat(5).trim();
    resume.jobs[0].bullets.push('LongToken' + 'ABCDEFGH'.repeat(70));
    resume.education[0].qualification = 'An intentionally long qualification name '.repeat(8).trim();
    resume.certifications[0].title = 'An intentionally long certificate title '.repeat(8).trim();
    resume.certifications[0].dates = 'A long supplied certification date '.repeat(4).trim();
    resume.skills.push({ category: 'Long category name '.repeat(4).trim(), items: 'LongSkill' + 'JKLMNOP'.repeat(70) });
  } else throw new Error(`Unknown stress fixture: ${kind}`);
  return resume;
}

// Stable answer keys are shared by the questionnaire and local setup prompt.
export interface ResumeWriterAnswers {
  interestedJobs: string;
  everydayWork: string;
  accomplishments: string;
  measurableResults: string;
  unexplainedSkills: string;
  avoidOverstatement: string;
  helpingOthers: string;
  collaboration: string;
  leadership: string;
  familiarCommunities: string;
  otherExperience: string;
  additionalContext: string;
}

interface BackgroundQuestion {
  key: keyof ResumeWriterAnswers;
  label: string;
  example: string;
}

export const mainQuestions: BackgroundQuestion[] = [
  {
    key: 'interestedJobs',
    label: 'What kinds of jobs are you interested in?',
    example:
      'Medical office coordinator or customer support. I enjoy helping people and organizing schedules; I would prefer to avoid overnight shifts.',
  },
  {
    key: 'everydayWork',
    label: 'What did you actually spend your time doing in your most important jobs?',
    example:
      'At the repair shop, I diagnosed equipment problems, ordered parts, and explained repairs to customers. I also kept track of unfinished jobs.',
  },
  {
    key: 'accomplishments',
    label: 'What professional accomplishments are you most proud of?',
    example:
      'I reorganized our stockroom so coworkers could find supplies, trained new servers, or helped launch a community program.',
  },
  {
    key: 'measurableResults',
    label: 'Did your work produce any measurable results?',
    example:
      'Our checklist saved an estimated two hours a week. Other results might include sales, fewer errors, customer satisfaction, or more orders completed. Only include reasonably supported numbers, and keep estimates labeled as estimates. No numbers is fine too.',
  },
  {
    key: 'unexplainedSkills',
    label: "Are there skills or responsibilities your resume doesn't fully explain?",
    example:
      'I used spreadsheets to track deliveries, translated instructions for customers, or applied food-safety procedures during every shift.',
  },
  {
    key: 'avoidOverstatement',
    label: 'Is there anything your Resume Writer should be careful not to overstate?',
    example:
      'I helped with the website but did not lead the project. I tried Python in one class, and my forklift certification has expired.',
  },
];

export const additionalQuestions: BackgroundQuestion[] = [
  {
    key: 'helpingOthers',
    label: "When have you made another person's work easier?",
    example: 'I wrote opening instructions so substitute teachers could settle in quickly.',
  },
  {
    key: 'collaboration',
    label: 'Who did you collaborate with, and what did you do together?',
    example:
      'I coordinated with nurses, reception staff, and patients to resolve scheduling issues.',
  },
  {
    key: 'leadership',
    label: 'When have you taken ownership or guided others, even without a management title?',
    example: 'I showed new warehouse teammates our safety routine and handled shift handoffs.',
  },
  {
    key: 'familiarCommunities',
    label: 'Which industries, customers, or communities do you understand well?',
    example: 'I know the needs of local small businesses, first-time homebuyers, or older adults.',
  },
  {
    key: 'otherExperience',
    label: 'What useful experience is missing from your resume?',
    example:
      'Volunteering at a food pantry, freelance bookkeeping, a school project, or repairing bicycles as a hobby.',
  },
  {
    key: 'additionalContext',
    label: 'What else would you like your Resume Writer to understand?',
    example:
      'I am returning to work after caregiving and would like to explain my transferable skills.',
  },
];

export const emptyResumeWriterAnswers: ResumeWriterAnswers = {
  interestedJobs: '',
  everydayWork: '',
  accomplishments: '',
  measurableResults: '',
  unexplainedSkills: '',
  avoidOverstatement: '',
  helpingOthers: '',
  collaboration: '',
  leadership: '',
  familiarCommunities: '',
  otherExperience: '',
  additionalContext: '',
};

/** Option lists + declaration copy mirrored from design/data.js. */

export const COUNTRIES = [
  'Ethiopia',
  'United Kingdom',
  'United States',
  'United Arab Emirates',
  'Kenya',
  'Canada',
  'Germany',
  'South Africa',
  'India',
  'Other',
];

export const TITLES = ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.', 'Ato', 'W/ro'];
export const GENDERS = ['Female', 'Male'];

/** Known referee relationships (searchable; applicants can also enter a custom one). */
export const REF_RELATIONSHIPS = [
  'Current manager / supervisor',
  'Former manager / supervisor',
  'Board chair',
  'Board colleague',
  'Professional colleague / peer',
  'Direct report',
  'Business partner',
  'Client',
  'Academic mentor / supervisor',
  'Mentor',
  'Industry peer',
];

/** Degree level (Nomination Procedure §4.1.1 requires at least a Master's). */
export const DEGREE_OPTIONS = [
  'Doctorate (PhD)',
  "Master's Degree",
  "Bachelor's Degree",
  'Diploma',
  'Other',
];

/** Minimum eligible degree level (Master's). Mirrors the backend. */
export const MIN_DEGREE_LEVEL = 3;

/** 4 doctorate · 3 master's · 2 bachelor's · 1 diploma · 0 none — handles the
 *  dropdown labels and any legacy free-text degree. */
export function degreeLevel(text?: string | null): number {
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) return 0;
  if (/phd|ph\.?d|doctor|dba|d\.?phil|dphil/.test(t)) return 4;
  if (/master|msc|m\.?sc|mba|m\.?b\.?a|\bma\b|llm|m\.?phil|mphil|postgrad/.test(t)) return 3;
  if (/bachelor|bsc|b\.?sc|\bba\b|llb|b\.?a\b|undergrad/.test(t)) return 2;
  if (/diploma|certificate|\bcert\b/.test(t)) return 1;
  return 0;
}
/** Minimum professional experience (Nomination Procedure §4.1.2). Mirrors backend. */
export const MIN_EXPERIENCE_YEARS = 10;

function parseMonth(s?: string | null): Date | null {
  if (!s) return null;
  const parts = s.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1] ?? '1');
  if (!y) return null;
  return new Date(y, (m || 1) - 1, 1);
}

interface ExperienceEntry {
  fromMonth?: string | null;
  toMonth?: string | null;
  isCurrent?: boolean;
}

/** Total professional experience in whole years (sum of each position's span;
 *  current/open-ended positions run to now). Mirrors the backend. */
export function totalExperienceYears(entries: ExperienceEntry[]): number {
  const now = new Date();
  let months = 0;
  for (const e of entries ?? []) {
    const start = parseMonth(e.fromMonth);
    if (!start) continue;
    const end = e.isCurrent ? now : parseMonth(e.toMonth) ?? now;
    const m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (m > 0) months += m;
  }
  return Math.floor(months / 12);
}

/**
 * Field-of-study relevance (Nomination Procedure §4.1.1): the qualifying degree
 * must be in a field related to banking, accounting, auditing, finance, business
 * management, economics, law, technology — "and related fields". Mirrors backend.
 */
export const RELEVANT_FIELDS_LABEL =
  'banking, finance, accounting, auditing, business management, economics, law, or technology (or a related field)';

/** Suggestions surfaced in the field-of-study datalist. */
export const FIELD_SUGGESTIONS = [
  'Banking',
  'Finance',
  'Accounting',
  'Auditing',
  'Business Management',
  'Business Administration',
  'Economics',
  'Law',
  'Information Technology',
  'Risk Management',
  'Investment Management',
  'Insurance',
  'Actuarial Science',
];

const RELEVANT_FIELD_RE =
  /bank|financ|fintech|account|audit|business|administ|\bmba\b|manage|econom|\blaw\b|legal|jurisprud|technolog|\bit\b|informat|comput|software|\bdata\b|engineer|commerc|actuar|insur|\brisk\b|investment|statistic|mathemat|quantitat|govern|relat/i;

/** True when a free-text / selected field of study counts as relevant under §4.1.1. */
export function isRelevantField(text?: string | null): boolean {
  const t = (text ?? '').trim();
  return t.length > 0 && RELEVANT_FIELD_RE.test(t);
}

/** §4.2 Desirable Criteria — considered by the NRC, not mandatory. */
export const DESIRABLE_CRITERIA = [
  'Experience as a Board member with a shareholder-value-creation record',
  'Financial services experience',
  'Commitment to corporate governance',
  'Strategic mindset and analytical skills',
  'Strong interpersonal and teamwork skills',
];

/**
 * Basic & mandatory eligibility requirements for the Independent Director role
 * (Nomination Procedure §4.1; Banking Business Proclamation No. 1360/2025).
 * Shown on the public landing page and acknowledged before account creation.
 * These mirror the hard rules the server enforces at submission (validateForSubmit).
 */
export const MANDATORY_REQUIREMENTS: { title: string; detail: string }[] = [
  {
    title: 'Master’s degree or higher',
    detail:
      'A Master’s degree (MSc) or above in banking, finance, accounting, auditing, business management, economics, law, or technology (or a related field).',
  },
  {
    title: 'Ten (10)+ years of experience',
    detail: 'A minimum of ten years of relevant professional experience, evidenced by your employment history.',
  },
  {
    title: 'Independence from Zemen Bank',
    detail:
      'You must be independent of Zemen Bank’s ownership and management — not a shareholder, director, CEO, or senior executive of the Bank (nor a first-degree relative of one), with no significant business, legal, or financial ties to the Bank.',
  },
  {
    title: 'Fit & proper standing',
    detail:
      'At least 18 years of age, of good reputation, and with no record that would disqualify you from serving as a director.',
  },
  {
    title: 'Supporting documents',
    detail:
      'A CV, educational certificates, evidence of experience, a National ID or passport, TIN, and a recent photo (PDF/image).',
  },
];

/**
 * The governing National Bank of Ethiopia directive on the eligibility of
 * persons with significant influence in a bank (directors included), linked
 * from the landing page and the pre-registration gate.
 */
export const NBE_PROCLAMATION_LABEL =
  'NBE Directive No. SBB/89/2024 — Requirements for Persons with Significant Influence in a Bank';
export const NBE_PROCLAMATION_URL =
  'https://nbe.gov.et/wp-content/uploads/2024/06/SBB892024-FREQUIREMENTS-FOR-PERSONS-WITH-SIGNIFICANT-INFLUENCE-IN-A-BANK.pdf';

export const BOARD_TYPES = [
  'Listed company',
  'Financial institution',
  'Private company',
  'Public enterprise',
  'Non-profit / NGO',
];

/** Areas of expertise (must match backend EXPERTISE_OPTIONS exactly). */
export const EXPERTISE = [
  'Corporate Governance',
  'Banking & Finance',
  'Risk Management',
  'Audit & Assurance',
  'Legal & Compliance',
  'Information Technology',
  'Digital Transformation',
  'Strategy',
  'Human Capital',
  'ESG & Sustainability',
  'Economics',
  'Marketing',
];

export interface DeclarationItemDef {
  id: string;
  q: string;
}
export interface DeclarationGroup {
  group: string;
  items: DeclarationItemDef[];
}

/** Fit & Proper / Independence declarations. A "Yes" on any item raises a flag. */
export const DECLARATIONS: DeclarationGroup[] = [
  {
    group: 'A. Independence from Ownership and Management',
    items: [
      {
        id: 'a1',
        q: 'I am currently a direct or indirect shareholder, director, Chief Executive Officer, or senior executive officer of Zemen Bank.',
      },
      {
        id: 'a2',
        q: 'I am a spouse or a first-degree relative (consanguinity or affinity) of a shareholder, director, CEO, or senior executive officer of Zemen Bank.',
      },
      {
        id: 'a3',
        q: 'I am part of Zemen Bank’s senior management or involved in its day-to-day operational management.',
      },
    ],
  },
  {
    group: 'B. Relationships with Zemen Bank or Related Entities',
    items: [
      {
        id: 'b1',
        q: 'I currently have, or have had in the last two (2) years, any business, professional, or commercial relationship with Zemen Bank.',
      },
      {
        id: 'b2',
        q: 'I am a shareholder, director, CEO, or senior executive officer of any company that has contractual obligations with Zemen Bank.',
      },
    ],
  },
  {
    group: 'C. Legal and Dispute Status',
    items: [
      {
        id: 'c1',
        q: 'I am currently involved, directly or indirectly, in any legal proceedings or out-of-court disputes against Zemen Bank, its parent undertaking, or its subsidiaries.',
      },
    ],
  },
  {
    group: 'D. Financial Exposure',
    items: [
      {
        id: 'd1',
        q: 'I have financial obligations to Zemen Bank with a total outstanding amount exceeding Birr 50 million.',
      },
    ],
  },
];

export const ALL_DECL_IDS = DECLARATIONS.flatMap((g) => g.items.map((i) => i.id));

export interface DocTypeDef {
  id: string;
  label: string;
  req: boolean;
  hint?: string;
}

/**
 * Standalone supporting document slots shown on the Documents step. * = required.
 * PDF files only. Educational certificates and work-experience documents are NOT
 * here — they're uploaded inline against each degree / position. The profile photo
 * is uploaded on the Personal step.
 */
export const DOC_TYPES: DocTypeDef[] = [
  { id: 'cv', label: 'Curriculum Vitae (CV)', req: true },
  { id: 'prof', label: 'Professional certificates', req: false },
  { id: 'id', label: 'National ID / Passport', req: true },
  { id: 'tin', label: 'Tax Identification (TIN)', req: true },
  { id: 'rec', label: 'Recommendation letters', req: false },
  {
    id: 'other',
    label: 'Other supporting documents',
    req: false,
    hint: 'Give each file a clear, descriptive name that explains the document — e.g. “Board-Resolution-Awash-2023.pdf”, not “scan001.pdf”.',
  },
];

export const REQUIRED_DOC_TYPES = DOC_TYPES.filter((d) => d.req).map((d) => d.id);

/** Full label map for displaying ANY document type, including the inline ones. */
export const ALL_DOC_LABELS: Record<string, string> = {
  photo: 'Profile photo',
  cv: 'Curriculum Vitae (CV)',
  edu: 'Educational certificate',
  work: 'Work experience document',
  prof: 'Professional certificates',
  id: 'National ID / Passport',
  tin: 'Tax Identification (TIN)',
  rec: 'Recommendation letters',
  other: 'Other supporting documents',
};

/** Stable display order for grouped document views. */
export const DOC_DISPLAY_ORDER = ['photo', 'cv', 'edu', 'work', 'prof', 'id', 'tin', 'rec', 'other'];

/**
 * NRC evaluation rubric from the Independent Directors' Nomination Procedure (2026):
 * Document Evaluation (50%) + Interview (50%). Each criterion is scored 1–10 points;
 * weighted = value/10 × weight. Total /100.
 */
export const SCORE_MAX = 10;

export interface Criterion {
  id: string;
  label: string;
  weight: number;
  group: 'document' | 'interview';
}

export const CRITERIA: Criterion[] = [
  { id: 'education', label: 'Education', weight: 10, group: 'document' },
  { id: 'work_experience', label: 'Work Experience', weight: 15, group: 'document' },
  { id: 'board_experience', label: 'Board Experience', weight: 10, group: 'document' },
  { id: 'testimonials', label: 'Testimonials', weight: 5, group: 'document' },
  { id: 'certifications', label: 'Certifications', weight: 10, group: 'document' },
  { id: 'leadership', label: 'Leadership Competency', weight: 20, group: 'interview' },
  { id: 'banking_understanding', label: 'Banking Business Understanding', weight: 15, group: 'interview' },
  { id: 'impact_plan', label: 'Impact Plan', weight: 15, group: 'interview' },
];

export const CRITERIA_GROUPS: { key: 'document' | 'interview'; label: string }[] = [
  { key: 'document', label: 'Document Evaluation · 50%' },
  { key: 'interview', label: 'Interview · 50%' },
];

export const docLabel = (id: string): string => ALL_DOC_LABELS[id] ?? id;

/** Score → pill class (hi ≥80 / mid ≥65 / lo / none). */
export const scoreClass = (s: number | null): 'hi' | 'mid' | 'lo' | 'none' =>
  s == null ? 'none' : s >= 80 ? 'hi' : s >= 65 ? 'mid' : 'lo';

/** Accepted upload types (mirrors backend ALLOWED_MIME_TYPES) + size limit. PDF only. */
export const ACCEPTED_UPLOAD = '.pdf';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Profile photo uploads accept common image formats (mirrors backend IMAGE_MIME_TYPES). */
export const ACCEPTED_PHOTO = 'image/png,image/jpeg,image/webp';
export const PHOTO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Email + phone validators shared across the wizard. */
export const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum applicant age. */
export const MIN_AGE_YEARS = 18;

/** Latest date of birth allowed (today minus MIN_AGE_YEARS), as YYYY-MM-DD. */
export function maxDobIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d.toISOString().slice(0, 10);
}

/** Date-of-birth validation: required + at least MIN_AGE_YEARS old. */
export function ageError(dob: string, required = true): string | undefined {
  const v = (dob ?? '').trim();
  if (!v) return required ? 'Required' : undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'Enter a valid date of birth';
  const today = new Date();
  if (d > today) return 'Date of birth cannot be in the future';
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  if (age < MIN_AGE_YEARS) return `Applicant must be at least ${MIN_AGE_YEARS} years old.`;
  return undefined;
}

/**
 * Phone validation. Ethiopian numbers must be +251 followed by 7 or 9 then 8
 * digits (e.g. +251912345678); other countries accept a general + international form.
 */
export function phoneError(phone: string, required = true): string | undefined {
  const p = (phone ?? '').trim();
  if (!p) return required ? 'Required' : undefined;
  if (p.startsWith('+251')) {
    return /^\+251[79]\d{8}$/.test(p)
      ? undefined
      : 'Ethiopian numbers must be +251 then 7 or 9 and 8 digits (e.g. +251912345678).';
  }
  return /^\+\d{7,15}$/.test(p) ? undefined : 'Enter a valid number starting with + (e.g. +251912345678).';
}

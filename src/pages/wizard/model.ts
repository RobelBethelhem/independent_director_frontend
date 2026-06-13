import type { Application } from '../../lib/types';
import { ALL_DECL_IDS } from '../../lib/constants';

/** Stable client-generated id (kept across PUT-replace so per-entry documents stay linked). */
function uid(): string {
  // crypto.randomUUID is available in all supported browsers; fall back just in case.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Editable, fully-populated local shapes (no nulls) for the wizard forms. */
export interface EduForm {
  id: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}
export interface ProfForm {
  name: string;
  body: string;
  year: string;
}
export interface EmpForm {
  id: string;
  org: string;
  role: string;
  fromMonth: string;
  toMonth: string;
  isCurrent: boolean;
  summary: string;
}
export interface BoardForm {
  org: string;
  position: string;
  type: string;
  fromMonth: string;
  toMonth: string;
  isCurrent: boolean;
}
export interface RefForm {
  name: string;
  positionOrg: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface WizardForm {
  // Step 1 (already handled, kept for completeness)
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  // Collections
  education: EduForm[];
  professionalQuals: ProfForm[];
  employment: EmpForm[];
  boards: BoardForm[];
  references: RefForm[];
  expertise: string[];
  conflictsText: string;
  declarations: Record<string, 'yes' | 'no'>;
  declExplain: Record<string, string>;
}

export const blankEdu = (): EduForm => ({ id: uid(), degree: '', field: '', institution: '', year: '' });
export const blankProf = (): ProfForm => ({ name: '', body: '', year: '' });
export const blankEmp = (): EmpForm => ({
  id: uid(),
  org: '',
  role: '',
  fromMonth: '',
  toMonth: '',
  isCurrent: false,
  summary: '',
});
export const blankBoard = (): BoardForm => ({ org: '', position: '', type: '', fromMonth: '', toMonth: '', isCurrent: false });
export const blankRef = (): RefForm => ({ name: '', positionOrg: '', email: '', phone: '', relationship: '' });

const s = (v: string | null | undefined) => v ?? '';

/** Pad a list up to `min` blank entries so required-minimum cards always render. */
function padTo<T>(items: T[], min: number, blank: () => T): T[] {
  const out = [...items];
  while (out.length < min) out.push(blank());
  return out;
}

/** Build the editable form from a loaded Application, enforcing minimum entry counts. */
export function hydrate(app: Application): WizardForm {
  const declarations: Record<string, 'yes' | 'no'> = {};
  const declExplain: Record<string, string> = {};
  for (const d of app.declarations ?? []) {
    declarations[d.itemId] = d.answer;
    if (d.explanation) declExplain[d.itemId] = d.explanation;
  }

  return {
    title: s(app.title),
    firstName: s(app.firstName),
    middleName: s(app.middleName),
    lastName: s(app.lastName),
    dob: s(app.dob),
    gender: s(app.gender),
    nationality: s(app.nationality),
    email: s(app.email),
    phone: s(app.phone),
    country: s(app.country),
    city: s(app.city),
    address: s(app.address),
    education: padTo(
      (app.education ?? []).map((e) => ({
        id: e.id ?? uid(),
        degree: s(e.degree),
        field: s(e.field),
        institution: s(e.institution),
        year: s(e.year),
      })),
      1,
      blankEdu,
    ),
    professionalQuals: (app.professionalQuals ?? []).map((p) => ({
      name: s(p.name),
      body: s(p.body),
      year: s(p.year),
    })),
    employment: padTo(
      (app.employment ?? []).map((e) => ({
        id: e.id ?? uid(),
        org: s(e.org),
        role: s(e.role),
        fromMonth: s(e.fromMonth),
        toMonth: s(e.toMonth),
        isCurrent: !!e.isCurrent,
        summary: s(e.summary),
      })),
      1,
      blankEmp,
    ),
    boards: (app.boards ?? []).map((b) => ({
      org: s(b.org),
      position: s(b.position),
      type: s(b.type),
      fromMonth: s(b.fromMonth),
      toMonth: s(b.toMonth),
      isCurrent: !!b.isCurrent,
    })),
    references: padTo(
      (app.references ?? []).map((r) => ({
        name: s(r.name),
        positionOrg: s(r.positionOrg),
        email: s(r.email),
        phone: s(r.phone),
        relationship: s(r.relationship),
      })),
      2,
      blankRef,
    ),
    expertise: (app.expertise ?? []).map((x) => x.value),
    conflictsText: s(app.conflictsText),
    declarations,
    declExplain,
  };
}

/** Serialize the declaration maps into the API's items payload (answered items only). */
export function serializeDeclarations(form: WizardForm) {
  return ALL_DECL_IDS.filter((id) => form.declarations[id]).map((id) => ({
    itemId: id,
    answer: form.declarations[id],
    explanation: form.declarations[id] === 'yes' ? form.declExplain[id] ?? '' : undefined,
  }));
}

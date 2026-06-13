import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { Field, Input, Select, Textarea } from '../../components/ui';
import { CountrySelect } from '../../components/CountrySelect';
import { SearchSelect } from '../../components/SearchSelect';
import { Chips, EntryList, SectionBlock, YesNo } from '../../components/wizard-ui';
import { EntryDocUpload, PhotoUpload } from '../../components/EntryDocUpload';
import type { DocLink, DocumentRecord } from '../../lib/documents-api';
import {
  ALL_DECL_IDS,
  BOARD_TYPES,
  DECLARATIONS,
  DEGREE_OPTIONS,
  DESIRABLE_CRITERIA,
  EXPERTISE,
  FIELD_SUGGESTIONS,
  GENDERS,
  REF_RELATIONSHIPS,
  TITLES,
  maxDobIso,
  totalExperienceYears,
} from '../../lib/constants';
import {
  blankBoard,
  blankEdu,
  blankEmp,
  blankProf,
  blankRef,
  type WizardForm,
} from './model';

export type Update = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;

interface StepProps {
  form: WizardForm;
  update: Update;
  errors?: Record<string, string>;
}

/** Document upload handlers shared by the education / employment steps. */
export interface DocStepProps {
  documents: DocumentRecord[];
  onUpload: (docType: string, file: File, onProgress: (pct: number) => void, link?: DocLink) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
  onPreview: (docId: string) => void;
}

/** Profile-photo handlers for the personal step. */
export interface PhotoStepProps {
  photo: DocumentRecord | null;
  onUploadPhoto: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  onRemovePhoto: () => Promise<void>;
  loadPhotoThumb: (docId: string) => Promise<string>;
}

/* ---------------- Step 1: Personal & Contact ---------------- */
export function StepPersonal({
  form,
  update,
  errors = {},
  photo,
  onUploadPhoto,
  onRemovePhoto,
  loadPhotoThumb,
}: StepProps & PhotoStepProps) {
  return (
    <div>
      <SectionBlock title="Profile photo" first>
        <p className="wiz-sub" style={{ marginTop: -6, marginBottom: 14 }}>
          Upload a recent photo of yourself. It is shown to the Nomination &amp; Governance Committee with your
          application.
        </p>
        <PhotoUpload
          currentDoc={photo}
          onUpload={onUploadPhoto}
          onRemove={onRemovePhoto}
          loadThumb={loadPhotoThumb}
        />
        {errors.photo && (
          <div className="errmsg" style={{ marginTop: 8 }}>
            {errors.photo}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Personal information">
        <div className="grid-3">
          <Field label="Title">
            <Select value={form.title} onChange={(e) => update('title', e.target.value)} options={TITLES} placeholder="Select" />
          </Field>
          <Field label="First name" required error={errors.firstName}>
            <Input value={form.firstName} invalid={!!errors.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="e.g. Selamawit" />
          </Field>
          <Field label="Middle name" required error={errors.middleName}>
            <Input value={form.middleName} invalid={!!errors.middleName} onChange={(e) => update('middleName', e.target.value)} placeholder="e.g. Haile" />
          </Field>
          <Field label="Last name" required error={errors.lastName}>
            <Input value={form.lastName} invalid={!!errors.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="e.g. Bekele" />
          </Field>
          <Field label="Date of birth" required hint="You must be at least 18 years old" error={errors.dob}>
            <Input
              type="date"
              value={form.dob}
              max={maxDobIso()}
              invalid={!!errors.dob}
              onChange={(e) => update('dob', e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => update('gender', e.target.value)} options={GENDERS} placeholder="Select" />
          </Field>
          <Field label="Nationality" required error={errors.nationality}>
            <CountrySelect value={form.nationality} invalid={!!errors.nationality} onChange={(v) => update('nationality', v)} placeholder="Select nationality" />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Contact details">
        <div className="grid-2">
          <Field label="Email address" required hint="Used for all official correspondence" error={errors.email}>
            <Input type="email" value={form.email} invalid={!!errors.email} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Mobile number" required error={errors.phone}>
            <Input value={form.phone} invalid={!!errors.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+251 ..." />
          </Field>
          <Field label="Country of residence" required error={errors.country}>
            <CountrySelect value={form.country} invalid={!!errors.country} onChange={(v) => update('country', v)} placeholder="Select country" />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Addis Ababa" />
          </Field>
          <div className="col-span">
            <Field label="Residential address">
              <Textarea value={form.address} rows={2} onChange={(e) => update('address', e.target.value)} placeholder="Street, sub-city, postal code" />
            </Field>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

/* ---------------- Step 2: Education & Qualifications ---------------- */
export function StepEducation({
  form,
  update,
  errors = {},
  documents,
  onUpload,
  onRemove,
  onPreview,
}: StepProps & DocStepProps) {
  const errs = Object.values(errors);
  return (
    <div>
      <datalist id="field-suggestions">
        {FIELD_SUGGESTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      {errs.length > 0 && (
        <div className="indep-banner flag" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
          <TriangleAlert size={18} />
          <ul style={{ margin: 0, paddingLeft: 18, fontWeight: 500 }}>
            {errs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <SectionBlock title="Educational qualifications" first>
        <p className="wiz-sub" style={{ marginTop: -6, marginBottom: 16 }}>
          A <b>Master’s degree (MSc) or higher is required</b> to be eligible as an Independent Director.
        </p>
        <EntryList
          items={form.education}
          onChange={(v) => update('education', v)}
          blank={blankEdu}
          min={1}
          addLabel="Add qualification"
          render={(it, _i, set) => {
            const doc = documents.find((d) => d.docType === 'edu' && d.educationEntryId === it.id) ?? null;
            return (
              <div>
                <div className="grid-2">
                  <Field label="Degree level" required>
                    <Select value={it.degree} onChange={(e) => set({ degree: e.target.value })} options={DEGREE_OPTIONS} placeholder="Select degree level" />
                  </Field>
                  <Field label="Field of study" required hint="Must relate to banking, finance, law, economics, business, accounting, auditing or technology (§4.1.1)">
                    <Input
                      value={it.field}
                      list="field-suggestions"
                      onChange={(e) => set({ field: e.target.value })}
                      placeholder="e.g. Finance, Law, Economics"
                    />
                  </Field>
                  <Field label="Institution">
                    <Input value={it.institution} onChange={(e) => set({ institution: e.target.value })} placeholder="University / College" />
                  </Field>
                  <Field label="Year completed">
                    <Input value={it.year} onChange={(e) => set({ year: e.target.value })} placeholder="YYYY" />
                  </Field>
                </div>
                <Field label="Certificate" required hint="Upload the certificate / award for this qualification (PDF).">
                  <EntryDocUpload
                    currentDoc={doc}
                    label="certificate"
                    required
                    onUpload={(file, onProgress) =>
                      onUpload('edu', file, onProgress, { educationEntryId: it.id })
                    }
                    onRemove={() => (doc ? onRemove(doc.id) : Promise.resolve())}
                    onPreview={onPreview}
                  />
                </Field>
              </div>
            );
          }}
        />
      </SectionBlock>

      <SectionBlock title="Professional Qualifications & Certificates">
        <EntryList
          items={form.professionalQuals}
          onChange={(v) => update('professionalQuals', v)}
          blank={blankProf}
          addLabel="Add professional qualification"
          render={(it, _i, set) => (
            <div className="grid-3">
              <Field label="Designation / Certification">
                <Input value={it.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. CPA, CFA" />
              </Field>
              <Field label="Awarding body">
                <Input value={it.body} onChange={(e) => set({ body: e.target.value })} placeholder="Institute / Association" />
              </Field>
              <Field label="Year">
                <Input value={it.year} onChange={(e) => set({ year: e.target.value })} placeholder="YYYY" />
              </Field>
            </div>
          )}
        />
      </SectionBlock>
    </div>
  );
}

/* ---------------- Step 3: Employment History ---------------- */
export function StepEmployment({
  form,
  update,
  errors = {},
  documents,
  onUpload,
  onRemove,
  onPreview,
}: StepProps & DocStepProps) {
  const errs = Object.values(errors);
  const years = totalExperienceYears(form.employment);
  return (
    <div>
      {errs.length > 0 && (
        <div className="indep-banner flag" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
          <TriangleAlert size={18} />
          <ul style={{ margin: 0, paddingLeft: 18, fontWeight: 500 }}>
            {errs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <SectionBlock title="Employment history" first>
        <p className="wiz-sub" style={{ marginTop: -6, marginBottom: 16 }}>
          A minimum of <b>ten (10) years of professional experience</b> is required to be eligible as an
          Independent Director. List your positions, starting with the current or latest — total so far:{' '}
          <b>{years} year{years === 1 ? '' : 's'}</b>.
        </p>
        <EntryList
          items={form.employment}
          onChange={(v) => update('employment', v)}
          blank={blankEmp}
          min={1}
          addLabel="Add position"
          render={(it, _i, set) => {
            const doc = documents.find((d) => d.docType === 'work' && d.employmentEntryId === it.id) ?? null;
            return (
              <div>
                <div className="grid-2">
                  <Field label="Organisation" required>
                    <Input value={it.org} onChange={(e) => set({ org: e.target.value })} placeholder="Company / institution" />
                  </Field>
                  <Field label="Role / Title" required>
                    <Input value={it.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Chief Executive Officer" />
                  </Field>
                  <Field label="From" required>
                    <Input type="month" value={it.fromMonth} onChange={(e) => set({ fromMonth: e.target.value })} />
                  </Field>
                  <Field label="To" required={!it.isCurrent}>
                    <Input type="month" value={it.toMonth} disabled={it.isCurrent} onChange={(e) => set({ toMonth: e.target.value })} />
                  </Field>
                </div>
                <label className="inline-check">
                  <input type="checkbox" checked={it.isCurrent} onChange={(e) => set({ isCurrent: e.target.checked })} />I
                  currently hold this position
                </label>
                <Field label="Key responsibilities (brief)">
                  <Textarea value={it.summary} rows={2} onChange={(e) => set({ summary: e.target.value })} placeholder="Scope, scale, notable achievements" />
                </Field>
                <Field label="Supporting document" required hint="Upload evidence for this position — an experience / service letter or contract (PDF).">
                  <EntryDocUpload
                    currentDoc={doc}
                    label="work document"
                    required
                    onUpload={(file, onProgress) =>
                      onUpload('work', file, onProgress, { employmentEntryId: it.id })
                    }
                    onRemove={() => (doc ? onRemove(doc.id) : Promise.resolve())}
                    onPreview={onPreview}
                  />
                </Field>
              </div>
            );
          }}
        />
      </SectionBlock>
    </div>
  );
}

/* ---------------- Step 4: Board & Governance ---------------- */
export function StepGovernance({ form, update }: StepProps) {
  return (
    <div>
      <div className="indep-banner info" style={{ alignItems: 'flex-start' }}>
        <ShieldCheck size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
        <div style={{ fontWeight: 500 }}>
          This section is optional, but it strengthens your evaluation. Board experience is scored (10%), and the
          Committee gives weight to these <b>desirable criteria</b> (§4.2):
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {DESIRABLE_CRITERIA.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
      <SectionBlock title="Board & governance experience" first>
        <EntryList
          items={form.boards}
          onChange={(v) => update('boards', v)}
          blank={blankBoard}
          addLabel="Add board appointment"
          render={(it, _i, set) => (
            <div>
              <div className="grid-2">
                <Field label="Organisation">
                  <Input value={it.org} onChange={(e) => set({ org: e.target.value })} placeholder="Company / entity" />
                </Field>
                <Field label="Board position">
                  <Input value={it.position} onChange={(e) => set({ position: e.target.value })} placeholder="e.g. Non-Executive Director" />
                </Field>
                <Field label="Type">
                  <Select value={it.type} onChange={(e) => set({ type: e.target.value })} options={BOARD_TYPES} placeholder="Select" />
                </Field>
                <div className="grid-2">
                  <Field label="From">
                    <Input type="month" value={it.fromMonth} onChange={(e) => set({ fromMonth: e.target.value })} />
                  </Field>
                  <Field label="To">
                    <Input type="month" value={it.toMonth} disabled={it.isCurrent} onChange={(e) => set({ toMonth: e.target.value })} />
                  </Field>
                </div>
              </div>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={it.isCurrent}
                  onChange={(e) => set({ isCurrent: e.target.checked, toMonth: e.target.checked ? '' : it.toMonth })}
                />
                I currently serve on this board
              </label>
            </div>
          )}
        />
      </SectionBlock>

      <SectionBlock title="Areas of expertise">
        <p className="wiz-sub" style={{ marginTop: -6, marginBottom: 16 }}>
          Select all that apply. These help the Committee map board competencies.
        </p>
        <Chips options={EXPERTISE} value={form.expertise} onChange={(v) => update('expertise', v)} />
      </SectionBlock>
    </div>
  );
}

/* ---------------- Step 5: References & Conflicts ---------------- */
export function StepReferences({ form, update, errors = {} }: StepProps) {
  const errs = Object.values(errors);
  return (
    <div>
      {errs.length > 0 && (
        <div className="indep-banner flag" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
          <TriangleAlert size={18} />
          <ul style={{ margin: 0, paddingLeft: 18, fontWeight: 500 }}>
            {errs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <SectionBlock title="Professional references" first>
        <p className="wiz-sub" style={{ marginTop: -6, marginBottom: 16 }}>
          Provide at least two referees who can attest to your professional standing. Each referee must state
          their relationship to you.
        </p>
        <EntryList
          items={form.references}
          onChange={(v) => update('references', v)}
          blank={blankRef}
          min={2}
          addLabel="Add reference"
          render={(it, _i, set) => (
            <div className="grid-2">
              <Field label="Full name">
                <Input value={it.name} onChange={(e) => set({ name: e.target.value })} placeholder="Referee name" />
              </Field>
              <Field label="Position & organisation">
                <Input value={it.positionOrg} onChange={(e) => set({ positionOrg: e.target.value })} placeholder="Title, Company" />
              </Field>
              <Field label="Email">
                <Input type="email" value={it.email} onChange={(e) => set({ email: e.target.value })} placeholder="referee@example.com" />
              </Field>
              <Field label="Phone">
                <Input value={it.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+..." />
              </Field>
              <div className="col-span">
                <Field label="Relationship to you" required hint="Pick one, or type your own and choose “Use …”">
                  <SearchSelect
                    value={it.relationship}
                    options={REF_RELATIONSHIPS}
                    allowCustom
                    placeholder="Select or type a relationship"
                    searchPlaceholder="Search or type a custom relationship…"
                    onChange={(v) => set({ relationship: v })}
                  />
                </Field>
              </div>
            </div>
          )}
        />
      </SectionBlock>

      <SectionBlock title="Conflict of interest disclosure">
        <Field
          label="Describe any actual, potential or perceived conflicts of interest"
          hint="If none, state “None”. Detailed independence questions follow in a later step."
        >
          <Textarea
            value={form.conflictsText}
            rows={4}
            onChange={(e) => update('conflictsText', e.target.value)}
            placeholder="Provide details of any interests, relationships or circumstances that could affect your independence…"
          />
        </Field>
      </SectionBlock>
    </div>
  );
}

/* ---------------- Step 7: Independence Declarations ---------------- */
export function StepDeclarations({ form, update }: StepProps) {
  const flagged = ALL_DECL_IDS.filter((id) => form.declarations[id] === 'yes');
  const answered = ALL_DECL_IDS.filter((id) => form.declarations[id]);
  const allAnswered = answered.length === ALL_DECL_IDS.length;

  const setAnswer = (id: string, v: 'yes' | 'no') =>
    update('declarations', { ...form.declarations, [id]: v });
  const setExplain = (id: string, v: string) =>
    update('declExplain', { ...form.declExplain, [id]: v });

  return (
    <div>
      {allAnswered &&
        (flagged.length === 0 ? (
          <div className="indep-banner clear">
            <ShieldCheck size={20} />
            No independence concerns indicated — your responses are consistent with the Bank’s independence
            criteria.
          </div>
        ) : (
          <div className="indep-banner flag">
            <TriangleAlert size={20} />
            {flagged.length} response{flagged.length > 1 ? 's' : ''} flagged for Committee review. A written
            explanation is required for each.
          </div>
        ))}

      <p className="wiz-sub" style={{ marginTop: 0, marginBottom: 22 }}>
        Please answer <b>Yes</b> or <b>No</b> to each statement. These declarations form part of the Fit &
        Proper assessment required by the Bank and the regulator.
      </p>

      {DECLARATIONS.map((g) => (
        <div key={g.group} className="decl-group">
          <div className="decl-group-h">{g.group}</div>
          {g.items.map((it) => {
            const val = form.declarations[it.id];
            const isFlag = val === 'yes';
            return (
              <div key={it.id}>
                <div className={`decl-item${isFlag ? ' flagged' : ''}`}>
                  <div className="decl-q">{it.q}</div>
                  <YesNo value={val} onChange={(v) => setAnswer(it.id, v)} />
                </div>
                {isFlag && (
                  <div style={{ margin: '-2px 0 12px', padding: '0 2px' }}>
                    <Field label="Required explanation" required>
                      <Textarea
                        value={form.declExplain[it.id] ?? ''}
                        rows={2}
                        onChange={(e) => setExplain(it.id, e.target.value)}
                        placeholder="Provide full details for the Committee’s consideration…"
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

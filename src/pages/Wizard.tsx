import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { applicationsApi } from '../lib/applications-api';
import { documentsApi, type DocLink, type DocumentRecord } from '../lib/documents-api';
import { authApi } from '../lib/auth-api';
import { HttpError } from '../lib/api';
import {
  ALL_DECL_IDS,
  MIN_DEGREE_LEVEL,
  MIN_EXPERIENCE_YEARS,
  REQUIRED_DOC_TYPES,
  RELEVANT_FIELDS_LABEL,
  ageError,
  degreeLevel,
  docLabel,
  isRelevantField,
  phoneError,
  totalExperienceYears,
} from '../lib/constants';
import type { Application } from '../lib/types';
import { hydrate, serializeDeclarations, type WizardForm } from './wizard/model';
import {
  StepDeclarations,
  StepEducation,
  StepEmployment,
  StepGovernance,
  StepPersonal,
  StepReferences,
  type Update,
} from './wizard/steps';
import { StepDocuments } from './wizard/StepDocuments';
import { StepReview } from './wizard/StepReview';
import { DocumentPreview } from '../components/DocumentPreview';
import { SubmitConfirmModal } from '../components/SubmitConfirmModal';

const STEPS = [
  { id: 'personal', label: 'Personal & Contact' },
  { id: 'education', label: 'Education & Qualifications' },
  { id: 'employment', label: 'Employment History' },
  { id: 'governance', label: 'Board & Governance' },
  { id: 'references', label: 'References & Conflicts' },
  { id: 'documents', label: 'Supporting Documents' },
  { id: 'declarations', label: 'Independence Declarations' },
  { id: 'review', label: 'Review & Submit' },
] as const;

type SaveState = 'idle' | 'saving' | 'saved';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Personal/contact + conflicts text are saved with PATCH; everything else is a
 *  PUT-replace of a repeatable collection. */
const PERSONAL_KEYS = new Set<keyof WizardForm>([
  'title',
  'firstName',
  'middleName',
  'lastName',
  'dob',
  'gender',
  'nationality',
  'email',
  'phone',
  'country',
  'city',
  'address',
  'conflictsText',
]);

export function Wizard() {
  const navigate = useNavigate();
  const [appId, setAppId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [form, setForm] = useState<WizardForm | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [certified, setCertified] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [save, setSave] = useState<SaveState>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Latest form snapshot (saves read from here so debounced flushes see fresh data).
  const formRef = useRef<WizardForm | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingPatch = useRef<Partial<Record<keyof WizardForm, unknown>>>({});
  // Guards step persistence so the initial render doesn't clobber the saved step.
  const hydrated = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const app: Application = (await applicationsApi.mine()) ?? (await applicationsApi.createDraft());
        // A submitted application is locked — send the applicant to the tracker.
        if (app.status !== 'draft') {
          navigate('/track', { replace: true });
          return;
        }
        setAppId(app.id);
        setReference(app.reference);
        setCertified(app.certified);
        const f = hydrate(app);
        // Pre-fill contact details from the registered account if not yet entered,
        // and persist so it's saved with the application.
        if (!f.email || !f.phone) {
          try {
            const me = await authApi.me();
            if (!f.email && me.email) {
              f.email = me.email;
              void applicationsApi.patch(app.id, { email: me.email }).catch(() => undefined);
            }
            if (!f.phone && me.phone) {
              f.phone = me.phone;
              void applicationsApi.patch(app.id, { phone: me.phone }).catch(() => undefined);
            }
          } catch {
            /* non-fatal */
          }
        }
        formRef.current = f;
        setForm(f);
        setDocuments(await documentsApi.list(app.id));
        // Resume where they left off — persisted server-side, so it syncs across
        // browsers/devices (not just this browser's localStorage).
        if (app.currentStep > 0 && app.currentStep < STEPS.length) setStepIndex(app.currentStep);
        if (app.maxStepSeen > 0 && app.maxStepSeen < STEPS.length) setMaxSeen(app.maxStepSeen);
        hydrated.current = true;
      } catch {
        setLoadError('Could not load your application. Please retry.');
      }
    })();
  }, [navigate]);

  // Persist current step + furthest-seen step to the server (debounced, silent).
  useEffect(() => {
    if (!appId || !hydrated.current) return;
    const t = setTimeout(() => {
      void applicationsApi.saveProgress(appId, { currentStep: stepIndex, maxStepSeen: maxSeen }).catch(() => undefined);
    }, 500);
    return () => clearTimeout(t);
  }, [appId, stepIndex, maxSeen]);

  async function uploadDoc(
    docType: string,
    file: File,
    onProgress: (pct: number) => void,
    link?: DocLink,
  ) {
    if (!appId) return;
    const rec = await documentsApi.upload(appId, docType, file, onProgress, link);
    setDocuments((prev) => {
      // Single-file slots (photo / per-entry) replace the prior file; other
      // categories allow multiple files and just append.
      let kept = prev;
      if (docType === 'photo') kept = prev.filter((d) => d.docType !== 'photo');
      else if (link?.educationEntryId)
        kept = prev.filter((d) => !(d.docType === 'edu' && d.educationEntryId === link.educationEntryId));
      else if (link?.employmentEntryId)
        kept = prev.filter((d) => !(d.docType === 'work' && d.employmentEntryId === link.employmentEntryId));
      return [...kept, rec];
    });
  }
  async function removeDoc(docId: string) {
    if (!appId) return;
    await documentsApi.remove(appId, docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }
  function previewDoc(docId: string) {
    setPreviewId(docId);
  }

  const photo = documents.find((d) => d.docType === 'photo') ?? null;
  async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
    await uploadDoc('photo', file, onProgress);
  }
  async function removePhoto() {
    if (photo) await removeDoc(photo.id);
  }
  async function loadPhotoThumb(docId: string) {
    if (!appId) return '';
    const { url } = await documentsApi.preview(appId, docId);
    return url;
  }

  async function toggleCertify(v: boolean) {
    if (!appId) return;
    setCertified(v);
    setSave('saving');
    try {
      await applicationsApi.certify(appId, v);
      setSave('saved');
    } catch {
      setSave('idle');
    }
  }

  async function submit() {
    if (!appId) return;
    setSubmitErrors({});
    setSubmitting(true);
    try {
      const result = await applicationsApi.submit(appId);
      navigate('/success', { state: { reference: result.reference } });
    } catch (err) {
      // Close the confirmation so the errors are visible on the review page.
      setConfirmOpen(false);
      if (err instanceof HttpError && err.body && typeof err.body === 'object' && 'errors' in err.body) {
        setSubmitErrors((err.body as { errors: Record<string, string> }).errors ?? {});
      } else {
        setSubmitErrors({ form: 'Could not submit. Please review your application and try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function scheduleSave(group: string, fn: () => Promise<unknown>) {
    clearTimeout(timers.current[group]);
    setSave('saving');
    timers.current[group] = setTimeout(async () => {
      try {
        await fn();
        setSave('saved');
      } catch {
        setSave('idle');
      }
    }, 700);
  }

  const update: Update = (key, value) => {
    const id = appId;
    const next = { ...(formRef.current as WizardForm), [key]: value };
    formRef.current = next;
    setForm(next);
    if (!id) return;

    if (PERSONAL_KEYS.has(key)) {
      pendingPatch.current[key] = value;
      scheduleSave('personal', async () => {
        const patch = pendingPatch.current;
        pendingPatch.current = {};
        await applicationsApi.patch(id, patch as Partial<Application>);
      });
      return;
    }
    switch (key) {
      case 'education':
        return scheduleSave('education', () => applicationsApi.putEducation(id, next.education));
      case 'professionalQuals':
        return scheduleSave('professional', () => applicationsApi.putProfessional(id, next.professionalQuals));
      case 'employment':
        return scheduleSave('employment', () => applicationsApi.putEmployment(id, next.employment));
      case 'boards':
        return scheduleSave('boards', () => applicationsApi.putBoards(id, next.boards));
      case 'references':
        return scheduleSave('references', () => applicationsApi.putReferences(id, next.references));
      case 'expertise':
        return scheduleSave('expertise', () => applicationsApi.putExpertise(id, next.expertise));
      case 'declarations':
      case 'declExplain':
        return scheduleSave('declarations', () =>
          applicationsApi.putDeclarations(id, serializeDeclarations(next) as Application['declarations']),
        );
    }
  };

  function validatePersonal(f: WizardForm): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.firstName) e.firstName = 'Required';
    if (!f.middleName) e.middleName = 'Required';
    if (!f.lastName) e.lastName = 'Required';
    const de = ageError(f.dob);
    if (de) e.dob = de;
    if (!f.nationality) e.nationality = 'Required';
    if (!f.email) e.email = 'Required';
    else if (!emailRe.test(f.email)) e.email = 'Enter a valid email';
    const pe = phoneError(f.phone);
    if (pe) e.phone = pe;
    if (!f.country) e.country = 'Required';
    return e;
  }

  /** Format-validate any reference details the applicant has filled in. */
  function validateReferences(f: WizardForm): Record<string, string> {
    const e: Record<string, string> = {};
    const filled = f.references.filter((r) => r.name || r.email || r.phone || r.positionOrg || r.relationship);
    if (filled.some((r) => r.email && !emailRe.test(r.email))) {
      e.refEmail = 'One of your references has an invalid email address.';
    }
    if (filled.some((r) => r.phone && phoneError(r.phone, false))) {
      e.refPhone = 'A reference phone number is invalid — Ethiopian numbers must be +251 then 7 or 9 and 8 digits.';
    }
    return e;
  }

  function validateEducation(f: WizardForm): Record<string, string> {
    const e: Record<string, string> = {};
    const started = f.education.filter((x) => x.degree || x.field || x.institution || x.year);
    if (started.length === 0) {
      e.education = 'Add at least one educational qualification (degree level, field of study, and institution).';
      return e;
    }
    if (started.some((x) => !x.degree)) e.degree = 'Select a degree level for each qualification you add.';
    if (started.some((x) => !x.field)) e.field = 'Enter the field of study for each qualification.';
    if (started.some((x) => !x.institution)) e.institution = 'Enter the institution for each qualification.';

    // Each qualification must carry its certificate.
    const missingCert = started.filter(
      (x) => x.degree && !documents.some((d) => d.docType === 'edu' && d.educationEntryId === x.id),
    );
    if (missingCert.length > 0) {
      e.educationDocs = `Attach the certificate (PDF) for each qualification — ${missingCert.length} still missing a document.`;
    }

    // Eligibility (§4.1.1): a Master's-or-higher qualification in a relevant field.
    const hasMasters = f.education.some((x) => degreeLevel(x.degree) >= MIN_DEGREE_LEVEL);
    const mastersWithField = f.education.filter(
      (x) => degreeLevel(x.degree) >= MIN_DEGREE_LEVEL && x.field.trim(),
    );
    if (!hasMasters) {
      e.eligibility =
        'You do not meet the minimum eligibility: a Master’s degree (MSc) or higher is required (Nomination Procedure §4.1.1).';
    } else if (mastersWithField.length > 0 && !mastersWithField.some((x) => isRelevantField(x.field))) {
      e.fieldEligibility = `Your qualifying degree must be in a relevant field — ${RELEVANT_FIELDS_LABEL} (Nomination Procedure §4.1.1).`;
    }
    return e;
  }

  function validateEmployment(f: WizardForm): Record<string, string> {
    const e: Record<string, string> = {};
    const started = f.employment.filter(
      (x) => x.org || x.role || x.fromMonth || x.toMonth || x.summary,
    );
    if (started.length === 0) {
      e.employment = 'Add at least one position to your employment history.';
      return e;
    }
    if (started.some((x) => !x.org || !x.role)) {
      e.fields = 'Each position needs an organisation and a job title / role.';
    }
    if (started.some((x) => !x.fromMonth || (!x.isCurrent && !x.toMonth))) {
      e.dates = 'Each position needs a start date and an end date (or mark it as current).';
    }
    // Each position must carry its supporting document.
    const missingWork = started.filter(
      (x) => (x.org || x.role || x.fromMonth) && !documents.some((d) => d.docType === 'work' && d.employmentEntryId === x.id),
    );
    if (missingWork.length > 0) {
      e.employmentDocs = `Attach the supporting document (PDF) for each position — ${missingWork.length} still missing a document.`;
    }
    const years = totalExperienceYears(f.employment);
    if (years < MIN_EXPERIENCE_YEARS) {
      e.experience = `You do not meet the minimum eligibility: at least ten (10) years of professional experience is required (Nomination Procedure §4.1.2). The positions entered total about ${years} year(s).`;
    }
    return e;
  }

  function validateDocuments(): Record<string, string> {
    const e: Record<string, string> = {};
    const present = new Set(documents.map((d) => d.docType));
    const missing = REQUIRED_DOC_TYPES.filter((t) => !present.has(t));
    if (missing.length > 0) {
      e.documents = `Upload the required document(s): ${missing.map(docLabel).join(', ')}.`;
    }
    return e;
  }

  /** Per-step validation that gates forward navigation (steps with hard rules). */
  function validateStep(idx: number, f: WizardForm): Record<string, string> {
    if (idx === 0) return validatePersonal(f);
    if (idx === 1) return validateEducation(f);
    if (idx === 2) return validateEmployment(f);
    if (idx === 4) return validateReferences(f);
    if (idx === 5) return validateDocuments();
    return {};
  }

  function goTo(i: number) {
    // Strict gate: validate the CURRENT step before advancing. Blocks the
    // Continue button AND forward rail jumps. Going back is always allowed.
    if (i > stepIndex && formRef.current) {
      const e = validateStep(stepIndex, formRef.current);
      setErrors(e);
      if (Object.keys(e).length) {
        if (mainRef.current) mainRef.current.scrollTop = 0;
        return;
      }
    }
    setErrors({});
    setStepIndex(i);
    setMaxSeen((m) => Math.max(m, i));
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }
  function next() {
    if (stepIndex < STEPS.length - 1) goTo(stepIndex + 1);
  }
  function back() {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }

  if (loadError) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <p className="errmsg">{loadError}</p>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="container muted" style={{ padding: '60px 0' }}>
        Preparing your application…
      </div>
    );
  }

  const pct = Math.round((stepIndex / (STEPS.length - 1)) * 100);
  const step = STEPS[stepIndex];

  let body: ReactNode;
  switch (step.id) {
    case 'personal':
      body = (
        <StepPersonal
          form={form}
          update={update}
          errors={errors}
          photo={photo}
          onUploadPhoto={uploadPhoto}
          onRemovePhoto={removePhoto}
          loadPhotoThumb={loadPhotoThumb}
        />
      );
      break;
    case 'education':
      body = (
        <StepEducation
          form={form}
          update={update}
          errors={errors}
          documents={documents}
          onUpload={uploadDoc}
          onRemove={removeDoc}
          onPreview={previewDoc}
        />
      );
      break;
    case 'employment':
      body = (
        <StepEmployment
          form={form}
          update={update}
          errors={errors}
          documents={documents}
          onUpload={uploadDoc}
          onRemove={removeDoc}
          onPreview={previewDoc}
        />
      );
      break;
    case 'governance':
      body = <StepGovernance form={form} update={update} />;
      break;
    case 'references':
      body = <StepReferences form={form} update={update} errors={errors} />;
      break;
    case 'documents':
      body = (
        <StepDocuments
          documents={documents}
          onUpload={uploadDoc}
          onRemove={removeDoc}
          onPreview={previewDoc}
          errors={errors}
        />
      );
      break;
    case 'declarations':
      body = <StepDeclarations form={form} update={update} />;
      break;
    case 'review':
      body = (
        <StepReview
          form={form}
          documents={documents}
          certified={certified}
          onCertify={toggleCertify}
          goTo={goTo}
          errors={submitErrors}
        />
      );
      break;
  }

  // Client-side submit gate, mirroring the server's validateForSubmit.
  const validRefs = form.references.filter((r) => r.name && r.email).length >= 2;
  const requiredDocs = REQUIRED_DOC_TYPES.every((t) => documents.some((d) => d.docType === t));
  const hasPhoto = documents.some((d) => d.docType === 'photo');
  const eduCertsOk = form.education
    .filter((x) => x.degree)
    .every((x) => documents.some((d) => d.docType === 'edu' && d.educationEntryId === x.id));
  const workDocsOk = form.employment
    .filter((x) => x.org || x.role || x.fromMonth)
    .every((x) => documents.some((d) => d.docType === 'work' && d.employmentEntryId === x.id));
  const declAnswered = ALL_DECL_IDS.every((id) => form.declarations[id]);
  const declExplained = ALL_DECL_IDS.every(
    (id) => form.declarations[id] !== 'yes' || (form.declExplain[id] ?? '').trim().length > 0,
  );
  const canSubmit =
    !!form.firstName &&
    !!form.lastName &&
    !!form.email &&
    !!form.phone &&
    !!form.nationality &&
    !!form.country &&
    validRefs &&
    requiredDocs &&
    hasPhoto &&
    eduCertsOk &&
    workDocsOk &&
    declAnswered &&
    declExplained &&
    certified;

  const isLast = stepIndex === STEPS.length - 1;

  return (
    <>
    <div className="wiz">
      <aside className="wiz-aside">
        <div className="wiz-prog">
          Step {stepIndex + 1} of {STEPS.length}
        </div>
        <div className="wiz-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        {STEPS.map((s, i) => {
          const done = i < stepIndex || (i <= maxSeen && i !== stepIndex);
          return (
            <div
              key={s.id}
              className={`wiz-step${i === stepIndex ? ' active' : ''}${done ? ' done' : ''}`}
              onClick={() => goTo(i)}
            >
              <div className="num">{done ? <Check size={13} strokeWidth={3} /> : i + 1}</div>
              <div className="lab">{s.label}</div>
            </div>
          );
        })}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost btn-sm btn-block" onClick={() => navigate('/')}>
            <Save size={15} /> Save &amp; exit
          </button>
        </div>
        {reference && (
          <p className="mono muted" style={{ marginTop: 18, fontSize: 12 }}>
            {reference}
          </p>
        )}
      </aside>

      <div className="wiz-main" ref={mainRef}>
        <div className="wiz-main-inner fade-up" key={stepIndex}>
          <div className="eyebrow">Independent Director Application</div>
          <h2 className="wiz-h" style={{ marginTop: 8 }}>
            {step.label}
          </h2>
          <div style={{ height: 26 }} />
          {body}
        </div>

        <div className="wiz-foot">
          <div>
            {stepIndex > 0 && (
              <button className="btn btn-ghost" onClick={back}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {save === 'saving' ? 'Saving…' : save === 'saved' ? 'Progress saved automatically' : ''}
            </span>
            {isLast ? (
              <button className="btn btn-primary" disabled={!canSubmit || submitting} onClick={() => setConfirmOpen(true)}>
                <Check size={16} /> {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={next}>
                Continue <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    {previewId && appId && (
      <DocumentPreview
        loadPreview={() => documentsApi.preview(appId, previewId)}
        loadDownload={() => documentsApi.download(appId, previewId)}
        onClose={() => setPreviewId(null)}
      />
    )}
    {confirmOpen && (
      <SubmitConfirmModal
        title="Submit your application"
        confirmLabel="Submit application"
        busy={submitting}
        onConfirm={() => void submit()}
        onClose={() => setConfirmOpen(false)}
        declaration={
          <>
            <p style={{ marginTop: 0 }}>
              I, the undersigned applicant, declare that the information and statements provided in this application
              are <b>complete and accurate</b> to the best of my knowledge.
            </p>
            <ul style={{ margin: '0 0 0 2px', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>I have answered all eligibility and independence declarations truthfully.</li>
              <li>I understand my application will be assessed against Zemen Bank S.C.’s fit-and-proper criteria.</li>
              <li>I understand that, once submitted, my application is final and cannot be edited.</li>
            </ul>
          </>
        }
      />
    )}
    </>
  );
}

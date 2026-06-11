import type { ReactNode } from 'react';
import { Check, FileText, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { DocumentRecord } from '../../lib/documents-api';
import { ALL_DECL_IDS } from '../../lib/constants';
import type { WizardForm } from './model';

interface Props {
  form: WizardForm;
  documents: DocumentRecord[];
  certified: boolean;
  onCertify: (v: boolean) => void;
  goTo: (i: number) => void;
  errors: Record<string, string>;
}

function Summ({ title, step, goTo, children }: { title: string; step: number; goTo: (i: number) => void; children: ReactNode }) {
  return (
    <div className="summ-card">
      <div className="summ-head">
        <h4>{title}</h4>
        <button className="btn btn-link" onClick={() => goTo(step)} type="button">
          Edit
        </button>
      </div>
      <div className="summ-body">{children}</div>
    </div>
  );
}

export function StepReview({ form, documents, certified, onCertify, goTo, errors }: Props) {
  const flagged = ALL_DECL_IDS.filter((id) => form.declarations[id] === 'yes');
  const name = [form.title, form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') || '—';
  const eduSummary =
    form.education
      .filter((e) => e.degree)
      .map((e) => e.degree + (e.field ? ` · ${e.field}` : ''))
      .join('; ') || '—';
  const profSummary = form.professionalQuals.filter((p) => p.name).map((p) => p.name).join(', ') || '—';

  return (
    <div>
      <p className="wiz-sub" style={{ marginTop: 0, marginBottom: 22 }}>
        Review your application carefully. Once submitted, you will receive a unique reference number and an
        acknowledgement email.
      </p>

      {Object.keys(errors).length > 0 && (
        <div className="indep-banner flag" style={{ alignItems: 'flex-start' }}>
          <ShieldAlert size={20} />
          <div>
            Please resolve the following before submitting:
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontWeight: 500 }}>
              {Object.values(errors).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Summ title="Personal & contact" step={0} goTo={goTo}>
        <dl className="kv">
          <dt>Name</dt>
          <dd>{name}</dd>
          <dt>Nationality</dt>
          <dd>{form.nationality || '—'}</dd>
          <dt>Email</dt>
          <dd>{form.email || '—'}</dd>
          <dt>Mobile</dt>
          <dd>{form.phone || '—'}</dd>
          <dt>Residence</dt>
          <dd>{[form.city, form.country].filter(Boolean).join(', ') || '—'}</dd>
        </dl>
      </Summ>

      <Summ title="Qualifications" step={1} goTo={goTo}>
        <dl className="kv">
          <dt>Education</dt>
          <dd>{eduSummary}</dd>
          <dt>Professional</dt>
          <dd>{profSummary}</dd>
        </dl>
      </Summ>

      <Summ title="Experience & expertise" step={3} goTo={goTo}>
        <dl className="kv">
          <dt>Board appointments</dt>
          <dd>{form.boards.filter((b) => b.org).length} listed</dd>
          <dt>Areas of expertise</dt>
          <dd>{form.expertise.join(', ') || '—'}</dd>
        </dl>
      </Summ>

      <Summ title="Documents" step={5} goTo={goTo}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {documents.length ? (
            documents.map((d) => (
              <span key={d.id} className="chip">
                <FileText size={13} /> {d.originalFilename}
              </span>
            ))
          ) : (
            <span className="muted">No documents uploaded</span>
          )}
        </div>
      </Summ>

      <Summ title="Independence declarations" step={6} goTo={goTo}>
        {flagged.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--ok)', fontWeight: 600, fontSize: 13.5 }}>
            <ShieldCheck size={18} /> No concerns indicated
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--warn)', fontWeight: 600, fontSize: 13.5 }}>
            <TriangleAlert size={18} /> {flagged.length} item(s) flagged for Committee review
          </div>
        )}
      </Summ>

      {/* Formal declaration — keep this legal copy verbatim. */}
      <div className="certify">
        <div className="certify-h">
          <ShieldCheck size={17} /> Declaration
        </div>
        <div className="certify-note">
          <TriangleAlert size={16} />
          <span>
            I am aware that under <b>Banking Business Proclamation No. 1360/2025</b>, it is an offense to provide
            a false or misleading statement.
          </span>
        </div>
        <p className="certify-body">
          I certify that the information and/or statements given above are complete and accurate to the best of
          my knowledge, and that there are no other facts relevant to this application of which the National Bank
          should be aware. I also undertake to inform the National Bank of any changes material to the
          application.
        </p>
        <label className={`certify-check${certified ? ' on' : ''}`} onClick={() => onCertify(!certified)}>
          <div className="cc-box">{certified && <Check size={14} strokeWidth={3} />}</div>
          <span>
            I have read and agree to the declaration above, and confirm the accuracy of my application.
          </span>
        </label>
      </div>
    </div>
  );
}

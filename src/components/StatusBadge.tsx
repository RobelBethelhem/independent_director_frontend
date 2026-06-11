import type { ApplicationStatus } from '../lib/types';

const META: Record<ApplicationStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'badge-draft' },
  submitted: { label: 'Submitted', cls: 'badge-submit' },
  under_review: { label: 'Under Review', cls: 'badge-review' },
  info_requested: { label: 'Information Requested', cls: 'badge-info' },
  shortlisted: { label: 'Shortlisted', cls: 'badge-short' },
  not_selected: { label: 'Not Selected', cls: 'badge-reject' },
  selected: { label: 'Selected', cls: 'badge-select' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = META[status as ApplicationStatus] ?? { label: status, cls: 'badge-draft' };
  return (
    <span className={`badge ${meta.cls}`}>
      <span className="dot" />
      {meta.label}
    </span>
  );
}

/** Mirrors of the backend enums + DTO shapes the front end consumes. */

export type UserRole = 'applicant' | 'admin' | 'reviewer' | 'auditor' | 'recommender';

export interface Me {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: 'active' | 'disabled';
  mustChangePassword?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: UserRole; emailVerified: boolean; mustChangePassword?: boolean };
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'info_requested'
  | 'shortlisted'
  | 'not_selected'
  | 'selected';

export interface EducationEntry {
  id?: string;
  degree?: string | null;
  field?: string | null;
  institution?: string | null;
  year?: string | null;
}

export interface ProfessionalQual {
  id?: string;
  name?: string | null;
  body?: string | null;
  year?: string | null;
}

export interface EmploymentEntry {
  id?: string;
  org?: string | null;
  role?: string | null;
  fromMonth?: string | null;
  toMonth?: string | null;
  isCurrent?: boolean;
  summary?: string | null;
}

export interface BoardEntry {
  id?: string;
  org?: string | null;
  position?: string | null;
  type?: string | null;
  fromMonth?: string | null;
  toMonth?: string | null;
  isCurrent?: boolean | null;
  period?: string | null;
}

export interface ReferenceContact {
  id?: string;
  name?: string | null;
  positionOrg?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

export interface Declaration {
  id?: string;
  itemId: string;
  answer: 'yes' | 'no';
  explanation?: string | null;
}

export interface Application {
  id: string;
  reference: string | null;
  status: ApplicationStatus;
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  conflictsText: string | null;
  certified: boolean;
  flagsCount: number;
  currentStep: number;
  maxStepSeen: number;
  education: EducationEntry[];
  professionalQuals: ProfessionalQual[];
  employment: EmploymentEntry[];
  boards: BoardEntry[];
  references: ReferenceContact[];
  declarations: Declaration[];
  expertise: { value: string }[];
  documents: { id: string; docType: string; originalFilename: string; scannedClean: boolean }[];
}

/** Field-level validation errors returned by NestJS ValidationPipe. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type Role = 'super_admin' | 'org_admin' | 'end_user';
export type Status = 'active' | 'inactive';

export interface Organization {
  id: string;
  name: string;
  code: string;
  domain: string;
  slug: string;
  status: Status;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Trimmed organization shape from the public endpoint (legacy slug sign-up).
export interface OrgOption {
  id: string;
  name: string;
  slug: string;
  domain: string;
}

export interface SessionUser {
  id: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: SessionUser;
}

// The global, predefined feature catalogue.
export interface Feature {
  id: string;
  name: string;
  code: string;
  description: string;
  status: Status;
  organizationId: string | null;
  custom: boolean;
}

// A feature plus whether it is enabled for the current organization. `custom` is
// true for org-specific features created by the admin (visible only to this org).
export interface OrgFeature {
  id: string;
  name: string;
  code: string;
  description: string;
  enabled: boolean;
  custom: boolean;
}

export interface FeatureCheckResult {
  code: string;
  name: string;
  enabled: boolean;
}

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  organizationId: string | null;
  status: Status;
  emailVerified: boolean;
  otpVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OtpInfo {
  email: string;
  purpose: string;
  expiresAt: string;
  devCode?: string;
}

export interface CreateAdminResult {
  admin: ManagedUser;
  otp: OtpInfo;
}

// Legacy per-org feature flag (kept for backwards compatibility).
export interface FeatureFlag {
  id: string;
  organizationId: string;
  key: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OtpPurpose =
  | 'admin_onboarding'
  | 'signup_verification'
  | 'forgot_password';

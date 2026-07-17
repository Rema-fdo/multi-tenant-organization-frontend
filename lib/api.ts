import {
  AuthResult,
  CreateAdminResult,
  Feature,
  FeatureCheckResult,
  ManagedUser,
  OrgFeature,
  OrgOption,
  Organization,
  OtpInfo,
  OtpPurpose,
  Status,
} from './types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  errors?: string[];
  constructor(status: number, message: string, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

// Every backend response is the envelope { success, message, data }. `request`
// unwraps it: success -> data, failure -> ApiError(message).
interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const envelope: Partial<Envelope<T>> = text ? JSON.parse(text) : {};

  if (!res.ok || envelope.success === false) {
    throw new ApiError(
      res.status,
      envelope.message ?? res.statusText,
      envelope.errors,
    );
  }
  return envelope.data as T;
}

export const api = {
  // --- Auth ----------------------------------------------------------------
  superAdminLogin(identifier: string, password: string) {
    const body = identifier.includes('@')
      ? { email: identifier, password }
      : { username: identifier, password };
    return request<AuthResult>('/auth/super-admin/login', {
      method: 'POST',
      body,
    });
  },

  signup(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    return request<AuthResult>('/auth/signup', { method: 'POST', body: input });
  },

  login(email: string, password: string) {
    return request<AuthResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  refresh(refreshToken: string) {
    return request<AuthResult>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  sendOtp(email: string, purpose: OtpPurpose) {
    return request<OtpInfo>('/otp/send', {
      method: 'POST',
      body: { email, purpose },
    });
  },

  verifyOtp(email: string, purpose: OtpPurpose, otp: string) {
    return request<{ email: string; verified: boolean }>('/otp/verify', {
      method: 'POST',
      body: { email, purpose, otp },
    });
  },

  setPassword(email: string, password: string, purpose: OtpPurpose = 'admin_onboarding') {
    return request<AuthResult>('/auth/set-password', {
      method: 'POST',
      body: { email, password, purpose },
    });
  },

  forgotPassword(email: string) {
    return request<OtpInfo & { sent: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  resetPassword(email: string, otp: string, newPassword: string) {
    return request<{ email: string; reset: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: { email, otp, newPassword },
    });
  },

  // --- Super Admin: organizations -----------------------------------------
  createOrganization(
    input: { name: string; code: string; domain: string },
    token: string,
  ) {
    return request<Organization>('/organizations', {
      method: 'POST',
      body: input,
      token,
    });
  },

  listOrganizations(token: string) {
    return request<Organization[]>('/organizations', { token });
  },

  getOrganization(id: string, token: string) {
    return request<Organization>(`/organizations/${id}`, { token });
  },

  updateOrganization(
    id: string,
    input: Partial<{ name: string; code: string; domain: string }>,
    token: string,
  ) {
    return request<Organization>(`/organizations/${id}`, {
      method: 'PATCH',
      body: input,
      token,
    });
  },

  setOrganizationStatus(id: string, status: Status, token: string) {
    return request<Organization>(`/organizations/${id}/status`, {
      method: 'PATCH',
      body: { status },
      token,
    });
  },

  createAdmin(
    orgId: string,
    input: { firstName: string; lastName: string; email: string; phone?: string },
    token: string,
  ) {
    return request<CreateAdminResult>(`/organizations/${orgId}/admins`, {
      method: 'POST',
      body: input,
      token,
    });
  },

  listAdmins(orgId: string, token: string) {
    return request<ManagedUser[]>(`/organizations/${orgId}/admins`, { token });
  },

  listPublicOrganizations() {
    return request<OrgOption[]>('/public/organizations');
  },

  // --- Features ------------------------------------------------------------
  listFeatures(token: string) {
    return request<Feature[]>('/features', { token });
  },

  getOrganizationFeatures(token: string) {
    return request<OrgFeature[]>('/organization/features', { token });
  },

  setOrganizationFeatures(featureCodes: string[], token: string) {
    return request<OrgFeature[]>('/organization/features', {
      method: 'POST',
      body: { features: featureCodes },
      token,
    });
  },

  // --- Admin: custom (org-specific) features -------------------------------
  createCustomFeature(
    input: { name: string; description?: string; code?: string },
    token: string,
  ) {
    return request<OrgFeature>('/organization/features/custom', {
      method: 'POST',
      body: input,
      token,
    });
  },

  updateCustomFeature(
    id: string,
    input: Partial<{ name: string; description: string; status: Status }>,
    token: string,
  ) {
    return request<OrgFeature>(`/organization/features/custom/${id}`, {
      method: 'PATCH',
      body: input,
      token,
    });
  },

  deleteCustomFeature(id: string, token: string) {
    return request<{ id: string; deleted: boolean }>(
      `/organization/features/custom/${id}`,
      { method: 'DELETE', token },
    );
  },

  getMyFeatures(token: string) {
    return request<OrgFeature[]>('/my/features', { token });
  },

  checkMyFeatures(featureCodes: string[], token: string) {
    return request<FeatureCheckResult[]>('/my/features/check', {
      method: 'POST',
      body: { features: featureCodes },
      token,
    });
  },

  // --- Admin: users --------------------------------------------------------
  listUsers(token: string) {
    return request<ManagedUser[]>('/users', { token });
  },

  getUser(id: string, token: string) {
    return request<ManagedUser>(`/users/${id}`, { token });
  },

  setUserStatus(id: string, status: Status, token: string) {
    return request<ManagedUser>(`/users/${id}/status`, {
      method: 'PATCH',
      body: { status },
      token,
    });
  },
};

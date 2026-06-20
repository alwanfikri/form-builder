// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'signature'
  | 'rating'
  | 'scale'
  | 'matrix'
  | 'section'
  | 'page_break';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: string | number;
  message: string;
}

export interface ConditionalLogic {
  show: boolean;
  conditions: Array<{
    fieldId: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'is_empty' | 'is_not_empty';
    value?: string | number | boolean;
  }>;
  logicType: 'all' | 'any';
}

export interface FieldProperties {
  options?: Array<{ label: string; value: string }>;
  accept?: string;          // file field: accepted mime types
  maxSize?: number;         // file field: max bytes
  multiple?: boolean;       // file/multiselect
  minRating?: number;
  maxRating?: number;
  rows?: number;            // textarea
  matrixRows?: string[];
  matrixCols?: string[];
  defaultValue?: string | number | boolean | string[];
  helpText?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: ValidationRule[];
  properties: FieldProperties;
  conditional?: ConditionalLogic;
  layout: {
    width: 'full' | 'half' | 'third';
    row: number;
  };
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface EmailConfig {
  to: string;         // supports {{response.fieldId}} interpolation
  cc?: string;
  subject: string;
  body: string;
  includeResponseSummary?: boolean;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  bodyTemplate?: string;
}

export interface ApprovalStep {
  approverEmail: string;
  label: string;
  order: number;
}

export interface ApprovalConfig {
  approvers: string[];
  steps: ApprovalStep[];
  onApprove?: WorkflowAction;
  onReject?: WorkflowAction;
  reminderAfterHours?: number;
}

export interface NotificationConfig {
  channels: ('email' | 'slack' | 'teams')[];
  message: string;
  urgency: 'low' | 'normal' | 'high';
}

export interface CustomScriptConfig {
  code: string;
  timeout?: number;
}

export type WorkflowAction =
  | { type: 'email'; config: EmailConfig }
  | { type: 'webhook'; config: WebhookConfig }
  | { type: 'approval'; config: ApprovalConfig }
  | { type: 'notification'; config: NotificationConfig }
  | { type: 'script'; config: CustomScriptConfig };

export type WorkflowTrigger =
  | 'form_submit'
  | 'field_change'
  | 'schedule'
  | 'webhook';

export interface FormWorkflow {
  id: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  approvals?: ApprovalConfig[];
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export interface GoogleDatabaseConfig {
  provider: 'google';
  folderId: string;
  spreadsheetId: string;
  sheetName: string;
  webViewLink: string;
}

export interface MicrosoftDatabaseConfig {
  provider: 'microsoft';
  driveId: string;
  itemId: string;
  folderId: string;
  tableName: string;
  webUrl: string;
}

export type DatabaseConfig = GoogleDatabaseConfig | MicrosoftDatabaseConfig;

export interface StorageConfig {
  provider: 'google' | 'microsoft';
  rootFolderId: string;
  attachmentsFolderId?: string;
}

// ─── Form Settings ────────────────────────────────────────────────────────────

export interface FormSettings {
  allowMultipleSubmissions: boolean;
  requireLogin: boolean;
  showProgressBar: boolean;
  confirmationMessage: string;
  confirmationRedirect?: string;
  theme?: 'default' | 'minimal' | 'branded';
  brandColor?: string;
  logoUrl?: string;
  closedMessage?: string;
  maxResponses?: number;
  closeAt?: string;
}

export interface FormLayout {
  type: 'single-page' | 'multi-page';
  pages?: Array<{ title: string; fieldIds: string[] }>;
}

// ─── Top-level Schema ─────────────────────────────────────────────────────────

export type FormStatus = 'draft' | 'published' | 'archived' | 'closed';

export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  status: FormStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  responseCount: number;

  settings: FormSettings;
  fields: FormField[];
  layout: FormLayout;
  workflow: FormWorkflow;

  storage: StorageConfig;
  database: DatabaseConfig;
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface FormResponse {
  id: string;
  formId: string;
  shortlinkId?: string;
  sessionId?: string;
  respondentEmail?: string;
  respondentName?: string;
  values: Record<string, string | number | boolean | string[]>;
  attachments?: Array<{ fieldId: string; fileId: string; fileName: string; webUrl: string }>;
  submittedAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Shortlinks ───────────────────────────────────────────────────────────────

export type ShortlinkStatus = 'active' | 'inactive' | 'archived';
export type AccessType = 'public' | 'password' | 'email_list' | 'token' | 'rate_limited';

export interface ShortlinkAccessConfig {
  // password
  passwordHash?: string;
  maxAttempts?: number;
  // email_list
  allowedEmails?: string[];
  allowedDomains?: string[];
  // token
  tokens?: string[];
  // rate_limited
  maxPerDay?: number;
  maxPerIp?: number;
}

export interface Shortlink {
  id: string;
  shortCode: string;
  currentFormId: string;
  status: ShortlinkStatus;
  accessType: AccessType;
  accessConfig: ShortlinkAccessConfig;
  fallbackUrl?: string;
  totalClicks: number;
  uniqueClicks: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  archivedAt?: string;

  currentForm?: Pick<FormSchema, 'id' | 'name' | 'description' | 'status' | 'responseCount'>;
  history?: ShortlinkHistory[];
}

export interface ShortlinkHistory {
  id: string;
  shortlinkId: string;
  formId: string;
  activatedAt: string;
  deactivatedAt?: string;
  reason: string;
  changedBy: string;
  form?: Pick<FormSchema, 'id' | 'name'>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'starts_with';
  value: string | number | boolean;
}

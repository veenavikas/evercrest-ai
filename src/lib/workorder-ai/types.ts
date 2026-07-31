export type Severity = "routine" | "urgent" | "emergency" | "staff_triage";
export type ConversationStatus = "active" | "needs_more_info" | "escalated" | "ticket_submitted" | "email_sent" | "reviewed" | "closed";
export type Sender = "tenant" | "bot";

export type TenantInfo = {
  tenant_id: string;
  name?: string;
  email: string;
  whitelisted: boolean;
  display_label?: string;
  contact_preferences?: {
    preferred_method?: string;
    phone?: string;
  };
  property_ids: string[];
};

export type PropertyInfo = {
  property_id: string;
  address: string;
  unit?: string;
  active: boolean;
  notes?: string;
};

export type TenantInfoFile = {
  version: number;
  purpose?: string;
  default_language?: string;
  current_tenant_id?: string;
  tenants: TenantInfo[];
  properties: PropertyInfo[];
};

export type ChatMessage = {
  id: string;
  sender: Sender;
  body: string;
  createdAt: string;
  attachmentIds?: string[];
};

export type AttachmentNote = {
  id: string;
  name: string;
  tenantNote: string;
  aiNotes: string;
  privacyFlags: string[];
  dataUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type AccessDetails = {
  permissionToEnter: "yes" | "no" | "unclear";
  occupied: "yes" | "no" | "unclear";
  restrictedTimes: string;
  inaccessibleAreas: string;
  petsPresent: "yes" | "no" | "unclear";
  petSecurePlan: string;
  alarmPresent: "yes" | "no" | "unclear";
  alarmCodeHandling: "secure_channel_required" | "not_applicable" | "unclear";
  gateOrEntryNotes: string;
  parkingOrHoaNotes: string;
  contactPreference: string;
};

export type DifferentialItem = {
  possibleIssue: string;
  confidence: number;
  evidence: string;
};

export type VerdictState = {
  issueCategory: string;
  issueLocation: string;
  currentStatus: string;
  severity: Severity;
  safetyConcerns: string[];
  missingInfo: string[];
  photoVideoStatus: "not_requested" | "optional_if_useful" | "required_if_safe" | "unsafe_to_request" | "received";
  safeStepsDiscussed: string[];
  staffReviewRequired: boolean;
  staffReviewReason: string[];
  likelyVendorCategory: string;
  intakeComplete: boolean;
  possibleTenantCausedIndicators: string[];
  complianceSensitiveFlags: string[];
  accessDetails: AccessDetails;
  differentialAnalysis: DifferentialItem[];
  costEstimation: string;
  repairpersonAdvice: string;
};

export type StaffEmailReport = {
  subject: string;
  body: string;
  sentAt: string;
  deliveryStatus: "simulated_sent" | "failed" | "not_sent";
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type ConversationRecord = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail: string;
  propertyAddress: string;
  propertyId: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  attachments: AttachmentNote[];
  verdict: VerdictState;
  staffEmail?: StaffEmailReport;
  tokenUsage?: TokenUsage;
};

export type SystemLogLevel = "info" | "warning" | "error";

export type SystemLogEntry = {
  id: string;
  timestamp: string;
  level: SystemLogLevel;
  source: "tenant" | "admin" | "api" | "triage" | "handoff" | "storage";
  event: string;
  message: string;
  conversationId?: string;
  details?: Record<string, string | number | boolean | null>;
};

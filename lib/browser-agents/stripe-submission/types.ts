export type SubmissionStep = {
  number: number;
  description: string;
  type: "navigate" | "click" | "fill" | "upload" | "verify";
  selector?: string;
  value?: string;
  waitForSelector?: string;
  expectedUrl?: string;
};

export type StepResult = {
  stepNumber: number;
  stepType: string;
  success: boolean;
  duration: number;
  screenshot?: {
    path: string;
    hash: string;
  };
  formData?: Record<string, any>;
  error?: string;
  errorCode?: string;
};

export type VerificationResult = {
  verified: boolean;
  confidence: number;
  details: Record<string, any>;
  screenshot?: Buffer;
  error?: string;
};

export type Checkpoint = {
  id: string;
  submissionId: string;
  stepNumber: number;
  browserbaseSessionId: string;
  pageUrl: string;
  pageTitle: string;
  formData?: Record<string, any>;
  previousHash: string | null;
  checkpointHash: string;
  timestamp: string;
};

export type SubmissionProgress = {
  submissionId: string;
  overallProgress: number;
  currentStep: number;
  totalSteps: number;
  stepResults: Map<number, StepResult>;
  latestCheckpoint?: Checkpoint;
  lastError?: string;
  estTimeRemaining?: number;
};

export type EvidencePayload = {
  eventId: string;
  jobId: string;
  tool: string;
  action: string;
  target: string;
  decision: "ALLOW" | "BLOCK";
  reason: string;
  evidenceJson: Record<string, any>;
  previousHash: string | null;
  eventHash: string;
  createdAt: string;
};

export type SubmissionStatus =
  | "pending"
  | "in_progress"
  | "checkpoint"
  | "complete"
  | "failed";

export type SubmissionData = {
  app_metadata: {
    app_id: string;
    app_name: string;
    version: string;
  };
  app_descriptions: {
    about: string;
    subtitle: string;
    short_description: string;
    long_description: string;
    category: string;
  };
  contact_info: {
    support_email: string;
    support_url: string;
    contact_email: string;
  };
  legal_urls: {
    privacy_policy: string;
    terms_of_service: string;
    company_homepage: string;
  };
  oauth_configuration: {
    access_type: string;
    redirect_uris: string[];
  };
  permissions: Array<{
    permission: string;
    purpose: string;
    required: boolean;
  }>;
  webhook_configuration: {
    webhook_endpoint: string;
    signature_verification: boolean;
    events: string[];
  };
  assets: {
    icon: {
      file: string;
      format: string;
      size: string;
    };
    screenshots: Array<{
      file: string;
      title: string;
      description: string;
      dimensions: string;
      order: number;
    }>;
  };
  ui_extensions: {
    views: Array<{
      viewport: string;
      component: string;
      description: string;
    }>;
  };
};

export type StepContext = {
  page: any;
  submissionData: SubmissionData;
  submissionId: string;
  browserbaseSessionId: string;
  previousCheckpoint?: Checkpoint;
};

export type StepHandler = {
  execute(context: StepContext, step: SubmissionStep): Promise<StepResult>;
  verify(context: StepContext, step: SubmissionStep): Promise<VerificationResult>;
  captureEvidence(result: StepResult): Promise<EvidencePayload>;
  getRecoveryStrategy(): string;
};

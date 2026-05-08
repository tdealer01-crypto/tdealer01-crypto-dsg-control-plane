export type RemoteBrowserProviderId = 'playwright' | 'browserbase' | 'steel';

export type RemoteBrowserProviderStatus =
  | 'configured'
  | 'missing_env'
  | 'adapter_pending';

export type RemoteBrowserSessionStatus =
  | 'created'
  | 'running'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'closed';

export type RemoteBrowserCheckpointType = 'login' | 'captcha' | 'consent' | 'takeover' | 'privileged_action';
export type RemoteBrowserCheckpointState = 'pending' | 'active' | 'resolved';

export type RemoteBrowserProvider = {
  id: RemoteBrowserProviderId;
  label: string;
  status: RemoteBrowserProviderStatus;
  requiredEnv: string[];
  optionalEnv: string[];
  capabilities: string[];
  evidence: string[];
  truthBoundary: string;
};

export type RemoteBrowserNavigationEvent = {
  id: string;
  at: string;
  action: 'session.create' | 'navigate' | 'inspect' | 'screenshot.request' | 'checkpoint.create' | 'checkpoint.resolve' | 'session.close' | 'note';
  status: 'running' | 'completed' | 'blocked' | 'failed';
  url?: string;
  detail: string;
};

export type RemoteBrowserArtifact = {
  id: string;
  type: 'screenshot' | 'page_state' | 'navigation_log' | 'manual_note';
  status: 'available' | 'blocked' | 'failed';
  title: string;
  detail: string;
  url?: string;
  createdAt: string;
};

export type RemoteBrowserCheckpoint = {
  id: string;
  type: RemoteBrowserCheckpointType;
  state: RemoteBrowserCheckpointState;
  instruction: string;
  createdAt: string;
  resolvedAt?: string;
};

export type RemoteBrowserSession = {
  id: string;
  providerId: RemoteBrowserProviderId;
  status: RemoteBrowserSessionStatus;
  goal: string;
  startUrl: string;
  currentUrl?: string;
  createdAt: string;
  updatedAt: string;
  navigationLog: RemoteBrowserNavigationEvent[];
  artifacts: RemoteBrowserArtifact[];
  checkpoints: RemoteBrowserCheckpoint[];
};

export type RemoteBrowserCreateSessionInput = {
  providerId?: RemoteBrowserProviderId;
  goal: string;
  startUrl: string;
};

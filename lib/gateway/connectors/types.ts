export type GatewayConnectorProvider = 'zapier' | 'make' | 'n8n' | 'custom_webhook';

export type GatewayConnectorStatus = 'not_configured' | 'pending' | 'connected' | 'error';

export type GatewayConnectorSummary = {
  provider: GatewayConnectorProvider;
  status: GatewayConnectorStatus;
  orgId: string;
  accountLabel?: string;
  connectedAt?: string;
  error?: string;
};

export type ZapierConnectConfig = {
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  scopes: string[];
};

export type ZapierConnectSession = {
  ok: boolean;
  provider: 'zapier';
  status: GatewayConnectorStatus;
  connectUrl?: string;
  state?: string;
  reason?: string;
};

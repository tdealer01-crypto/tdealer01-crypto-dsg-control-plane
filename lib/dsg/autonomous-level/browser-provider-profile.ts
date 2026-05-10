export type DsgBrowserProviderMode = 'local_cdp' | 'managed_browser_actuator' | 'manual_evidence';

export type DsgBrowserProviderCapability = {
  mode: DsgBrowserProviderMode;
  label: string;
  canInspectDom: boolean;
  canInspectConsole: boolean;
  canInspectNetwork: boolean;
  canCaptureScreenshot: boolean;
  canActuateUi: boolean;
  requiresExternalAccount: boolean;
  privacyRisk: 'low' | 'medium' | 'high';
  bestFor: string[];
  notFor: string[];
};

export function dsgBrowserProviderProfiles(): DsgBrowserProviderCapability[] {
  return [
    {
      mode: 'local_cdp',
      label: 'Local Chromium DevTools-style provider',
      canInspectDom: true,
      canInspectConsole: true,
      canInspectNetwork: true,
      canCaptureScreenshot: true,
      canActuateUi: true,
      requiresExternalAccount: false,
      privacyRisk: 'medium',
      bestFor: ['web UI debugging', 'console error capture', 'network inspection', 'layout verification'],
      notFor: ['native mobile application testing', 'handling sensitive account pages without redaction'],
    },
    {
      mode: 'managed_browser_actuator',
      label: 'Managed browser actuator provider',
      canInspectDom: true,
      canInspectConsole: true,
      canInspectNetwork: true,
      canCaptureScreenshot: true,
      canActuateUi: true,
      requiresExternalAccount: true,
      privacyRisk: 'high',
      bestFor: ['multi-step web workflows', 'form filling', 'cross-page UI process proof'],
      notFor: ['local-only development with no external provider', 'highly confidential browser sessions without isolation policy'],
    },
    {
      mode: 'manual_evidence',
      label: 'Manual browser evidence fallback',
      canInspectDom: false,
      canInspectConsole: false,
      canInspectNetwork: false,
      canCaptureScreenshot: true,
      canActuateUi: false,
      requiresExternalAccount: false,
      privacyRisk: 'low',
      bestFor: ['operator-supplied screenshot proof', 'low automation environments', 'quota-preserving smoke verification'],
      notFor: ['autonomous browser completion claims', 'DOM/network proof requirements'],
    },
  ];
}

export function selectDsgBrowserProviderProfile(mode: DsgBrowserProviderMode): DsgBrowserProviderCapability {
  const profile = dsgBrowserProviderProfiles().find((item) => item.mode === mode);
  if (!profile) throw new Error(`DSG_BROWSER_PROVIDER_PROFILE_UNKNOWN:${mode}`);
  return profile;
}

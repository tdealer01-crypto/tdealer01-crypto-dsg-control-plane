import React from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import ChargeGate from './ChargeGate';
import PayoutGate from './PayoutGate';

interface AppProps {
  viewport: 'charge' | 'payout';
  extensionContext: ExtensionContextValue;
}

const App: React.FC<AppProps> = ({ viewport, extensionContext }) => {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {viewport === 'charge' && <ChargeGate extensionContext={extensionContext} />}
      {viewport === 'payout' && <PayoutGate extensionContext={extensionContext} />}
    </div>
  );
};

export default App;

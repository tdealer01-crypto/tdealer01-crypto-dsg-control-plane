import React from 'react';
import ChargeGate from './ChargeGate';
import PaymentIntentGate from './PaymentIntentGate';
import PayoutGate from './PayoutGate';

interface AppProps {
  viewport: 'charge' | 'payment_intent' | 'payout';
  charge?: any;
  payment_intent?: any;
  payout?: any;
  stripe_account_id: string;
}

const App: React.FC<AppProps> = ({
  viewport,
  charge,
  payment_intent,
  payout,
  stripe_account_id,
}) => {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {viewport === 'charge' && charge && (
        <ChargeGate charge={charge} stripe_account_id={stripe_account_id} />
      )}
      {viewport === 'payment_intent' && payment_intent && (
        <PaymentIntentGate payment_intent={payment_intent} stripe_account_id={stripe_account_id} />
      )}
      {viewport === 'payout' && payout && (
        <PayoutGate payout={payout} stripe_account_id={stripe_account_id} />
      )}
    </div>
  );
};

export default App;

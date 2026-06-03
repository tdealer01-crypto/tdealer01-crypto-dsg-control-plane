import AgentChatWidget from '../../components/AgentChatWidget';

export default function ProofGateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}

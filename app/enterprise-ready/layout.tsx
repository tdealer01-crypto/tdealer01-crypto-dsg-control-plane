import AgentChatWidget from '../../components/AgentChatWidget';
import HermesControlLink from '../../components/HermesControlLink';

export default function EnterpriseReadyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HermesControlLink />
      <AgentChatWidget />
    </>
  );
}

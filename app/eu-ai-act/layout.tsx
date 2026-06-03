import AgentChatWidget from '../../components/AgentChatWidget';

export default function EuAiActLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}

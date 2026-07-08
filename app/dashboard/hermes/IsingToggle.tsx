'use client';
export function agentEndpoints() {
  return [
    { id: 'hermes', label: 'Hermes', endpoint: '/api/chat/hermes' },
    { id: 'ising', label: 'NVIDIA Ising', endpoint: '/api/ising' },
  ];
}

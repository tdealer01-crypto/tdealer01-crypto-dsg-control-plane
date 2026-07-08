import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/ising-calibration-1-35b-a3b',
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });
  const data = await r.json();
  return NextResponse.json(data.choices?.[0]?.message?? { role: 'assistant', content: '' });
}

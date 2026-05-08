import { NextResponse } from 'next/server';
import { getOpenAIAdapterStatus } from '@/lib/dsg/ai/openai-adapter';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: getOpenAIAdapterStatus(),
  });
}

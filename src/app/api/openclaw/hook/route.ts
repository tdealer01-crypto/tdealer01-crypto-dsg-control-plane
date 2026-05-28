import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const body = await req.json().catch(() => null)

  if (!body) {
    return NextResponse.json(
      { error: 'invalid body' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  const { event, session_id, channel, device_id } = body

  if (!session_id) {
    return NextResponse.json(
      { error: 'session_id required' },
      { status: 422, headers: corsHeaders(origin) }
    )
  }

  await supabase.from('openclaw_sessions').upsert(
    {
      session_id,
      event: event ?? 'connect',
      channel: channel ?? null,
      device_id: device_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' }
  )

  const dsgToken = `dsg_${Buffer.from(session_id).toString('base64').slice(0, 12)}_${Date.now()}`

  return NextResponse.json(
    { ok: true, session_id, dsg_token: dsgToken },
    { headers: corsHeaders(origin) }
  )
}

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
try {
const body = await req.json()
const event = body

if (event.type === 'checkout.session.completed') {
  const email = event.data.object.customer_email

  if (!email) {
    return Response.json({ error: 'no email' })
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('email', email)

  if (error) {
    return Response.json({ error })
  }
}

return Response.json({ ok: true })

} catch (err) {
return Response.json({ error: err.message })
}
}

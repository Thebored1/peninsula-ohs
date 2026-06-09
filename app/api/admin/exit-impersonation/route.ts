import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('exxio_impersonating')
  return response
}

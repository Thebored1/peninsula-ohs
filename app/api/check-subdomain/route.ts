import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const RESERVED = new Set([
  'www', 'admin', 'api', 'app', 'mail', 'support', 'help',
  'demo', 'test', 'staging', 'static', 'cdn', 'assets',
])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('subdomain') ?? ''
  const subdomain = raw.toLowerCase().trim()

  if (!subdomain) {
    return NextResponse.json({ available: false, error: 'Required' })
  }

  if (!/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$/.test(subdomain)) {
    return NextResponse.json({
      available: false,
      error: 'Only lowercase letters, numbers, and hyphens. 3–32 characters.',
    })
  }

  if (RESERVED.has(subdomain)) {
    return NextResponse.json({ available: false, error: 'That name is reserved.' })
  }

  const { count } = await supabaseAdmin
    .from('organisations')
    .select('id', { count: 'exact', head: true })
    .eq('subdomain', subdomain)

  return NextResponse.json({ available: count === 0 })
}

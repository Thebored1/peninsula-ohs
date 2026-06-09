import { type NextRequest, NextResponse } from 'next/server'
import { deleteSuperAdminSession } from '@/lib/super-admin/session'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('lumis_sa_token')?.value
  if (token) await deleteSuperAdminSession(token)

  const response = NextResponse.redirect(new URL('/admin/login', request.url))
  response.cookies.delete('lumis_sa_token')
  return response
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getStoragePath } from '@/lib/storage/paths'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
])

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(request: Request) {
  // 1. Verify auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // 2. Get org from user profile (RLS already scopes this)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  // 3. Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const module = (formData.get('module') as string | null) ?? 'documents'
  const recordId = (formData.get('record_id') as string | null) ?? user.id

  // 4. Validate file
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 400 })
  }

  // 5. Build org-scoped path and upload
  const storagePath = getStoragePath(profile.organisation_id, module, recordId, file.name)
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('org-documents')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  return NextResponse.json({
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  })
}

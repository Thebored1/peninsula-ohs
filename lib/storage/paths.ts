export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200)
}

export function getStoragePath(
  orgId: string,
  module: string,
  recordId: string,
  filename: string,
): string {
  const safe = sanitizeFilename(filename)
  return `${orgId}/${module}/${recordId}/${Date.now()}_${safe}`
}

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''

export function buildApiUrl(path: string) {
  let normalizedPath = path.startsWith('/') ? path : `/${path}`
  const normalizedBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')

  if (
    normalizedBaseUrl.toLowerCase().endsWith('/api') &&
    normalizedPath.toLowerCase().startsWith('/api/')
  ) {
    normalizedPath = normalizedPath.slice('/api'.length)
  }

  return `${normalizedBaseUrl}${normalizedPath}`
}

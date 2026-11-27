interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const overviewCache = new Map<string, CacheEntry<unknown>>()

export function getCachedOverview<T>(key: string): T | null {
  const entry = overviewCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    overviewCache.delete(key)
    return null
  }
  return entry.value as T
}

export function setCachedOverview<T>(key: string, value: T, ttlMs = 30_000): void {
  if (overviewCache.size > 500) {
    overviewCache.clear()
  }
  overviewCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateInstitutionOverviewCache(institutionId: string): void {
  const prefix = `${institutionId}::`
  for (const key of overviewCache.keys()) {
    if (key.startsWith(prefix)) overviewCache.delete(key)
  }
}

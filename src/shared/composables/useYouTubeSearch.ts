export type SearchResult = {
  id: string
  title: string
  channelTitle: string
  publishedAt: string
  views: number
  durationSec: number
  url: string
}

import type { FilterSettings } from '@shared/types/index'

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'

// --- Error handling helpers ---
export type YouTubeApiError = Error & { code?: number; reason?: string; retryAfterMs?: number }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
async function youtubeFetch(url: string): Promise<any> {
  // Adds timeout + robust network error mapping so that callers never see
  // an undefined Response: either a parsed JSON or a typed error is thrown.
  const timeoutMs = 15000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res: Response
  try {
    // If fetch is not available (e.g., Node < 18), this will throw immediately
    if (typeof fetch !== 'function') {
      const e = new Error('global fetch is unavailable. Use Node 18+ or add a fetch polyfill.') as YouTubeApiError
      e.reason = 'env'
      throw e
    }
    res = await fetch(url, { signal: ctrl.signal })
  } catch (err: any) {
    clearTimeout(timer)
    const e = new Error(err?.message || 'Network request failed') as YouTubeApiError
    // Map common low-level issues so UI can differentiate
    e.reason = err?.name === 'AbortError' ? 'timeout' : 'network'
    throw e
  }
  clearTimeout(timer)

  if (res.ok) {
    // Happy path
    return res.json()
  }

  // HTTP error path – parse YouTube error shape if present
  let reason: string | undefined
  let message = `HTTP ${res.status}`
  try {
    const j = await res.json()
    message = j?.error?.message ?? message
    reason  = j?.error?.errors?.[0]?.reason
  } catch {}
  const e = new Error(message) as YouTubeApiError
  e.code = res.status
  e.reason = reason
  throw e
}

export async function runYouTubeSearch(filters: FilterSettings): Promise<SearchResult[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - Math.max(1, filters.months))
  const publishedAfter = since.toISOString()

  // Resolve channelId if handle provided
  let channelId: string | undefined
  if (filters.mode === 'channel' && filters.channelHandle) {
    channelId = await resolveChannelId(filters.apiKey, filters.channelHandle)
  }

  const baseParams: Record<string, string> = {
    key: filters.apiKey,
    part: 'snippet',
    type: 'video',
    maxResults: '10',
    regionCode: filters.country || 'KR',
    relevanceLanguage: filters.language || 'ko',
    publishedAfter,
  }

  const collected: string[] = []
  let nextPageToken: string | undefined

  const targetLimit = filters.mode === 'keyword' ? filters.perQueryLimit : filters.perChannelLimit
  let safety = 10 // avoid infinite loops

  while (collected.length < targetLimit && safety-- > 0) {
    const params = new URLSearchParams(baseParams)
    if (nextPageToken) params.set('pageToken', nextPageToken)

    if (filters.mode === 'keyword' && filters.keyword) params.set('q', filters.keyword)
    if (filters.mode === 'channel' && channelId) params.set('channelId', channelId)

    let data: any
    {
      let attempts = 0
      const maxAttempts = 2
      while (true) {
        try {
          data = await youtubeFetch(`${SEARCH_URL}?${params.toString()}`)
          break
        } catch (e: any) {
          if (e?.reason === 'quotaExceeded' && attempts < maxAttempts && filters.waitMinutesOnQuota > 0) {
            attempts++
            await sleep(filters.waitMinutesOnQuota * 60_000)
            continue
          }
          throw e
        }
      }
    }

    const ids: string[] = (data.items ?? [])
      .map((it: any) => it?.id?.videoId)
      .filter(Boolean)

    collected.push(...ids)
    nextPageToken = data.nextPageToken
    if (!nextPageToken) break
  }

  const limitedIds = collected.slice(0, targetLimit)
  if (limitedIds.length === 0) return []

  // Fetch details (stats + duration) in chunks
  const chunks: string[][] = []
  for (let i = 0; i < limitedIds.length; i += 50) chunks.push(limitedIds.slice(i, i + 50))

  const now = Date.now()
  const results: SearchResult[] = []

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      key: filters.apiKey,
      part: 'snippet,contentDetails,statistics',
      id: chunk.join(','),
      maxResults: '50',
    })

    let data: any
    {
      let attempts = 0
      const maxAttempts = 1
      while (true) {
        try {
          data = await youtubeFetch(`${VIDEOS_URL}?${params.toString()}`)
          break
        } catch (e: any) {
          if (e?.reason === 'quotaExceeded' && attempts < maxAttempts && filters.waitMinutesOnQuota > 0) {
            attempts++
            await sleep(filters.waitMinutesOnQuota * 60_000)
            continue
          }
          throw e
        }
      }
    }

    for (const v of data.items ?? []) {
      const durationSec = parseISODurationToSeconds(v?.contentDetails?.duration)
      const views = Number(v?.statistics?.viewCount ?? 0)
      const publishedAt = v?.snippet?.publishedAt
      const ageHours = Math.max(1, (now - new Date(publishedAt).getTime()) / 36e5)
      const vph = views / ageHours

      // format filter
      const isShort = durationSec <= filters.shortsThresholdSec
      if (filters.format === 'shorts' && !isShort) continue
      if (filters.format === 'longform' && isShort) continue

      if (views < filters.minViews) continue
      if (vph < filters.minViewsPerHour) continue

      results.push({
        id: v.id,
        title: v?.snippet?.title,
        channelTitle: v?.snippet?.channelTitle,
        publishedAt,
        views,
        durationSec,
        url: `https://www.youtube.com/watch?v=${v.id}`,
      })
    }
  }

  return results
}

export function parseISODurationToSeconds(iso?: string): number {
  if (!iso || !iso.startsWith('PT')) return 0
  const h = /([0-9]+)H/.exec(iso)?.[1]
  const m = /([0-9]+)M/.exec(iso)?.[1]
  const s = /([0-9]+)S/.exec(iso)?.[1]
  return (h ? +h * 3600 : 0) + (m ? +m * 60 : 0) + (s ? +s : 0)
}

async function resolveChannelId(key: string, handleOrId: string): Promise<string | undefined> {
  if (/^UC[\w-]{22}$/.test(handleOrId)) return handleOrId
  const handle = handleOrId.startsWith('@') ? handleOrId : `@${handleOrId}`
  const params = new URLSearchParams({ key, part: 'id', forHandle: handle }) as any
  try {
    const data = await youtubeFetch(`${CHANNELS_URL}?${params.toString()}`)
    const id = data?.items?.[0]?.id
    if (id) return id
  } catch (e: any) {
    if (e?.reason !== 'quotaExceeded') throw e
    // quotaExceeded면 아래 검색 폴백으로 진행
  }
  const data = await youtubeFetch(`${SEARCH_URL}?key=${key}&part=snippet&type=channel&q=${encodeURIComponent(handle)}`)
  return data?.items?.[0]?.id?.channelId
}

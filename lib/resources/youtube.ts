import type { Json } from "@/lib/database.types"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { parseIsoDuration, type YoutubeChannelRef } from "@/lib/resources/video-match"

// YouTube erişimi — YALNIZ SUNUCU (server action'lardan çağrılır).
// YOUTUBE_API_KEY (Data API v3) yalnız burada okunur, istemciye gitmez.
// Anahtar yoksa: tekli videoda oEmbed (başlık + küçük resim, süre yok),
// playlist'te elle liste.

const YT = "https://www.googleapis.com/youtube/v3"
const MAX_PLAYLIST_VIDEOS = 500

export type YoutubeVideoMeta = {
  videoId: string
  title: string
  position: number
  durationSeconds: number | null
  thumbnailUrl: string
}

export type YoutubePlaylistMeta = {
  title: string | null
  channelTitle: string | null
  thumbnailUrl: string | null
  videos: YoutubeVideoMeta[]
}

type Thumbs = Partial<Record<"default" | "medium" | "high", { url?: string }>>

function apiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null
}

export function youtubeApiEnabled(): boolean {
  return apiKey() !== null
}

/** Anahtarsız da çalışan sabit küçük resim. */
export function defaultThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
}

function pickThumb(t: Thumbs | undefined, videoId: string | null): string | null {
  const url = t?.medium?.url ?? t?.high?.url ?? t?.default?.url
  if (url && url.length <= 500) return url
  return videoId ? defaultThumbnail(videoId) : null
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return null
  return (await res.json()) as T
}

/** Video kimlikleri → süre (saniye), 50'lik gruplar. Anahtar yoksa boş harita. */
export async function fetchDurations(videoIds: string[]): Promise<Map<string, number>> {
  const key = apiKey()
  const out = new Map<string, number>()
  if (!key || videoIds.length === 0) return out
  for (let i = 0; i < videoIds.length; i += 50) {
    const ids = videoIds.slice(i, i + 50).join(",")
    const json = await getJson<{ items?: { id?: string; contentDetails?: { duration?: string } }[] }>(
      `${YT}/videos?part=contentDetails&id=${encodeURIComponent(ids)}&key=${key}`,
    )
    for (const it of json?.items ?? []) {
      const sec = parseIsoDuration(it.contentDetails?.duration)
      if (it.id && sec !== null) out.set(it.id, sec)
    }
  }
  return out
}

export async function fetchYoutubePlaylist(playlistId: string): Promise<YoutubePlaylistMeta | { error: string }> {
  const key = apiKey()
  if (!key) return { error: "YouTube API anahtarı tanımlı değil; playlist videolarını linkleriyle elle ekleyebilirsin." }
  try {
    const meta = await getJson<{ items?: { snippet?: { title?: string; channelTitle?: string; thumbnails?: Thumbs } }[] }>(
      `${YT}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${key}`,
    )
    if (!meta) return { error: "Playlist okunamadı; linki kontrol et." }
    const snip = meta.items?.[0]?.snippet
    if (!snip) return { error: "Playlist bulunamadı ya da gizli." }

    const videos: YoutubeVideoMeta[] = []
    const seen = new Set<string>()
    let page: string | undefined
    do {
      const json = await getJson<{
        nextPageToken?: string
        items?: { snippet?: { title?: string; position?: number; thumbnails?: Thumbs; resourceId?: { videoId?: string } } }[]
      }>(
        `${YT}/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${key}${page ? `&pageToken=${page}` : ""}`,
      )
      if (!json) return { error: "Playlist videoları okunamadı." }
      for (const it of json.items ?? []) {
        const id = it.snippet?.resourceId?.videoId
        const title = it.snippet?.title
        // Silinmiş/gizli videolar ve tekrarlar atlanır.
        if (!id || !title || title === "Deleted video" || title === "Private video" || seen.has(id)) continue
        seen.add(id)
        videos.push({
          videoId: id,
          title: title.slice(0, 200),
          position: videos.length,
          durationSeconds: null,
          thumbnailUrl: pickThumb(it.snippet?.thumbnails, id) ?? defaultThumbnail(id),
        })
      }
      page = json.nextPageToken
    } while (page && videos.length < MAX_PLAYLIST_VIDEOS)

    const durations = await fetchDurations(videos.map((v) => v.videoId))
    for (const v of videos) v.durationSeconds = durations.get(v.videoId) ?? null

    return {
      title: snip.title?.slice(0, 200) ?? null,
      channelTitle: snip.channelTitle?.slice(0, 120) ?? null,
      thumbnailUrl: pickThumb(snip.thumbnails, videos[0]?.videoId ?? null),
      videos,
    }
  } catch (e) {
    console.error("fetchYoutubePlaylist", e)
    return { error: "YouTube'a bağlanılamadı, tekrar dene." }
  }
}

export type SingleVideoMeta = { title: string; channelTitle: string | null; thumbnailUrl: string; durationSeconds: number | null }

/** Tekli video: oEmbed (anahtarsız) + varsa API'den süre. */
export async function fetchVideoMeta(videoId: string): Promise<SingleVideoMeta | { error: string }> {
  try {
    const watch = `https://www.youtube.com/watch?v=${videoId}`
    const [oembed, durations] = await Promise.all([
      getJson<{ title?: string; author_name?: string; thumbnail_url?: string }>(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
      ),
      fetchDurations([videoId]),
    ])
    if (!oembed?.title) return { error: "Video bulunamadı ya da gizli." }
    return {
      title: oembed.title.slice(0, 200),
      channelTitle: oembed.author_name?.slice(0, 80) ?? null,
      // oEmbed hqdefault verir; listede daha hafif mqdefault yeterli.
      thumbnailUrl: defaultThumbnail(videoId),
      durationSeconds: durations.get(videoId) ?? null,
    }
  } catch (e) {
    console.error("fetchVideoMeta", e)
    return { error: "YouTube'a bağlanılamadı, tekrar dene." }
  }
}

/** Birden çok video için oEmbed başlığı (elle liste / "Video N" onarımı); 8'li paralel. */
export async function fetchOembedTitles(videoIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (let i = 0; i < videoIds.length; i += 8) {
    const chunk = videoIds.slice(i, i + 8)
    const results = await Promise.allSettled(
      chunk.map((id) =>
        getJson<{ title?: string }>(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
        ),
      ),
    )
    results.forEach((r, j) => {
      const title = r.status === "fulfilled" ? r.value?.title : undefined
      if (title) out.set(chunk[j], title.slice(0, 200))
    })
  }
  return out
}

// ── Önbellek (youtube_playlist_cache) ────────────────────────────────────
// Önizleme + ekleme aynı listeyi iki kez çekmesin, aynı playlist'i ekleyen
// başka öğrenciler kota harcamasın. "Yenile" force ile taze çeker.
export const PLAYLIST_CACHE_HOURS = 24

function isVideoMeta(v: unknown): v is YoutubeVideoMeta {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.videoId === "string" && typeof o.title === "string" && typeof o.position === "number"
}

async function readCache(playlistId: string): Promise<(YoutubePlaylistMeta & { fetchedAt: string }) | null> {
  const { data } = await supabaseAdmin()
    .from("youtube_playlist_cache")
    .select("title, channel_title, thumbnail_url, videos, fetched_at")
    .eq("youtube_playlist_id", playlistId)
    .maybeSingle()
  if (!data || !Array.isArray(data.videos)) return null
  const videos = data.videos.filter(isVideoMeta).map((v) => ({
    videoId: v.videoId,
    title: v.title,
    position: v.position,
    durationSeconds: typeof v.durationSeconds === "number" ? v.durationSeconds : null,
    thumbnailUrl: typeof v.thumbnailUrl === "string" ? v.thumbnailUrl : defaultThumbnail(v.videoId),
  }))
  return { title: data.title, channelTitle: data.channel_title, thumbnailUrl: data.thumbnail_url, videos, fetchedAt: data.fetched_at }
}

async function writeCache(playlistId: string, meta: YoutubePlaylistMeta): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("youtube_playlist_cache")
    .upsert({
      youtube_playlist_id: playlistId,
      title: meta.title,
      channel_title: meta.channelTitle,
      thumbnail_url: meta.thumbnailUrl,
      videos: meta.videos as unknown as Json,
      fetched_at: new Date().toISOString(),
    })
  if (error) console.error("youtube_playlist_cache", error)
}

/**
 * Playlist (önbellekli). `force` → YouTube'dan taze çek. Önbellek ≤ 24 saat
 * ise API çağrılmaz. API hatasında eski önbellek varsa o döner.
 */
export async function getPlaylist(
  playlistId: string,
  opts: { force?: boolean } = {},
): Promise<(YoutubePlaylistMeta & { cached: boolean }) | { error: string }> {
  const cached = await readCache(playlistId)
  const fresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < PLAYLIST_CACHE_HOURS * 3600_000
  if (cached && fresh && !opts.force && cached.videos.length > 0) return { ...cached, cached: true }
  const res = await fetchYoutubePlaylist(playlistId)
  if ("error" in res) return cached && cached.videos.length > 0 ? { ...cached, cached: true } : res
  if (res.videos.length > 0) await writeCache(playlistId, res)
  return { ...res, cached: false }
}

// ── Kanal → playlist listesi ─────────────────────────────────────────────
export type ChannelPlaylist = { id: string; title: string; itemCount: number; thumbnailUrl: string | null }
export type ChannelPlaylists = { channelTitle: string; playlists: ChannelPlaylist[] }

const MAX_CHANNEL_PLAYLISTS = 200

/** Kanal referansı → kanal kimliği. /c/ linkleri arama ister (100 birim). */
async function resolveChannelId(ref: YoutubeChannelRef, key: string): Promise<{ id: string; title: string } | null> {
  type ChannelList = { items?: { id?: string; snippet?: { title?: string } }[] }
  const one = (j: ChannelList | null) => {
    const it = j?.items?.[0]
    return it?.id ? { id: it.id, title: it.snippet?.title ?? "" } : null
  }
  if (ref.by === "id") return one(await getJson<ChannelList>(`${YT}/channels?part=snippet&id=${encodeURIComponent(ref.value)}&key=${key}`))
  if (ref.by === "handle") return one(await getJson<ChannelList>(`${YT}/channels?part=snippet&forHandle=${encodeURIComponent(ref.value)}&key=${key}`))
  if (ref.by === "user") {
    const byUser = one(await getJson<ChannelList>(`${YT}/channels?part=snippet&forUsername=${encodeURIComponent(ref.value)}&key=${key}`))
    if (byUser) return byUser
  }
  // /c/ özel adlar API'de doğrudan çözülmez: önce @ad olarak dene, olmazsa arama.
  const asHandle = one(await getJson<ChannelList>(`${YT}/channels?part=snippet&forHandle=${encodeURIComponent(`@${ref.value}`)}&key=${key}`))
  if (asHandle) return asHandle
  const search = await getJson<{ items?: { snippet?: { channelId?: string; channelTitle?: string } }[] }>(
    `${YT}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(ref.value)}&key=${key}`,
  )
  const s = search?.items?.[0]?.snippet
  return s?.channelId ? { id: s.channelId, title: s.channelTitle ?? "" } : null
}

/** Kanalın herkese açık playlist'leri (başlık, video sayısı, kapak), boşlar hariç. */
export async function fetchChannelPlaylists(ref: YoutubeChannelRef): Promise<ChannelPlaylists | { error: string }> {
  const key = apiKey()
  if (!key) return { error: "YouTube API anahtarı tanımlı değil; kanal yerine playlist linkini yapıştır." }
  try {
    const ch = await resolveChannelId(ref, key)
    if (!ch) return { error: "Kanal bulunamadı." }
    const playlists: ChannelPlaylist[] = []
    let page: string | undefined
    do {
      const json = await getJson<{
        nextPageToken?: string
        items?: { id?: string; snippet?: { title?: string; thumbnails?: Thumbs }; contentDetails?: { itemCount?: number } }[]
      }>(
        `${YT}/playlists?part=snippet,contentDetails&maxResults=50&channelId=${encodeURIComponent(ch.id)}&key=${key}${page ? `&pageToken=${page}` : ""}`,
      )
      if (!json) return { error: "Kanalın playlist'leri okunamadı." }
      for (const it of json.items ?? []) {
        const count = it.contentDetails?.itemCount ?? 0
        if (!it.id || !it.snippet?.title || count === 0) continue
        playlists.push({ id: it.id, title: it.snippet.title.slice(0, 200), itemCount: count, thumbnailUrl: pickThumb(it.snippet.thumbnails, null) })
      }
      page = json.nextPageToken
    } while (page && playlists.length < MAX_CHANNEL_PLAYLISTS)
    return { channelTitle: ch.title.slice(0, 120), playlists }
  } catch (e) {
    console.error("fetchChannelPlaylists", e)
    return { error: "YouTube'a bağlanılamadı, tekrar dene." }
  }
}

/**
 * Utilities for YouTube Shorts and video handling
 */

export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const str = url.trim();
  const m1 = str.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (m1) return m1[1];
  const m2 = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m2) return m2[1];
  const m3 = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m3) return m3[1];
  const m4 = str.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (m4) return m4[1];
  const m5 = str.match(/\/live\/([a-zA-Z0-9_-]{11})/);
  if (m5) return m5[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  return null;
}

export function getYouTubeThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(youtubeId: string, autoplay = true, muted = true): string {
  return `https://www.youtube.com/embed/${youtubeId}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&loop=1&playlist=${youtubeId}`;
}
